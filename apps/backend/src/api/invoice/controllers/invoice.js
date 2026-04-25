'use strict';

const { relId } = require('../../../utils/books-crud');
const { generateSequence } = require('../../../utils/sequence');
const { createAutoJournal } = require('../../../utils/auto-journal');

const UID = 'api::invoice.invoice';
const LI_UID = 'api::invoice-line-item.invoice-line-item';

function computeTotals(lineItems, discountType, discountValue, shippingCharge = 0, adjustment = 0) {
  const subtotal = lineItems.reduce((s, li) => {
    const qty = parseFloat(li.quantity || 1);
    const rate = parseInt(li.rate || 0, 10);
    return s + Math.round(qty * rate);
  }, 0);

  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = Math.round(subtotal * (parseFloat(discountValue || 0) / 100));
  } else {
    discountAmount = parseInt(discountValue || 0, 10);
  }

  const taxableBase = subtotal - discountAmount;
  const taxAmount = lineItems.reduce((s, li) => {
    const qty = parseFloat(li.quantity || 1);
    const rate = parseInt(li.rate || 0, 10);
    const liAmount = Math.round(qty * rate);
    const discPct = parseFloat(li.discountPercent || 0) / 100;
    const liAfterDisc = Math.round(liAmount * (1 - discPct));
    return s + Math.round(liAfterDisc * (parseFloat(li.taxRate || 0) / 100));
  }, 0);

  const total = taxableBase + taxAmount + parseInt(shippingCharge || 0, 10) + parseInt(adjustment || 0, 10);
  return { subtotal, discountAmount, taxAmount, total };
}

module.exports = {
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const q = ctx.query || {};
    const page = parseInt(q.page || '1', 10);
    const limit = Math.min(parseInt(q.limit || '20', 10), 200);
    const filters = { organization: ctx.state.orgId };
    if (q.status) filters.status = q.status;
    if (q.customer) filters.customer = q.customer;
    if (q.project) filters.project = q.project;
    if (q.from) filters.invoiceDate = { ...filters.invoiceDate, $gte: q.from };
    if (q.to) filters.invoiceDate = { ...filters.invoiceDate, $lte: q.to };
    if (q.search) filters.$or = [{ invoiceNumber: { $containsi: q.search } }];

    const [results, total] = await Promise.all([
      strapi.entityService.findMany(UID, { filters, start: (page - 1) * limit, limit, sort: { createdAt: 'desc' }, populate: ['customer', 'project'] }),
      strapi.db.query(UID).count({ where: filters }),
    ]);
    return { data: results, meta: { pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } } };
  },

  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const entry = await strapi.entityService.findOne(UID, ctx.params.id, {
      populate: ['customer', 'project', 'estimate', 'organization'],
    });
    if (!entry) return ctx.notFound();
    if (relId(entry.organization) !== ctx.state.orgId) return ctx.forbidden();

    const lineItems = await strapi.entityService.findMany(LI_UID, {
      filters: { invoice: ctx.params.id },
      sort: { sortOrder: 'asc' },
      populate: ['item'],
    });
    const payments = await strapi.entityService.findMany('api::payment-received.payment-received', {
      filters: { invoice: ctx.params.id },
      sort: { paymentDate: 'desc' },
    }).catch(() => []);

    return { data: { ...entry, lineItems, payments } };
  },

  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const { lineItems: liData = [], ...invoiceData } = payload;

    // Compute totals
    const { subtotal, discountAmount, taxAmount, total } = computeTotals(
      liData, invoiceData.discountType, invoiceData.discountValue,
      invoiceData.shippingCharge, invoiceData.adjustment
    );

    const invoiceNumber = await generateSequence(ctx.state.orgId, 'invoiceSequence', 'INV');

    const invoice = await strapi.entityService.create(UID, {
      data: {
        ...invoiceData,
        invoiceNumber,
        status: 'draft',
        subtotal,
        discountAmount,
        taxAmount,
        total,
        balanceDue: total,
        paidAmount: 0,
        organization: ctx.state.orgId,
        createdByUser: ctx.state.user.id,
      },
    });

    // Create line items
    for (let i = 0; i < liData.length; i++) {
      const li = liData[i];
      const qty = parseFloat(li.quantity || 1);
      const rate = parseInt(li.rate || 0, 10);
      const amount = Math.round(qty * rate);
      const taxAmt = Math.round(amount * (parseFloat(li.taxRate || 0) / 100));
      await strapi.entityService.create(LI_UID, {
        data: {
          description: li.description,
          quantity: qty,
          rate,
          amount,
          discountPercent: li.discountPercent || 0,
          taxRate: li.taxRate || 0,
          taxAmount: taxAmt,
          total: amount - Math.round(amount * (parseFloat(li.discountPercent || 0) / 100)) + taxAmt,
          sortOrder: i,
          invoice: invoice.id,
          item: li.item || null,
          organization: ctx.state.orgId,
        },
      });
    }

    return { data: invoice };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const existing = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization'] });
    if (!existing) return ctx.notFound();
    if (relId(existing.organization) !== ctx.state.orgId) return ctx.forbidden();
    if (existing.status !== 'draft') return ctx.badRequest('Only draft invoices can be edited');

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const { lineItems: liData, ...invoiceData } = payload;
    delete invoiceData.organization;
    delete invoiceData.invoiceNumber;
    delete invoiceData.status;

    let updateData = { ...invoiceData };
    if (liData) {
      const { subtotal, discountAmount, taxAmount, total } = computeTotals(
        liData, invoiceData.discountType || existing.discountType,
        invoiceData.discountValue || existing.discountValue,
        invoiceData.shippingCharge || existing.shippingCharge,
        invoiceData.adjustment || existing.adjustment
      );
      updateData = { ...updateData, subtotal, discountAmount, taxAmount, total, balanceDue: total - (existing.paidAmount || 0) };

      // Replace line items
      const existingLi = await strapi.entityService.findMany(LI_UID, { filters: { invoice: ctx.params.id } });
      for (const li of existingLi) {
        await strapi.entityService.delete(LI_UID, li.id);
      }
      for (let i = 0; i < liData.length; i++) {
        const li = liData[i];
        const qty = parseFloat(li.quantity || 1);
        const rate = parseInt(li.rate || 0, 10);
        const amount = Math.round(qty * rate);
        const taxAmt = Math.round(amount * (parseFloat(li.taxRate || 0) / 100));
        await strapi.entityService.create(LI_UID, {
          data: {
            description: li.description, quantity: qty, rate, amount,
            discountPercent: li.discountPercent || 0, taxRate: li.taxRate || 0,
            taxAmount: taxAmt, total: amount + taxAmt, sortOrder: i,
            invoice: ctx.params.id, item: li.item || null, organization: ctx.state.orgId,
          },
        });
      }
    }

    const entry = await strapi.entityService.update(UID, ctx.params.id, { data: updateData });
    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const existing = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization'] });
    if (!existing) return ctx.notFound();
    if (relId(existing.organization) !== ctx.state.orgId) return ctx.forbidden();
    if (existing.status !== 'draft') return ctx.badRequest('Only draft invoices can be deleted');
    const entry = await strapi.entityService.delete(UID, ctx.params.id);
    return { data: entry };
  },

  async updateStatus(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const invoice = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization', 'customer'] });
    if (!invoice) return ctx.notFound();
    if (relId(invoice.organization) !== ctx.state.orgId) return ctx.forbidden();

    const body = ctx.request?.body || {};
    const { status, voidReason } = body.data || body;
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    if (status === 'sent') {
      if (invoice.status !== 'draft') return ctx.badRequest('Can only send draft invoices');
      await strapi.entityService.update(UID, ctx.params.id, { data: { status: 'sent', sentAt: now } });

      // Auto-journal: DR 1100 Accounts Receivable, CR 4001 Service Revenue
      try {
        await createAutoJournal({
          organizationId: ctx.state.orgId,
          userId: ctx.state.user.id,
          sourceType: 'invoice',
          sourceId: invoice.id,
          journalDate: today,
          lines: [
            { accountCode: '1100', accountName: 'Accounts Receivable', description: `Invoice ${invoice.invoiceNumber}`, debit: invoice.total, credit: 0 },
            { accountCode: '4001', accountName: 'Service Revenue',     description: `Invoice ${invoice.invoiceNumber}`, debit: 0, credit: invoice.total },
          ],
        });
      } catch (err) {
        console.warn('[invoice] Auto-journal failed:', err.message);
      }

    } else if (status === 'void') {
      const payments = await strapi.entityService.findMany('api::payment-received.payment-received', {
        filters: { invoice: ctx.params.id },
      });
      if (payments.length > 0) return ctx.badRequest('Cannot void an invoice that has payments');
      if (!['Owner', 'Admin'].includes(ctx.state.orgRole)) return ctx.forbidden('Only Owner/Admin can void invoices');
      await strapi.entityService.update(UID, ctx.params.id, { data: { status: 'void', voidedAt: now, voidReason } });

    } else if (status === 'mark_paid') {
      if (invoice.balanceDue <= 0) return ctx.badRequest('Invoice is already fully paid');
      // Delegate to payment-received create flow
      const paymentData = {
        paymentDate: today,
        amount: invoice.balanceDue,
        paymentMode: 'bank_transfer',
        currency: invoice.currency,
        invoice: invoice.id,
        customer: relId(invoice.customer),
        organization: ctx.state.orgId,
        createdByUser: ctx.state.user.id,
        notes: 'Marked as paid from invoice',
      };
      const payNumber = await generateSequence(ctx.state.orgId, 'paymentSequence', 'PAY');
      await strapi.entityService.create('api::payment-received.payment-received', {
        data: { ...paymentData, paymentNumber: payNumber },
      });
      await strapi.entityService.update(UID, ctx.params.id, {
        data: { status: 'paid', paidAt: now, paidAmount: invoice.total, balanceDue: 0 },
      });
    } else {
      return ctx.badRequest(`Unknown status transition: ${status}`);
    }

    const updated = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['customer', 'project'] });
    return { data: updated };
  },

  async fromTime(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const body = ctx.request?.body || {};
    const { projectId, customerId, timeEntryIds } = body.data || body;
    if (!timeEntryIds || !timeEntryIds.length) return ctx.badRequest('timeEntryIds required');

    const tasks = await strapi.entityService.findMany('api::task.task', {
      filters: { id: { $in: timeEntryIds }, organization: ctx.state.orgId, invoiced: false },
      populate: ['timeProject'],
    });
    if (!tasks.length) return ctx.badRequest('No uninvoiced time entries found');

    const project = projectId ? await strapi.entityService.findOne('api::project.project', projectId) : null;
    const today = new Date().toISOString().split('T')[0];
    const invoiceNumber = await generateSequence(ctx.state.orgId, 'invoiceSequence', 'INV');

    const invoice = await strapi.entityService.create(UID, {
      data: {
        invoiceNumber,
        status: 'draft',
        invoiceDate: today,
        currency: project?.currency || 'INR',
        isBilledFromTime: true,
        project: projectId || null,
        customer: customerId || null,
        subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0, balanceDue: 0, paidAmount: 0,
        organization: ctx.state.orgId,
        createdByUser: ctx.state.user.id,
      },
    });

    let invoiceTotal = 0;
    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const hours = parseFloat(t.hoursLogged || 0);
      const rate = t.rate || project?.hourlyRate || 0;
      const amount = Math.round(hours * rate);
      invoiceTotal += amount;
      await strapi.entityService.create(LI_UID, {
        data: {
          description: t.name || t.description || 'Time entry',
          quantity: hours,
          rate,
          amount,
          discountPercent: 0, taxRate: 0, taxAmount: 0, total: amount,
          sortOrder: i,
          invoice: invoice.id,
          organization: ctx.state.orgId,
        },
      });
      await strapi.entityService.update('api::task.task', t.id, {
        data: { invoiced: true, invoicedOn: new Date().toISOString(), timeInvoice: invoice.id },
      });
    }

    await strapi.entityService.update(UID, invoice.id, {
      data: { subtotal: invoiceTotal, total: invoiceTotal, balanceDue: invoiceTotal },
    });

    // Recompute project financials
    if (projectId) {
      try {
        const allTasks = await strapi.entityService.findMany('api::task.task', {
          filters: { timeProject: projectId, organization: ctx.state.orgId },
        });
        const totalLoggedHours = allTasks.reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0);
        const billableHours = allTasks.filter(t => t.billable && !t.invoiced).reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0);
        const unbilledAmount = Math.round(billableHours * (project?.hourlyRate || 0));
        await strapi.entityService.update('api::project.project', projectId, {
          data: { totalLoggedHours, billableHours, unbilledAmount },
        });
      } catch (_) {}
    }

    const result = await strapi.entityService.findOne(UID, invoice.id, { populate: ['customer', 'project'] });
    return { data: result };
  },
};
