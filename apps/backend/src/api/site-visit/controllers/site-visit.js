'use strict';

/**
 * site-visit controller
 * - Requires ctx.state.user + ctx.state.orgId (global jwt-auth).
 * - CRUD is scoped to organization (tenant isolation).
 * - RBAC: realestate.site_visits module (write for create/update, manage for delete).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  orgIdFromRelation,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
} = require('../../../utils/content-api-helpers');
const { requireModuleAccess } = require('../../../utils/rbac');

const UID = 'api::site-visit.site-visit';
const ACTIVITY_UID = 'api::lead-activity.lead-activity';

const VISIT_POPULATE_FALLBACK = ['lead', 'project', 'organization'];
const sanitizePopulate = createPopulateSanitizer(
  new Set(['lead', 'project', 'organization']),
  VISIT_POPULATE_FALLBACK
);

async function logLeadActivity(strapi, { orgId, leadId, type, payload }) {
  if (!leadId) return;
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: { organization: orgId, lead: leadId, type, payload: payload || {} },
    });
  } catch (_) {
    /* best-effort */
  }
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'site_visits', 'read');
    if (denied) return denied;

    const { query, page, pageSize, sort } = readListQuery(ctx, { defaultSort: 'scheduledAt:desc' });

    const filters = { organization: ctx.state.orgId };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.lead) filters.lead = extra.lead;
      if (extra.project) filters.project = extra.project;
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
    const denied = requireModuleAccess(ctx, 'realestate', 'site_visits', 'read');
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
    const denied = requireModuleAccess(ctx, 'realestate', 'site_visits', 'write');
    if (denied) return denied;

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};

    data.organization = ctx.state.orgId;
    delete data.id;
    delete data.documentId;

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
    await logLeadActivity(strapi, {
      orgId: ctx.state.orgId,
      leadId: data.lead,
      type: 'site_visit_scheduled',
      payload: { siteVisitId: entry.id, scheduledAt: data.scheduledAt, actorUserId: ctx.state.user?.id },
    });
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'site_visits', 'write');
    if (denied) return denied;
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization', 'lead'],
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

    if (data.completedAt && !existing.completedAt) {
      const leadId = existing.lead && typeof existing.lead === 'object' ? existing.lead.id : existing.lead;
      await logLeadActivity(strapi, {
        orgId: ctx.state.orgId,
        leadId,
        type: 'site_visit_completed',
        payload: { siteVisitId: entry.id, outcome: data.outcome, actorUserId: ctx.state.user?.id },
      });
    }
    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'site_visits', 'manage');
    if (denied) return denied;
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
