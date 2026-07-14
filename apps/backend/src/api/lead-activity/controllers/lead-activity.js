'use strict';

/**
 * lead-activity controller — immutable timeline events on real-estate leads.
 * Read + create only; no update/delete routes (audit-style log).
 * RBAC: realestate.leads module.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  orgIdFromRelation,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
} = require('../../../utils/content-api-helpers');
const { requireModuleAccess } = require('../../../utils/rbac');

const UID = 'api::lead-activity.lead-activity';

const ACTIVITY_POPULATE_FALLBACK = ['lead'];
const sanitizePopulate = createPopulateSanitizer(
  new Set(['lead', 'organization']),
  ACTIVITY_POPULATE_FALLBACK
);

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'leads', 'read');
    if (denied) return denied;

    const { query, page, pageSize, sort } = readListQuery(ctx);

    const filters = { organization: ctx.state.orgId };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.lead) filters.lead = extra.lead;
      if (extra.type) filters.type = extra.type;
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
    const denied = requireModuleAccess(ctx, 'realestate', 'leads', 'read');
    if (denied) return denied;

    const { id } = ctx.params;
    // `organization` must be populated for the ownership check, regardless of
    // what the client requested to populate.
    const populate = sanitizePopulate(ctx.query?.populate);
    const populateWithOrg = populate.includes('organization')
      ? populate
      : [...populate, 'organization'];
    const entry = await strapi.entityService.findOne(UID, id, {
      populate: populateWithOrg,
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
    const denied = requireModuleAccess(ctx, 'realestate', 'leads', 'write');
    if (denied) return denied;

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};

    data.organization = ctx.state.orgId;
    delete data.id;
    delete data.documentId;

    if (!data.type) return ctx.badRequest('type is required');

    // Cross-tenant guard: the linked lead must belong to the active org.
    if (data.lead != null) {
      const lead = await strapi.entityService.findOne(
        'api::real-estate-lead.real-estate-lead',
        data.lead,
        { populate: ['organization'] }
      );
      if (!lead || orgIdFromRelation(lead.organization) !== ctx.state.orgId) {
        return ctx.badRequest('Lead not found in the active organization');
      }
    }

    const entry = await strapi.entityService.create(UID, { data });
    return { data: entry };
  },
}));
