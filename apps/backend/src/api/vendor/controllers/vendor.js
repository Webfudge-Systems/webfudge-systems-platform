'use strict';

/**
 * Vendor portal: Webfudge staff view of every organization, subscription, payment and user on
 * this deployment. Only emails listed in PLATFORM_ADMIN_EMAILS may call these routes.
 */

const { buildDataset, overview, report, RANGES } = require('../../../utils/vendor-metrics');
const { invalidateOrgAccess, DAY } = require('../../../utils/saas-access');
const { platformMode } = require('../../../utils/platform');

const ORG_UID = 'api::organization.organization';
const SUB_UID = 'api::subscription.subscription';
const PAY_UID = 'api::billing-payment.billing-payment';
const MEMBER_UID = 'api::organization-user.organization-user';
const INVITE_UID = 'api::invitation.invitation';
const APP_UID = 'api::app.app';
const PLAN_UID = 'api::plan.plan';
const USER_UID = 'plugin::users-permissions.user';

const MAX_ROWS = 20000;
const CACHE_MS = 30 * 1000;
const USER_FIELDS = ['id', 'username', 'email', 'firstName', 'lastName', 'confirmed', 'blocked', 'provider', 'createdAt'];

function staffEmails() {
  return (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

function requireStaff(ctx) {
  const user = ctx.state.user;
  if (!user) {
    ctx.unauthorized('Sign in to continue.');
    return null;
  }
  if (!staffEmails().includes(String(user.email || '').toLowerCase())) {
    ctx.forbidden('This account is not a Webfudge staff account.');
    return null;
  }
  return user;
}

let cached = null;

async function loadRaw() {
  const [orgs, subs, payments, memberships, users, invitations] = await Promise.all([
    strapi.entityService.findMany(ORG_UID, {
      populate: { owner: { fields: ['id', 'email', 'username', 'firstName', 'lastName'] } },
      sort: { createdAt: 'desc' },
      limit: MAX_ROWS,
    }),
    strapi.entityService.findMany(SUB_UID, {
      populate: {
        organization: { fields: ['id'] },
        app: { fields: ['slug', 'name', 'color'] },
        plan: { fields: ['code', 'name', 'pricePerUserMonthly', 'yearlyDiscountPercent'] },
      },
      limit: MAX_ROWS,
    }),
    strapi.entityService.findMany(PAY_UID, {
      populate: {
        organization: { fields: ['id'] },
        subscription: { fields: ['id'] },
        app: { fields: ['slug', 'name', 'color'] },
      },
      sort: { createdAt: 'desc' },
      limit: MAX_ROWS,
    }),
    strapi.entityService.findMany(MEMBER_UID, {
      populate: { user: { fields: ['id'] }, organization: { fields: ['id'] }, role: { fields: ['name', 'code'] } },
      limit: MAX_ROWS,
    }),
    strapi.entityService.findMany(USER_UID, { fields: USER_FIELDS, sort: { createdAt: 'desc' }, limit: MAX_ROWS }),
    strapi.entityService.findMany(INVITE_UID, {
      fields: ['id', 'email', 'status', 'role', 'expiresAt', 'createdAt'],
      populate: { organization: { fields: ['id'] } },
      limit: MAX_ROWS,
    }),
  ]);
  return { orgs, subs, payments, memberships, users, invitations };
}

async function loadApps() {
  const [apps, plans] = await Promise.all([
    strapi.entityService.findMany(APP_UID, { filters: { slug: { $ne: 'accounts' } }, sort: { order: 'asc' }, limit: 100 }),
    strapi.entityService.findMany(PLAN_UID, { populate: { app: { fields: ['slug'] } }, sort: { order: 'asc' }, limit: 500 }),
  ]);
  return apps.map((app) => ({
    id: app.id,
    slug: app.slug,
    name: app.name,
    tagline: app.tagline || app.description || '',
    color: app.color || null,
    availability: app.availability || 'available',
    isActive: app.isActive !== false,
    plans: plans
      .filter((p) => p.app?.slug === app.slug)
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description || '',
        pricePerUserMonthly: Number(p.pricePerUserMonthly) || 0,
        yearlyDiscountPercent: p.yearlyDiscountPercent ?? 15,
        maxUsers: p.maxUsers || null,
        isPopular: Boolean(p.isPopular),
        isActive: p.isActive !== false,
        features: Array.isArray(p.features) ? p.features : [],
      })),
  }));
}

async function dataset({ fresh = false } = {}) {
  if (!fresh && cached && cached.expires > Date.now()) return cached.value;
  const [raw, apps] = await Promise.all([loadRaw(), loadApps()]);
  const value = { ...buildDataset(raw), apps, invitations: raw.invitations };
  cached = { value, expires: Date.now() + CACHE_MS };
  return value;
}

const invalidate = () => {
  cached = null;
};

const wantsFresh = (ctx) => ctx.query.fresh === '1' || ctx.query.fresh === 'true';

function audit(user, action, details) {
  strapi.log.info(`[vendor] ${user.email} ${action} ${JSON.stringify(details)}`);
}

/** Subscription status to restore when staff lift a suspension. */
function reactivatedStatus(sub) {
  if (sub.planCode === 'free') return 'active';
  if (sub.currentPeriodEnd) return 'active';
  return 'trial';
}

module.exports = {
  async me(ctx) {
    const user = requireStaff(ctx);
    if (!user) return;
    ctx.send({
      staff: true,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || user.email,
      platformMode: platformMode(),
    });
  },

  async overview(ctx) {
    if (!requireStaff(ctx)) return;
    const ds = await dataset({ fresh: wantsFresh(ctx) });
    ctx.send(overview(ds, ds.apps));
  },

  async reports(ctx) {
    if (!requireStaff(ctx)) return;
    const range = RANGES[ctx.query.range] ? ctx.query.range : '12m';
    const ds = await dataset({ fresh: wantsFresh(ctx) });
    ctx.send(report(ds, ds.apps, range));
  },

  async organizations(ctx) {
    if (!requireStaff(ctx)) return;
    const ds = await dataset({ fresh: wantsFresh(ctx) });
    ctx.send({ data: ds.organizations, apps: ds.apps.map(({ plans, ...a }) => a) });
  },

  async organization(ctx) {
    if (!requireStaff(ctx)) return;
    const id = String(ctx.params.id);
    const ds = await dataset({ fresh: wantsFresh(ctx) });
    const org = ds.organizations.find((o) => String(o.id) === id);
    if (!org) return ctx.notFound('Organization not found.');

    const full = await strapi.entityService.findOne(ORG_UID, Number(id), { fields: ['address', 'billingDetails', 'trialEndsAt'] });
    const members = ds.users
      .map((u) => {
        const m = u.organizations.find((o) => String(o.id) === id);
        if (!m) return null;
        const { id: _orgId, name: _orgName, ...membership } = m;
        return { id: u.id, name: u.name, email: u.email, blocked: u.blocked, confirmed: u.confirmed, ...membership };
      })
      .filter(Boolean)
      .sort((a, b) => Number(b.isOwner) - Number(a.isOwner) || String(a.name).localeCompare(String(b.name)));

    ctx.send({
      organization: { ...org, address: full?.address || null, billingDetails: full?.billingDetails || null },
      subscriptions: ds.subscriptions.filter((s) => String(s.organization.id) === id),
      payments: ds.payments.filter((p) => String(p.organization.id) === id),
      members,
      invitations: ds.invitations
        .filter((i) => String(i.organization?.id ?? i.organization) === id)
        .map((i) => ({ id: i.id, email: i.email, role: i.role, status: i.status, expiresAt: i.expiresAt, createdAt: i.createdAt })),
    });
  },

  async subscriptions(ctx) {
    if (!requireStaff(ctx)) return;
    const ds = await dataset({ fresh: wantsFresh(ctx) });
    ctx.send({ data: ds.subscriptions, apps: ds.apps.map(({ plans, ...a }) => a) });
  },

  async payments(ctx) {
    if (!requireStaff(ctx)) return;
    const ds = await dataset({ fresh: wantsFresh(ctx) });
    ctx.send({ data: ds.payments, apps: ds.apps.map(({ plans, ...a }) => a) });
  },

  async users(ctx) {
    if (!requireStaff(ctx)) return;
    const ds = await dataset({ fresh: wantsFresh(ctx) });
    ctx.send({ data: ds.users });
  },

  async apps(ctx) {
    if (!requireStaff(ctx)) return;
    const ds = await dataset({ fresh: wantsFresh(ctx) });
    const data = ds.apps.map((app) => {
      const subs = ds.subscriptions.filter((s) => s.app?.slug === app.slug);
      return {
        ...app,
        stats: {
          subscriptions: subs.length,
          paying: subs.filter((s) => s.mrr > 0).length,
          trial: subs.filter((s) => s.state === 'trial' && s.access === 'full').length,
          mrr: subs.reduce((sum, s) => sum + s.mrr, 0),
          seats: subs.filter((s) => s.mrr > 0).reduce((sum, s) => sum + s.users, 0),
        },
        plans: app.plans.map((plan) => {
          const onPlan = subs.filter((s) => s.planCode === plan.code && s.access !== 'locked');
          return {
            ...plan,
            subscribers: onPlan.length,
            seats: onPlan.reduce((sum, s) => sum + s.users, 0),
            mrr: onPlan.reduce((sum, s) => sum + s.mrr, 0),
          };
        }),
      };
    });
    ctx.send({ data });
  },

  /** POST /vendor/subscriptions/:id/extend-trial { days } */
  async extendTrial(ctx) {
    const user = requireStaff(ctx);
    if (!user) return;
    const days = Math.floor(Number(ctx.request.body?.days));
    if (!Number.isFinite(days) || days < 1 || days > 90) return ctx.badRequest('Choose between 1 and 90 days.');
    const sub = await strapi.entityService.findOne(SUB_UID, Number(ctx.params.id), { populate: { organization: { fields: ['id'] } } });
    if (!sub) return ctx.notFound('Subscription not found.');
    if (sub.planCode === 'free' || (sub.status === 'active' && sub.currentPeriodEnd)) {
      return ctx.badRequest('Only trials can be extended. This subscription is on a plan.');
    }
    const base = Math.max(Date.now(), sub.trialEndsAt ? new Date(sub.trialEndsAt).getTime() : 0);
    const trialEndsAt = new Date(base + days * DAY);
    await strapi.entityService.update(SUB_UID, sub.id, { data: { status: 'trial', trialEndsAt, endDate: trialEndsAt } });
    invalidateOrgAccess(sub.organization?.id);
    invalidate();
    audit(user, 'extend-trial', { subscription: sub.id, days, trialEndsAt });
    ctx.send({ ok: true, trialEndsAt });
  },

  /** POST /vendor/organizations/:id/suspend — locks every app for the organization. */
  async suspend(ctx) {
    const user = requireStaff(ctx);
    if (!user) return;
    const orgId = Number(ctx.params.id);
    const org = await strapi.entityService.findOne(ORG_UID, orgId, { fields: ['id', 'status'] });
    if (!org) return ctx.notFound('Organization not found.');
    const subs = await strapi.entityService.findMany(SUB_UID, { filters: { organization: orgId }, limit: 100 });
    await Promise.all(
      subs.filter((s) => s.status !== 'suspended').map((s) => strapi.entityService.update(SUB_UID, s.id, { data: { status: 'suspended' } }))
    );
    await strapi.entityService.update(ORG_UID, orgId, { data: { status: 'suspended' } });
    invalidateOrgAccess(orgId);
    invalidate();
    audit(user, 'suspend', { organization: orgId, reason: String(ctx.request.body?.reason || '').slice(0, 300) });
    ctx.send({ ok: true });
  },

  /** POST /vendor/organizations/:id/reactivate — lifts a suspension. */
  async reactivate(ctx) {
    const user = requireStaff(ctx);
    if (!user) return;
    const orgId = Number(ctx.params.id);
    const org = await strapi.entityService.findOne(ORG_UID, orgId, { fields: ['id', 'status'] });
    if (!org) return ctx.notFound('Organization not found.');
    const subs = await strapi.entityService.findMany(SUB_UID, { filters: { organization: orgId }, limit: 100 });
    let anyActive = false;
    await Promise.all(
      subs.map((s) => {
        const status = s.status === 'suspended' ? reactivatedStatus(s) : s.status;
        if (status === 'active') anyActive = true;
        return s.status === 'suspended' ? strapi.entityService.update(SUB_UID, s.id, { data: { status } }) : null;
      })
    );
    await strapi.entityService.update(ORG_UID, orgId, { data: { status: anyActive ? 'active' : 'trial' } });
    invalidateOrgAccess(orgId);
    invalidate();
    audit(user, 'reactivate', { organization: orgId });
    ctx.send({ ok: true });
  },
};
