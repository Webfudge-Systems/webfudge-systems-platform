'use strict';

/**
 * project controller
 * - Requires ctx.state.user + ctx.state.orgId (global jwt-auth).
 * - CRUD is scoped to organization (tenant isolation).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  orgIdFromRelation,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
  resolveEntityPkForRouteParam,
} = require('../../../utils/content-api-helpers');
const { logCrmActivity, collectChangedKeys } = require('../../../utils/crm-activity-log');

const UID = 'api::project.project';

const ALLOWED_POPULATE = new Set([
  'projectManager',
  'teamMembers',
  'tasks',
  'clientAccount',
  'organization',
  'sourceDeal',
]);

const sanitizePopulate = createPopulateSanitizer(ALLOWED_POPULATE, [
  'projectManager',
  'clientAccount',
  'organization',
  'sourceDeal',
]);

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const { query, page, pageSize, sort } = readListQuery(ctx, {
      maxPageSize: 500,
      defaultPageSize: 25,
      defaultSort: 'updatedAt:desc',
    });

    const filters = { organization: ctx.state.orgId };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.clientAccount) filters.clientAccount = extra.clientAccount;
      if (extra.status) filters.status = extra.status;
      if (extra.sourceDeal) filters.sourceDeal = extra.sourceDeal;
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

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();

    const sanitized = sanitizePopulate(ctx.query?.populate);
    const populate = [...new Set([...(Array.isArray(sanitized) ? sanitized : []), 'organization'])];
    const entry = await strapi.entityService.findOne(UID, pk, {
      populate,
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
    if (data.projectManager == null && ctx.state.user?.id) {
      data.projectManager = ctx.state.user.id;
    }

    delete data.id;
    delete data.documentId;

    const entry = await strapi.entityService.create(UID, { data });
    try {
      const lookupKey = entry?.id ?? entry?.documentId;
      const forLog =
        lookupKey != null
          ? await strapi.entityService.findOne(UID, lookupKey, {
              populate: ['projectManager', 'clientAccount', 'teamMembers'],
            })
          : entry;
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'create',
        subjectType: 'project',
        entity: forLog,
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

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();

    const existing = await strapi.entityService.findOne(UID, pk, {
      populate: ['organization', 'projectManager', 'clientAccount', 'teamMembers'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};
    delete data.organization;

    await strapi.entityService.update(UID, pk, { data });
    const changedKeys = collectChangedKeys(data);

    // Reload full row for response + timeline — Strapi 5 update() may omit numeric `id` on the
    // returned entry, which caused logCrmActivity to skip so name edits never appeared.
    const forLog = await strapi.entityService.findOne(UID, pk, {
      populate: ['projectManager', 'clientAccount', 'teamMembers'],
    });

    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'update',
        subjectType: 'project',
        entity: forLog,
        subjectId: pk,
        changedKeys,
        previousEntity: existing,
        patch: data,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: forLog };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();

    const existing = await strapi.entityService.findOne(UID, pk, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const entry = await strapi.entityService.delete(UID, pk);
    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'delete',
        subjectType: 'project',
        entity: existing,
        changedKeys: null,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: entry };
  },
}));
