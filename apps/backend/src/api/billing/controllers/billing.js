'use strict';

/**
 * Per-app billing through Razorpay Checkout (orders). Payments are made in advance for a month or
 * a year; a paid period then runs until currentPeriodEnd. Only organization admins can pay or change plans.
 *
 * Flow: POST /billing/checkout → Razorpay order → browser Checkout → POST /billing/verify (signature)
 *       and/or the Razorpay webhook (order.paid / payment.captured) → subscription activated.
 */

const { isSaas } = require('../../../utils/platform');
const razorpay = require('../../../utils/razorpay');
const { quote, QuoteError, invoiceNumber, GST_RATE } = require('../../../utils/billing');
const { computeAccess, invalidateOrgAccess } = require('../../../utils/saas-access');
const { requireMember, memberCount, relationId } = require('../../../utils/saas-org');
const { sendMail, layout, escapeHtml } = require('../../../utils/mailer');

const SUB_UID = 'api::subscription.subscription';
const PLAN_UID = 'api::plan.plan';
const APP_UID = 'api::app.app';
const PAY_UID = 'api::billing-payment.billing-payment';
const ORG_UID = 'api::organization.organization';

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function ensureSaas(ctx) {
  if (isSaas()) return true;
  ctx.notFound('Not available on this platform');
  return false;
}

function seller() {
  return {
    name: process.env.BILLING_SELLER_NAME || 'Webfudge Systems',
    gstin: process.env.BILLING_SELLER_GSTIN || '',
    address: process.env.BILLING_SELLER_ADDRESS || 'Pune, Maharashtra, India',
    email: process.env.BILLING_SELLER_EMAIL || 'billing@webfudgesystems.in',
    // Decides CGST+SGST (buyer in the same state) or IGST on invoices.
    state: process.env.BILLING_SELLER_STATE || 'Maharashtra',
    // Service accounting code printed on invoices; confirm it with your CA.
    sac: process.env.BILLING_SAC_CODE || '',
  };
}

async function loadAppAndPlan(appSlug, planCode) {
  const [app] = await strapi.entityService.findMany(APP_UID, { filters: { slug: String(appSlug || '') }, limit: 1 });
  if (!app) return {};
  const [plan] = await strapi.entityService.findMany(PLAN_UID, {
    filters: { app: app.id, code: String(planCode || ''), isActive: true },
    limit: 1,
  });
  return { app, plan };
}

async function loadSubscription(orgId, appId) {
  const [sub] = await strapi.entityService.findMany(SUB_UID, {
    filters: { organization: orgId, app: appId },
    populate: { app: true, plan: true },
    limit: 1,
  });
  return sub || null;
}

async function lastPaidPayment(subId) {
  const [payment] = await strapi.entityService.findMany(PAY_UID, {
    filters: { subscription: subId, status: 'paid' },
    sort: { paidAt: 'desc' },
    limit: 1,
  });
  return payment || null;
}

/** Shared by quote and checkout: validates the request and prices it. */
async function priceRequest(ctx) {
  const { organizationId, app: appSlug, plan: planCode, cycle, users } = ctx.request.body || {};
  const orgId = Number(organizationId);
  const guard = await requireMember(ctx, strapi, orgId, { admin: true });
  if (!guard) return null;
  const { app, plan } = await loadAppAndPlan(appSlug, planCode);
  if (!app || !plan) {
    ctx.badRequest('That plan is not available.');
    return null;
  }
  const subscription = await loadSubscription(orgId, app.id);
  if (!subscription) {
    ctx.badRequest('Add this app to your organization first.');
    return null;
  }
  const members = await memberCount(strapi, orgId);
  try {
    const priced = quote({
      plan,
      cycle,
      users,
      memberCount: members,
      subscription,
      lastPaid: await lastPaidPayment(subscription.id),
    });
    return { guard, orgId, app, plan, subscription, priced };
  } catch (error) {
    if (error instanceof QuoteError) {
      ctx.badRequest(error.message, error.details);
      return null;
    }
    throw error;
  }
}

function serializePayment(p) {
  return {
    id: p.id,
    status: p.status,
    kind: p.kind,
    app: p.app?.slug || null,
    appName: p.app?.name || null,
    planCode: p.planCode,
    billingCycle: p.billingCycle,
    users: p.users,
    amountSubtotal: Number(p.amountSubtotal),
    taxAmount: Number(p.taxAmount),
    amountTotal: Number(p.amountTotal),
    currency: p.currency,
    invoiceNumber: p.invoiceNumber || null,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    paidAt: p.paidAt,
    createdAt: p.createdAt,
  };
}

/** Marks a payment paid and moves the subscription onto the paid period. Safe to call twice. */
async function applyPaidPayment(paymentId, razorpayPaymentId) {
  const payment = await strapi.entityService.findOne(PAY_UID, paymentId, {
    populate: { subscription: true, plan: true, app: true, organization: true, createdByUser: true },
  });
  if (!payment) return null;
  if (payment.status === 'paid') return payment;

  const paidAt = new Date();
  const updated = await strapi.entityService.update(PAY_UID, payment.id, {
    data: {
      status: 'paid',
      paidAt,
      razorpayPaymentId: razorpayPaymentId || payment.razorpayPaymentId,
      invoiceNumber: invoiceNumber({ id: payment.id, paidAt }),
    },
  });

  const sub = payment.subscription;
  const data = {
    status: 'active',
    plan: relationId(payment.plan),
    planCode: payment.planCode,
    billingCycle: payment.billingCycle,
    totalUsers: payment.users,
    pricePerUser: payment.meta?.unitPrice ?? 0,
    lastPaymentDate: paidAt,
    cancelAtPeriodEnd: false,
  };
  if (payment.kind === 'renewal') {
    data.currentPeriodEnd = payment.periodEnd;
  } else {
    data.currentPeriodStart = payment.periodStart;
    data.currentPeriodEnd = payment.periodEnd;
  }
  data.nextBillingDate = data.currentPeriodEnd || sub.currentPeriodEnd;
  await strapi.entityService.update(SUB_UID, sub.id, { data });
  invalidateOrgAccess(relationId(payment.organization));

  const to = payment.createdByUser?.email;
  if (to) {
    await sendMail({
      to,
      subject: `Payment received — ${updated.invoiceNumber}`,
      text: `Thanks! We received ${inr(payment.amountTotal)} for ${payment.app?.name} (${payment.meta?.description || payment.planCode}). Invoice ${updated.invoiceNumber}.`,
      html: layout({
        heading: 'Payment received',
        bodyHtml: `<p>Thanks! We received <strong>${inr(payment.amountTotal)}</strong> for ${escapeHtml(payment.app?.name)} at ${escapeHtml(payment.organization?.name)}.</p><p>${escapeHtml(payment.meta?.description || '')}</p><p>Invoice number: <strong>${escapeHtml(updated.invoiceNumber)}</strong></p>`,
        cta: process.env.ACCOUNTS_URL ? { href: `${process.env.ACCOUNTS_URL.replace(/\/+$/, '')}/billing/invoices/${payment.id}`, label: 'View invoice' } : null,
      }),
    });
  }
  return updated;
}

async function findPaymentByOrder(orderId) {
  if (!orderId) return null;
  const [payment] = await strapi.entityService.findMany(PAY_UID, { filters: { razorpayOrderId: String(orderId) }, limit: 1 });
  return payment || null;
}

module.exports = {
  async summary(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId);
    if (!guard) return;

    const subs = await strapi.entityService.findMany(SUB_UID, {
      filters: { organization: orgId },
      populate: { app: true },
      limit: 50,
    });
    const payments = guard.isAdmin
      ? await strapi.entityService.findMany(PAY_UID, {
          filters: { organization: orgId, status: { $in: ['paid', 'failed'] } },
          populate: { app: { fields: ['slug', 'name'] } },
          sort: { createdAt: 'desc' },
          limit: 100,
        })
      : [];
    const org = await strapi.entityService.findOne(ORG_UID, orgId, { fields: ['name', 'billingDetails', 'companyEmail'] });

    ctx.send({
      organization: { id: orgId, name: org?.name, billingDetails: guard.isAdmin ? org?.billingDetails || null : null },
      isAdmin: guard.isAdmin,
      memberCount: await memberCount(strapi, orgId),
      payments: {
        enabled: razorpay.isConfigured(),
        testMode: razorpay.isTestMode(),
        gstRate: GST_RATE,
      },
      subscriptions: subs
        .filter((s) => s.app?.slug)
        .map((s) => ({ ...computeAccess(s), app: { slug: s.app.slug, name: s.app.name, color: s.app.color } })),
      history: payments.map(serializePayment),
    });
  },

  async quote(ctx) {
    if (!ensureSaas(ctx)) return;
    const priced = await priceRequest(ctx);
    if (!priced) return;
    ctx.send({ quote: priced.priced });
  },

  async checkout(ctx) {
    if (!ensureSaas(ctx)) return;
    if (!razorpay.isConfigured()) {
      return ctx.badRequest('Online payments are not switched on yet. Contact us and we will activate your plan.', { code: 'PAYMENTS_DISABLED' });
    }
    const req = await priceRequest(ctx);
    if (!req) return;
    const { orgId, app, plan, subscription, priced } = req;
    if (priced.amountPaise < 100) return ctx.badRequest('Nothing to pay for this change.', { code: 'NOTHING_TO_PAY' });

    const org = await strapi.entityService.findOne(ORG_UID, orgId, { fields: ['name', 'billingDetails'] });
    const payment = await strapi.entityService.create(PAY_UID, {
      data: {
        organization: orgId,
        subscription: subscription.id,
        app: app.id,
        plan: plan.id,
        planCode: plan.code,
        billingCycle: priced.cycle,
        users: priced.users,
        kind: priced.kind,
        amountSubtotal: priced.subtotal - priced.credit,
        taxAmount: priced.tax,
        amountTotal: priced.total,
        currency: 'INR',
        status: 'created',
        periodStart: priced.periodStart,
        periodEnd: priced.periodEnd,
        createdByUser: ctx.state.user.id,
        billingDetails: org?.billingDetails || null,
        meta: { description: priced.description, unitPrice: priced.unitPrice, credit: priced.credit, subtotalBeforeCredit: priced.subtotal },
      },
    });

    let order;
    try {
      order = await razorpay.createOrder({
        amount: priced.amountPaise,
        receipt: `wf_${payment.id}`,
        notes: { paymentId: String(payment.id), organizationId: String(orgId), app: app.slug, plan: plan.code },
      });
    } catch (error) {
      await strapi.entityService.update(PAY_UID, payment.id, { data: { status: 'failed', meta: { ...payment.meta, error: error.message } } });
      console.error('Razorpay order failed:', error.message);
      return ctx.badRequest('We could not start the payment. Please try again in a minute.');
    }
    await strapi.entityService.update(PAY_UID, payment.id, { data: { razorpayOrderId: order.id } });

    const user = ctx.state.user;
    ctx.send({
      keyId: razorpay.keyId(),
      orderId: order.id,
      amount: priced.amountPaise,
      currency: 'INR',
      name: 'Webfudge Systems',
      description: `${app.name} · ${priced.description}`,
      prefill: { name: [user.firstName, user.lastName].filter(Boolean).join(' '), email: user.email, contact: user.phone || '' },
      notes: { organization: org?.name || '' },
      paymentId: payment.id,
      quote: priced,
    });
  },

  async verify(ctx) {
    if (!ensureSaas(ctx)) return;
    if (!ctx.state.user) return ctx.unauthorized('Sign in to continue.');
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = ctx.request.body || {};
    const payment = await findPaymentByOrder(orderId);
    if (!payment) return ctx.notFound('Payment not found.');
    if (!razorpay.verifyPaymentSignature({ orderId, paymentId, signature })) {
      return ctx.badRequest('We could not confirm this payment. If money was taken, it will be confirmed automatically within a few minutes.', { code: 'SIGNATURE_MISMATCH' });
    }
    const updated = await applyPaidPayment(payment.id, paymentId);
    ctx.send({ ok: true, payment: { id: updated.id, invoiceNumber: updated.invoiceNumber } });
  },

  /** Razorpay webhook. Configure in the dashboard: URL /api/billing/webhook, events order.paid, payment.captured, payment.failed. */
  async webhook(ctx) {
    const raw = ctx.request.body?.[Symbol.for('unparsedBody')];
    const signature = ctx.request.headers['x-razorpay-signature'];
    if (!razorpay.verifyWebhookSignature(raw, signature)) {
      ctx.status = 400;
      ctx.body = { ok: false };
      return;
    }
    const event = ctx.request.body || {};
    const paymentEntity = event.payload?.payment?.entity;
    const orderId = event.payload?.order?.entity?.id || paymentEntity?.order_id;
    const payment = await findPaymentByOrder(orderId);
    if (payment) {
      if (event.event === 'order.paid' || event.event === 'payment.captured') {
        await applyPaidPayment(payment.id, paymentEntity?.id);
      } else if (event.event === 'payment.failed' && payment.status === 'created') {
        await strapi.entityService.update(PAY_UID, payment.id, {
          data: { status: 'failed', razorpayPaymentId: paymentEntity?.id, meta: { ...payment.meta, error: paymentEntity?.error_description || 'Payment failed' } },
        });
      }
    }
    ctx.body = { ok: true };
  },

  /** Moves an app onto the Free plan (no payment), when the team fits within its user limit. */
  async chooseFree(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId, { admin: true });
    if (!guard) return;
    const { app, plan } = await loadAppAndPlan(ctx.request.body?.app, 'free');
    if (!app || !plan) return ctx.badRequest('The Free plan is not available for this app.');
    const sub = await loadSubscription(orgId, app.id);
    if (!sub) return ctx.badRequest('Add this app to your organization first.');
    const access = computeAccess(sub);
    if (sub.status === 'active' && sub.planCode !== 'free' && access.access === 'full' && !sub.cancelAtPeriodEnd) {
      return ctx.badRequest('Cancel your paid plan first. You can switch to Free when the paid period ends.');
    }
    const members = await memberCount(strapi, orgId);
    if (plan.maxUsers && members > plan.maxUsers) {
      return ctx.badRequest(`The Free plan allows up to ${plan.maxUsers} users and your organization has ${members}.`, { code: 'TOO_MANY_USERS' });
    }
    await strapi.entityService.update(SUB_UID, sub.id, {
      data: { status: 'active', plan: plan.id, planCode: 'free', totalUsers: members, currentPeriodStart: new Date(), currentPeriodEnd: null, cancelAtPeriodEnd: false },
    });
    invalidateOrgAccess(orgId);
    ctx.send({ ok: true });
  },

  /** Stops renewal; the paid period still runs to its end. Pass { resume: true } to undo. */
  async cancel(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId, { admin: true });
    if (!guard) return;
    const [app] = await strapi.entityService.findMany(APP_UID, { filters: { slug: String(ctx.request.body?.app || '') }, limit: 1 });
    const sub = app && (await loadSubscription(orgId, app.id));
    if (!sub || sub.status !== 'active' || sub.planCode === 'free') return ctx.badRequest('There is no paid plan to cancel for this app.');
    const resume = Boolean(ctx.request.body?.resume);
    await strapi.entityService.update(SUB_UID, sub.id, { data: { cancelAtPeriodEnd: !resume, autoRenew: resume } });
    invalidateOrgAccess(orgId);
    ctx.send({ ok: true, cancelAtPeriodEnd: !resume });
  },

  async updateDetails(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId, { admin: true });
    if (!guard) return;
    const body = ctx.request.body || {};
    const clean = (v, max = 120) => String(v || '').trim().slice(0, max);
    const gstin = clean(body.gstin, 15).toUpperCase();
    if (gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(gstin)) {
      return ctx.badRequest('That GSTIN does not look right. It has 15 characters, like 27ABCDE1234F1Z5.', { field: 'gstin' });
    }
    const details = {
      legalName: clean(body.legalName),
      gstin,
      email: clean(body.email),
      addressLine1: clean(body.addressLine1, 200),
      addressLine2: clean(body.addressLine2, 200),
      city: clean(body.city, 80),
      state: clean(body.state, 80),
      pincode: clean(body.pincode, 10),
      country: 'India',
    };
    await strapi.entityService.update(ORG_UID, orgId, { data: { billingDetails: details } });
    ctx.send({ billingDetails: details });
  },

  async invoice(ctx) {
    if (!ensureSaas(ctx)) return;
    const payment = await strapi.entityService.findOne(PAY_UID, Number(ctx.params.paymentId), {
      populate: { organization: true, app: true },
    });
    if (!payment || payment.status !== 'paid') return ctx.notFound('Invoice not found.');
    const guard = await requireMember(ctx, strapi, payment.organization.id, { admin: true });
    if (!guard) return;
    ctx.send({
      invoice: {
        ...serializePayment(payment),
        description: payment.meta?.description || '',
        unitPrice: payment.meta?.unitPrice ?? null,
        credit: payment.meta?.credit ?? 0,
        organization: { name: payment.organization.name },
        billTo: payment.billingDetails || payment.organization.billingDetails || null,
        seller: seller(),
        razorpayPaymentId: payment.razorpayPaymentId,
      },
    });
  },
};
