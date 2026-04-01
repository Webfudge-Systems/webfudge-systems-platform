'use strict';

/**
 * client-account controller
 * - Requires authenticated user (ctx.state.user set by global jwt-auth middleware).
 * - All data is scoped to ctx.state.orgId (tenant isolation).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { logCrmActivity } = require('../../../utils/crm-activity-log');
const UID = 'api::client-account.client-account';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseOptionalDate(value) {
  if (value == null || value === '') return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function orgIdFromRelation(rel) {
  if (rel == null) return null;
  if (typeof rel === 'object') return rel.id ?? null;
  return rel;
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

    const results = await strapi.entityService.findMany(UID, {
      filters,
      start: (page - 1) * pageSize,
      limit: pageSize,
      sort: sortField
        ? { [sortField]: (sortOrder || 'desc').toUpperCase() }
        : { createdAt: 'DESC' },
      populate: ['assignedTo', 'organization', 'convertedFromLead'],
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
      populate: ['assignedTo', 'organization', 'convertedFromLead', 'contacts'],
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

    const companyName = typeof data.companyName === 'string' ? data.companyName.trim() : '';
    const industry =
      data.industry != null && String(data.industry).trim() !== ''
        ? String(data.industry).trim()
        : '';
    const emailRaw = typeof data.email === 'string' ? data.email.trim() : '';
    if (!companyName) {
      return ctx.badRequest('Company name is required');
    }
    if (!industry) {
      return ctx.badRequest('Industry is required');
    }
    if (!emailRaw) {
      return ctx.badRequest('Company email is required');
    }
    if (!EMAIL_RE.test(emailRaw)) {
      return ctx.badRequest('Company email must be a valid email address');
    }
    data.companyName = companyName;
    data.industry = industry;
    data.email = emailRaw;

    for (const key of ['onboardingDate', 'contractStartDate', 'contractEndDate']) {
      if (data[key] != null && data[key] !== '') {
        const parsed = parseOptionalDate(data[key]);
        data[key] = parsed != null ? parsed : null;
      } else {
        delete data[key];
      }
    }

    if (data.healthScore != null && data.healthScore !== '') {
      const n = parseInt(String(data.healthScore), 10);
      if (!Number.isNaN(n)) data.healthScore = Math.min(100, Math.max(0, n));
    }
    if (data.dealValue != null && data.dealValue !== '') {
      const n = parseFloat(String(data.dealValue));
      if (!Number.isNaN(n)) data.dealValue = n;
    }

    if (data.assignedTo === '' || data.assignedTo == null) {
      delete data.assignedTo;
    } else {
      const aid = parseInt(String(data.assignedTo), 10);
      if (!Number.isNaN(aid)) data.assignedTo = aid;
      else delete data.assignedTo;
    }

    data.organization = ctx.state.orgId;
    if (!data.assignedTo && ctx.state.user?.id) {
      data.assignedTo = ctx.state.user.id;
    }

    const entry = await strapi.entityService.create(UID, { data });
    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'create',
        subjectType: 'client_account',
        entity: entry,
        changedKeys: null,
      });
    } catch (_) {
      /* best-effort */
    }
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
}));
