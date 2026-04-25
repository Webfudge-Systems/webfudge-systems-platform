'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { relId } = require('../../../utils/books-crud');

const UID = 'api::task.task';

async function recomputeProjectFinancials(projectId) {
  if (!projectId) return;
  try {
    const { recomputeFinancials } = require('../../project/controllers/project');
    await recomputeFinancials(projectId);
  } catch (err) {
    console.warn('[task] recomputeProjectFinancials failed:', err.message);
  }
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const q = ctx.query || {};
    const page = parseInt(q.page || '1', 10);
    const limit = Math.min(parseInt(q.limit || '20', 10), 200);
    const filters = { organization: ctx.state.orgId };
    if (q.project) filters.timeProject = q.project;
    if (q.billable !== undefined) filters.billable = q.billable === 'true';
    if (q.invoiced !== undefined) filters.invoiced = q.invoiced === 'true';
    if (q.user) filters.assignee = q.user;
    if (q.from) filters.logDate = { ...filters.logDate, $gte: q.from };
    if (q.to) filters.logDate = { ...filters.logDate, $lte: q.to };

    const [results, total] = await Promise.all([
      strapi.entityService.findMany(UID, { filters, start: (page - 1) * limit, limit, sort: { createdAt: 'desc' }, populate: ['timeProject', 'assignee'] }),
      strapi.db.query(UID).count({ where: filters }),
    ]);
    return { data: results, meta: { pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } } };
  },

  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const entry = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization', 'timeProject', 'assignee'] });
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
    const entry = await strapi.entityService.create(UID, { data, populate: ['timeProject'] });
    if (data.timeProject) await recomputeProjectFinancials(relId(entry.timeProject) || data.timeProject);
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const existing = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization', 'timeProject'] });
    if (!existing) return ctx.notFound();
    if (relId(existing.organization) !== ctx.state.orgId) return ctx.forbidden();
    const body = ctx.request?.body || {};
    const data = { ...(body.data || body) };
    delete data.organization;
    const entry = await strapi.entityService.update(UID, ctx.params.id, { data, populate: ['timeProject'] });
    const projId = relId(entry.timeProject) || relId(existing.timeProject);
    if (projId) await recomputeProjectFinancials(projId);
    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const existing = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization', 'timeProject'] });
    if (!existing) return ctx.notFound();
    if (relId(existing.organization) !== ctx.state.orgId) return ctx.forbidden();
    const projId = relId(existing.timeProject);
    const entry = await strapi.entityService.delete(UID, ctx.params.id);
    if (projId) await recomputeProjectFinancials(projId);
    return { data: entry };
  },

  async timerStart(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const task = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization'] });
    if (!task) return ctx.notFound();
    if (relId(task.organization) !== ctx.state.orgId) return ctx.forbidden();
    if (task.timerRunning) return ctx.badRequest('Timer is already running');

    const entry = await strapi.entityService.update(UID, ctx.params.id, {
      data: { timerRunning: true, timerStartedAt: new Date().toISOString() },
    });
    return { data: entry };
  },

  async timerStop(ctx) {
    if (!ctx.state.user) return ctx.unauthorized();
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const task = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization', 'timeProject'] });
    if (!task) return ctx.notFound();
    if (relId(task.organization) !== ctx.state.orgId) return ctx.forbidden();
    if (!task.timerRunning) return ctx.badRequest('Timer is not running');

    const now = new Date();
    const started = new Date(task.timerStartedAt);
    const hoursElapsed = (now - started) / 3600000;
    const newHours = Math.round(((parseFloat(task.hoursLogged) || 0) + hoursElapsed) * 100) / 100;

    const entry = await strapi.entityService.update(UID, ctx.params.id, {
      data: { hoursLogged: newHours, timerRunning: false, timerStartedAt: null },
    });

    const projId = relId(entry.timeProject) || relId(task.timeProject);
    if (projId) await recomputeProjectFinancials(projId);

    return { data: entry };
  },
}));
