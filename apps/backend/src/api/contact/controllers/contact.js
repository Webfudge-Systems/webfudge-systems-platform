'use strict';

/**
 * contact controller — same tenancy rules as lead-company (org + JWT middleware).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { logCrmActivity, collectChangedKeys } = require('../../../utils/crm-activity-log');
const UID = 'api::contact.contact';

function orgIdFromRelation(rel) {
  if (rel == null) return null;
  if (typeof rel === 'object') return rel.id ?? null;
  return rel;
}

const ALLOWED_POPULATE = new Set(['assignedTo', 'organization', 'leadCompany', 'clientAccount']);

function sanitizePopulate(populate) {
  const fallback = ['assignedTo', 'organization', 'leadCompany', 'clientAccount'];
  if (populate == null || populate === '' || populate === '*') {
    return fallback;
  }
  let keys = [];
  if (Array.isArray(populate)) {
    keys = populate.map((p) => (typeof p === 'string' ? p : '')).filter(Boolean);
  } else if (typeof populate === 'object') {
    keys = Object.values(populate)
      .map((v) => (typeof v === 'string' ? v : ''))
      .filter(Boolean);
  } else if (typeof populate === 'string') {
    keys = populate
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const filtered = [...new Set(keys.filter((k) => ALLOWED_POPULATE.has(k)))];
  return filtered.length ? filtered : fallback;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const query = ctx.query || {};
    const page = parseInt(query['pagination[page]'] || query.page || '1', 10);
    const pageSize = Math.min(
      parseInt(query['pagination[pageSize]'] || query.pageSize || '25', 10),
      100
    );
    const sort = query.sort || 'createdAt:desc';
    const [sortField, sortOrder] = sort.split(':');

    const filters = { organization: ctx.state.orgId };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.leadCompany) {
        filters.leadCompany = extra.leadCompany;
      }
      if (extra.clientAccount) {
        filters.clientAccount = extra.clientAccount;
      }
    }

    const results = await strapi.entityService.findMany(UID, {
      filters,
      start: (page - 1) * pageSize,
      limit: pageSize,
      sort: sortField
        ? { [sortField]: (sortOrder || 'desc').toUpperCase() }
        : { createdAt: 'DESC' },
      populate: sanitizePopulate(query.populate),
    });

    let total = 0;
    try {
      total = await strapi.db.query(UID).count({ where: filters });
    } catch (_) {
      total = results.length;
    }
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
    if (data.assignedTo == null && ctx.state.user?.id) {
      data.assignedTo = ctx.state.user.id;
    }

    delete data.id;
    delete data.documentId;

    const entry = await strapi.entityService.create(UID, { data });
    let forLog = entry;
    try {
      if (forLog?.id != null) {
        forLog = await strapi.entityService.findOne(UID, forLog.id, { populate: ['leadCompany'] });
      }
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'create',
        subjectType: 'contact',
        entity: forLog,
        changedKeys: null,
      });
    } catch (_) {
      /* logging is best-effort */
    }
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization', 'leadCompany', 'assignedTo'],
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
    const changedKeys = collectChangedKeys(data);
    try {
      const forLog =
        entry?.id != null
          ? await strapi.entityService.findOne(UID, entry.id, { populate: ['leadCompany', 'assignedTo'] })
          : entry;
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'update',
        subjectType: 'contact',
        entity: forLog,
        changedKeys,
        previousEntity: existing,
        patch: data,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization', 'leadCompany'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const entry = await strapi.entityService.delete(UID, id);
    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'delete',
        subjectType: 'contact',
        entity: existing,
        changedKeys: null,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: entry };
  },
}));
