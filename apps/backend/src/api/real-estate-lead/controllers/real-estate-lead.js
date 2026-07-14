'use strict';

/**
 * real-estate-lead controller
 * - Requires ctx.state.user + ctx.state.orgId (global jwt-auth).
 * - CRUD is scoped to organization (tenant isolation).
 * - RBAC: realestate.leads module (write for create/update, manage for delete).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  orgIdFromRelation,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
} = require('../../../utils/content-api-helpers');
const { canAccess, requireModuleAccess, requireOwnerOrModuleManage } = require('../../../utils/rbac');

const UID = 'api::real-estate-lead.real-estate-lead';
const ACTIVITY_UID = 'api::lead-activity.lead-activity';

const LEAD_POPULATE_FALLBACK = ['assignedTo', 'organization', 'project'];
const sanitizePopulate = createPopulateSanitizer(
  new Set(['assignedTo', 'organization', 'project', 'activities', 'siteVisits']),
  LEAD_POPULATE_FALLBACK
);

/** Best-effort lead activity log (never blocks the main operation). */
async function logLeadActivity(strapi, { orgId, leadId, type, payload }) {
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: {
        organization: orgId,
        lead: leadId,
        type,
        payload: payload || {},
      },
    });
  } catch (_) {
    /* best-effort */
  }
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'leads', 'read');
    if (denied) return denied;

    const { query, page, pageSize, sort } = readListQuery(ctx, { defaultSort: 'score:desc' });

    const filters = { organization: ctx.state.orgId };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.project) filters.project = extra.project;
      if (extra.tier) filters.tier = extra.tier;
      if (extra.status) filters.status = extra.status;
      if (extra.source) filters.source = extra.source;
      if (extra.assignedTo) filters.assignedTo = extra.assignedTo;
      // Date range: filters[createdAt][$gte] / [$lte] (ISO strings).
      if (extra.createdAt && typeof extra.createdAt === 'object') {
        const range = {};
        if (extra.createdAt.$gte) range.$gte = extra.createdAt.$gte;
        if (extra.createdAt.$lte) range.$lte = extra.createdAt.$lte;
        if (Object.keys(range).length) filters.createdAt = range;
      }
      // Free-text search over name/phone/email.
      if (typeof extra.q === 'string' && extra.q.trim()) {
        const q = extra.q.trim();
        filters.$or = [
          { name: { $containsi: q } },
          { phone: { $containsi: q } },
          { email: { $containsi: q } },
        ];
      }
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
    // `organization` must be populated for the ownership check below, regardless
    // of what the client requested to populate.
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
    if (!canAccess(ctx, 'realestate', 'leads', 'manage') && ctx.state.user?.id) {
      data.assignedTo = ctx.state.user.id;
    } else if (data.assignedTo == null && ctx.state.user?.id) {
      data.assignedTo = ctx.state.user.id;
    }

    delete data.id;
    delete data.documentId;

    // Idempotency on metaLeadId — Meta resends webhooks; never duplicate a lead.
    if (data.metaLeadId) {
      const existing = await strapi.entityService.findMany(UID, {
        filters: { metaLeadId: String(data.metaLeadId) },
        limit: 1,
      });
      if (existing.length) {
        return { data: existing[0], meta: { deduplicated: true } };
      }
    }

    const entry = await strapi.entityService.create(UID, { data });
    await logLeadActivity(strapi, {
      orgId: ctx.state.orgId,
      leadId: entry.id,
      type: 'created',
      payload: { source: data.source || 'manual', actorUserId: ctx.state.user?.id },
    });
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'leads', 'write');
    if (denied) return denied;
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization', 'assignedTo'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    const ownershipDenied = requireOwnerOrModuleManage(
      ctx,
      'realestate',
      'leads',
      existing,
      'You can only edit leads assigned to you'
    );
    if (ownershipDenied) return ownershipDenied;

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};
    delete data.organization;
    delete data.metaLeadId; // immutable after ingestion
    if (!canAccess(ctx, 'realestate', 'leads', 'manage')) {
      delete data.assignedTo;
    }

    const entry = await strapi.entityService.update(UID, id, { data });

    if (data.status && data.status !== existing.status) {
      await logLeadActivity(strapi, {
        orgId: ctx.state.orgId,
        leadId: entry.id,
        type: 'status_changed',
        payload: { from: existing.status, to: data.status, actorUserId: ctx.state.user?.id },
      });
    }
    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'leads', 'manage');
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
