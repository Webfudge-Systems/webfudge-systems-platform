'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { relId } = require('../../../utils/books-crud');

const UID = 'api::project.project';
const TASK_UID = 'api::task.task';

async function recomputeFinancials(projectId) {
  const tasks = await strapi.entityService.findMany(TASK_UID, {
    filters: { timeProject: projectId },
    limit: 10000,
  });

  const totalLoggedHours = tasks.reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0);
  const billableHours = tasks.filter(t => t.billable && !t.invoiced).reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0);

  const project = await strapi.entityService.findOne(UID, projectId);
  const unbilledAmount = Math.round(billableHours * (project?.hourlyRate || 0));

  await strapi.entityService.update(UID, projectId, {
    data: {
      totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      unbilledAmount,
    },
  });
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const q = ctx.query || {};
    const page = parseInt(q.page || '1', 10);
    const limit = Math.min(parseInt(q.limit || '20', 10), 200);
    const filters = { organization: ctx.state.orgId };
    if (q.booksStatus) filters.booksStatus = q.booksStatus;
    if (q.customer) filters.customer = q.customer;
    if (q.search) filters.name = { $containsi: q.search };

    const [results, total] = await Promise.all([
      strapi.entityService.findMany(UID, { filters, start: (page - 1) * limit, limit, sort: { createdAt: 'desc' }, populate: ['customer', 'projectManager'] }),
      strapi.db.query(UID).count({ where: filters }),
    ]);
    return { data: results, meta: { pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } } };
  },

  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const entry = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization', 'customer', 'projectManager', 'teamMembers'] });
    if (!entry) return ctx.notFound();
    if (relId(entry.organization) !== ctx.state.orgId) return ctx.forbidden();
    return { data: entry };
  },

  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const body = ctx.request?.body || {};
    const data = { ...(body.data || body), organization: ctx.state.orgId };
    delete data.id;
    const entry = await strapi.entityService.create(UID, { data, populate: ['customer'] });
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const existing = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization'] });
    if (!existing) return ctx.notFound();
    if (relId(existing.organization) !== ctx.state.orgId) return ctx.forbidden();
    const body = ctx.request?.body || {};
    const data = { ...(body.data || body) };
    delete data.organization;
    const entry = await strapi.entityService.update(UID, ctx.params.id, { data, populate: ['customer'] });
    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const existing = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization'] });
    if (!existing) return ctx.notFound();
    if (relId(existing.organization) !== ctx.state.orgId) return ctx.forbidden();
    const entry = await strapi.entityService.delete(UID, ctx.params.id);
    return { data: entry };
  },

  async summary(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const project = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization', 'customer'] });
    if (!project) return ctx.notFound();
    if (relId(project.organization) !== ctx.state.orgId) return ctx.forbidden();

    const tasks = await strapi.entityService.findMany(TASK_UID, {
      filters: { timeProject: ctx.params.id, organization: ctx.state.orgId },
      limit: 10000,
    }).catch(() => []);

    const totalLoggedHours = tasks.reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0);
    const billableHours = tasks.filter(t => t.billable && !t.invoiced).reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0);

    const invoices = await strapi.entityService.findMany('api::invoice.invoice', {
      filters: { project: ctx.params.id, organization: ctx.state.orgId },
      limit: 1000,
    }).catch(() => []);

    const paymentsReceived = await strapi.entityService.findMany('api::payment-received.payment-received', {
      filters: { organization: ctx.state.orgId },
      populate: ['invoice'],
      limit: 5000,
    }).catch(() => []);

    const invoiceIds = new Set(invoices.map(i => i.id));
    const totalRevenue = paymentsReceived
      .filter(p => p.invoice && invoiceIds.has(relId(p.invoice)))
      .reduce((s, p) => s + (p.amount || 0), 0);

    const expenses = await strapi.entityService.findMany('api::expense.expense', {
      filters: { project: ctx.params.id, organization: ctx.state.orgId },
      limit: 1000,
    }).catch(() => []);
    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

    return ctx.send({
      data: {
        totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
        billableHours: Math.round(billableHours * 100) / 100,
        unbilledHours: Math.round((totalLoggedHours - (tasks.filter(t => t.invoiced).reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0))) * 100) / 100,
        totalRevenue,
        totalExpenses,
        profitability: totalRevenue - totalExpenses,
        budgetBurnPercent: project.budgetAmount ? Math.round((totalExpenses / project.budgetAmount) * 100) : 0,
        invoiceCount: invoices.length,
        paidInvoiceCount: invoices.filter(i => i.status === 'paid').length,
      },
    });
  },
}));

module.exports.recomputeFinancials = recomputeFinancials;
