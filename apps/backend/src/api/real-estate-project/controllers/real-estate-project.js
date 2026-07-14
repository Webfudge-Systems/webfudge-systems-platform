'use strict';

/**
 * real-estate-project controller
 * - Requires ctx.state.user + ctx.state.orgId (global jwt-auth).
 * - CRUD is scoped to organization (tenant isolation).
 * - RBAC: realestate.projects module (write for create/update, manage for delete).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  orgIdFromRelation,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
} = require('../../../utils/content-api-helpers');
const { requireModuleAccess } = require('../../../utils/rbac');

const UID = 'api::real-estate-project.real-estate-project';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';
const SUBJECT_TYPE = 'real_estate_project';

const PROJECT_POPULATE_FALLBACK = ['organization'];
const sanitizePopulate = createPopulateSanitizer(
  new Set(['organization', 'leads', 'siteVisits']),
  PROJECT_POPULATE_FALLBACK
);

/** Human labels for tracked project fields (used in update diffs). */
const TRACKED_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'developerName', label: 'Developer' },
  { key: 'location', label: 'Location' },
  { key: 'minPrice', label: 'Min price' },
  { key: 'maxPrice', label: 'Max price' },
  { key: 'configurations', label: 'Configurations' },
  { key: 'possessionDate', label: 'Possession date' },
  { key: 'status', label: 'Status' },
  { key: 'landingPageUrl', label: 'Landing page' },
  { key: 'metaCampaignId', label: 'Meta campaign' },
];

function actorNameFromCtx(ctx) {
  const u = ctx.state.user;
  return u?.username || u?.email || (u?.id != null ? `User ${u.id}` : 'Someone');
}

function displayValue(value) {
  if (value == null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.join(', ') : '—';
  return String(value);
}

/** Build meta.changes[] by diffing tracked fields between before/after. */
function diffProjectChanges(before, after) {
  const changes = [];
  for (const { key, label } of TRACKED_FIELDS) {
    if (!(key in after)) continue;
    const prev = before ? before[key] : undefined;
    const next = after[key];
    const prevStr = displayValue(prev);
    const nextStr = displayValue(next);
    if (prevStr !== nextStr) {
      changes.push({ key, label, before: prevStr, after: nextStr });
    }
  }
  return changes;
}

/** Best-effort audit log into the shared crm_activities store. Never throws. */
async function logProjectActivity(strapi, ctx, { action, subjectId, summary, meta }) {
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: {
        organization: ctx.state.orgId,
        actor: ctx.state.user?.id ?? null,
        action,
        subjectType: SUBJECT_TYPE,
        subjectId,
        summary,
        meta: meta || null,
      },
    });
  } catch (_) {
    /* audit logging is best-effort */
  }
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'projects', 'read');
    if (denied) return denied;

    const { query, page, pageSize, sort } = readListQuery(ctx);

    const filters = { organization: ctx.state.orgId };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.status) filters.status = extra.status;
      if (extra.metaCampaignId) filters.metaCampaignId = extra.metaCampaignId;
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
    const denied = requireModuleAccess(ctx, 'realestate', 'projects', 'read');
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
    const denied = requireModuleAccess(ctx, 'realestate', 'projects', 'write');
    if (denied) return denied;

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};

    data.organization = ctx.state.orgId;
    delete data.id;
    delete data.documentId;

    const entry = await strapi.entityService.create(UID, { data });

    await logProjectActivity(strapi, ctx, {
      action: 'create',
      subjectId: entry.id,
      summary: `${actorNameFromCtx(ctx)} created project "${entry.name || 'Untitled'}"`,
    });

    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'projects', 'write');
    if (denied) return denied;
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

    const changes = diffProjectChanges(existing, data);
    if (changes.length) {
      const fieldLabel = changes.length === 1 ? changes[0].label : `${changes.length} fields`;
      await logProjectActivity(strapi, ctx, {
        action: 'update',
        subjectId: entry.id,
        summary: `${actorNameFromCtx(ctx)} updated ${fieldLabel} on "${entry.name || 'Untitled'}"`,
        meta: { changes },
      });
    }

    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'projects', 'manage');
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

  /**
   * GET /real-estate-projects/:id/activities
   * Audit timeline (create/update/comment) for a single project, org-scoped.
   */
  async activities(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'realestate', 'projects', 'read');
    if (denied) return denied;

    const pid = parseInt(String(ctx.params.id), 10);
    if (Number.isNaN(pid)) return ctx.badRequest('Invalid project id');

    const project = await strapi.entityService.findOne(UID, pid, {
      populate: ['organization'],
    });
    if (!project) return ctx.notFound();
    if (orgIdFromRelation(project.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const limit = Math.min(parseInt(String(ctx.query?.limit || '50'), 10) || 50, 100);
    const filters = {
      organization: ctx.state.orgId,
      subjectType: SUBJECT_TYPE,
      subjectId: pid,
    };

    const total = await safeCount(strapi, ACTIVITY_UID, filters, 0);
    const results = await strapi.entityService.findMany(ACTIVITY_UID, {
      filters,
      sort: { createdAt: 'DESC' },
      limit,
      populate: ['actor'],
    });

    return { data: results, meta: { total } };
  },
}));
