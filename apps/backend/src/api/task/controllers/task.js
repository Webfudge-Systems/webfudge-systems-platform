'use strict';

/**
 * task controller
 * - Requires ctx.state.user + ctx.state.orgId (global jwt-auth).
 * - CRUD is scoped to ctx.state.organization (tenant isolation).
 * - GET /tasks/my-work — sidebar summary (assignee or collaborator).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  orgIdFromRelation,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
} = require('../../../utils/content-api-helpers');

const UID = 'api::task.task';

const ALLOWED_POPULATE = new Set([
  'assignee',
  'collaborators',
  'projects',
  'parent',
  'subtasks',
  'leadCompany',
  'clientAccount',
  'deal',
  'organization',
]);

const sanitizePopulate = createPopulateSanitizer(ALLOWED_POPULATE, [
  'assignee',
  'organization',
  'leadCompany',
  'clientAccount',
  'deal',
]);

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const { query, page, pageSize, sort } = readListQuery(ctx, {
      maxPageSize: 500,
      defaultPageSize: 25,
      defaultSort: 'scheduledDate:desc',
    });

    const filters = { organization: ctx.state.orgId };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.deal) filters.deal = extra.deal;
      if (extra.status) filters.status = extra.status;
      if (extra.assignee) filters.assignee = extra.assignee;
      if (extra.clientAccount) filters.clientAccount = extra.clientAccount;
      if (extra.leadCompany) filters.leadCompany = extra.leadCompany;
    }

    const results = await strapi.entityService.findMany(UID, {
      filters,
      start: (page - 1) * pageSize,
      limit: pageSize,
      sort,
      populate: sanitizePopulate(query.populate),
    });

    const total = await safeCount(strapi, UID, filters, results.length);
    const pageCount = Math.ceil(Math.max(total, 1) / pageSize);
    return { data: results, meta: { pagination: { page, pageSize, pageCount, total } } };
  },

  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const { id } = ctx.params;
    const entry = await strapi.entityService.findOne(UID, id, {
      populate: sanitizePopulate(ctx.query?.populate),
    });
    if (!entry) return ctx.notFound();
    if (orgIdFromRelation(entry.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    return { data: entry };
  },

  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};

    data.organization = ctx.state.orgId;
    if (data.assignee == null && ctx.state.user?.id) {
      data.assignee = ctx.state.user.id;
    }

    delete data.id;
    delete data.documentId;

    const entry = await strapi.entityService.create(UID, { data });
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};
    delete data.organization;

    const entry = await strapi.entityService.update(UID, id, { data });
    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const entry = await strapi.entityService.delete(UID, id);
    return { data: entry };
  },

  /** GET /tasks/my-work */
  async myWork(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const userId = ctx.state.user.id;
    const orgId = ctx.state.orgId;

    const terminal = ['COMPLETED', 'CANCELLED'];

    const [asAssignee, asCollaborator] = await Promise.all([
      strapi.entityService.findMany(UID, {
        filters: {
          organization: orgId,
          assignee: userId,
        },
        limit: 200,
        sort: { scheduledDate: 'ASC' },
        populate: ['leadCompany', 'assignee'],
      }),
      strapi.entityService.findMany(UID, {
        filters: {
          organization: orgId,
          collaborators: { id: userId },
        },
        limit: 200,
        sort: { scheduledDate: 'ASC' },
        populate: ['leadCompany', 'assignee'],
      }),
    ]);

    const byId = new Map();
    for (const t of asAssignee) {
      if (t?.id != null) byId.set(t.id, t);
    }
    for (const t of asCollaborator) {
      if (t?.id != null) byId.set(t.id, t);
    }

    const tasks = [...byId.values()].filter((t) => t && !terminal.includes(t.status));

    const now = new Date();
    const sod = startOfDay(now);
    const eod = endOfDay(now);
    const horizonEnd = endOfDay(addDays(now, 14));

    const overdue = [];
    const today = [];
    const upcoming = [];

    for (const t of tasks) {
      const sd = t.scheduledDate ? new Date(t.scheduledDate) : null;
      if (!sd || Number.isNaN(sd.getTime())) {
        upcoming.push(t);
        continue;
      }
      if (sd < sod) {
        overdue.push(t);
      } else if (sd >= sod && sd <= eod) {
        today.push(t);
      } else if (sd > eod && sd <= horizonEnd) {
        upcoming.push(t);
      }
    }

    const slice = (arr, n) =>
      arr.slice(0, n).map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status,
        scheduledDate: task.scheduledDate,
        leadCompany: task.leadCompany
          ? typeof task.leadCompany === 'object'
            ? {
                id: task.leadCompany.id,
                companyName: task.leadCompany.companyName || task.leadCompany.name,
              }
            : { id: task.leadCompany }
          : null,
      }));

    return {
      data: {
        overdue: { count: overdue.length, items: slice(overdue, 5) },
        today: { count: today.length, items: slice(today, 5) },
        upcoming: { count: upcoming.length, items: slice(upcoming, 5) },
      },
    };
  },
}));
