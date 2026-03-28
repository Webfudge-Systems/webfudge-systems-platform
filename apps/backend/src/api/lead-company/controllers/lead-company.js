'use strict';

/**
 * lead-company controller
 * - Requires authenticated user (ctx.state.user set by global jwt-auth middleware).
 * - All data is scoped to ctx.state.orgId (tenant isolation).
 * - On create, organization is auto-set from ctx.state.orgId.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const UID = 'api::lead-company.lead-company';

module.exports = createCoreController(UID, ({ strapi }) => ({
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');

    const query = ctx.query || {};
    const page = parseInt(query['pagination[page]'] || query.page || '1', 10);
    const pageSize = Math.min(
      parseInt(query['pagination[pageSize]'] || query.pageSize || '25', 10),
      100
    );
    const sort = query.sort || 'createdAt:desc';
    const [sortField, sortOrder] = sort.split(':');

    // Always scope by organization
    const filters = {};
    if (ctx.state.orgId) {
      filters.organization = ctx.state.orgId;
    }

    const results = await strapi.entityService.findMany(UID, {
      filters,
      start: (page - 1) * pageSize,
      limit: pageSize,
      sort: sortField
        ? { [sortField]: (sortOrder || 'desc').toUpperCase() }
        : { createdAt: 'DESC' },
      populate: query.populate || ['assignedTo', 'organization'],
    });

    // Count total for this org
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
    const { id } = ctx.params;
    const entry = await strapi.entityService.findOne(UID, id, {
      populate: ctx.query?.populate || ['assignedTo', 'organization'],
    });
    if (!entry) return ctx.notFound();
    // Ensure belongs to requester's org
    if (ctx.state.orgId && entry.organization?.id !== ctx.state.orgId) {
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

    // Force org and creator
    data.organization = ctx.state.orgId;
    if (!data.assignedTo && ctx.state.user?.id) {
      data.assignedTo = ctx.state.user.id;
    }

    const entry = await strapi.entityService.create(UID, { data });
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    const { id } = ctx.params;

    // Verify ownership before update
    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (ctx.state.orgId && existing.organization?.id !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};
    // Never allow changing organization via update
    delete data.organization;

    const entry = await strapi.entityService.update(UID, id, { data });
    return { data: entry };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    const { id } = ctx.params;

    const existing = await strapi.entityService.findOne(UID, id, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (ctx.state.orgId && existing.organization?.id !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }

    const entry = await strapi.entityService.delete(UID, id);
    return { data: entry };
  },
}));
