'use strict';

const { makeBooksCrudController, relId } = require('../../../utils/books-crud');

const UID = 'api::overtime-record.overtime-record';
const ORG_USER_UID = 'api::organization-user.organization-user';

const LIST_POPULATE = {
  organizationUser: { populate: ['user', 'primaryDepartment'] },
};

function normalizePayload(body = {}) {
  return body.data || body;
}

async function resolveOrgUserOr403(strapi, orgUserId, orgId) {
  if (!orgUserId) return null;
  const orgUser = await strapi.entityService.findOne(ORG_USER_UID, orgUserId, {
    populate: ['organization'],
  });
  if (!orgUser) return null;
  if (String(relId(orgUser.organization)) !== String(orgId)) return null;
  return orgUser;
}

const base = makeBooksCrudController(UID, {
  defaultPopulate: Object.keys(LIST_POPULATE),
  extraFilters: (q) => {
    const filters = {};
    if (q.organizationUser) filters.organizationUser = q.organizationUser;
    if (q.status) filters.status = String(q.status).toLowerCase();
    return filters;
  },
});

module.exports = (params) => {
  const core = base(params);

  return {
    ...core,

    async find(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const q = ctx.query || {};
      const page = parseInt(q.page || '1', 10);
      const limit = Math.min(parseInt(q.limit || '100', 10), 200);
      const filters = { organization: ctx.state.orgId };
      if (q.organizationUser) filters.organizationUser = q.organizationUser;
      if (q.status) filters.status = String(q.status).toLowerCase();

      const [results, total] = await Promise.all([
        strapi.entityService.findMany(UID, {
          filters,
          start: (page - 1) * limit,
          limit,
          sort: q.sort || { recordDate: 'desc' },
          populate: LIST_POPULATE,
        }),
        strapi.db.query(UID).count({ where: filters }),
      ]);

      return { data: results, meta: { pagination: { page, limit, total, pageCount: Math.ceil(total / limit) } } };
    },

    async create(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const payload = normalizePayload(ctx.request?.body || {});
      const orgUserId = Number(payload.organizationUser);
      if (!Number.isFinite(orgUserId)) return ctx.badRequest('organizationUser is required');
      if (!payload.recordDate) return ctx.badRequest('recordDate is required');

      const orgUser = await resolveOrgUserOr403(strapi, orgUserId, ctx.state.orgId);
      if (!orgUser) return ctx.badRequest('Invalid employee for this organization');

      const overtimeHours = Number(payload.overtimeHours || 0);
      const amount = Number(payload.amount || Math.round(overtimeHours * 600));

      const entry = await strapi.entityService.create(UID, {
        data: {
          recordDate: payload.recordDate,
          regularHours: Number(payload.regularHours || 8),
          overtimeHours,
          amount,
          status: 'pending',
          notes: String(payload.notes || '').trim() || null,
          organizationUser: orgUserId,
          organization: ctx.state.orgId,
          createdByUser: ctx.state.user.id,
        },
        populate: LIST_POPULATE,
      });

      return { data: entry };
    },

    async approve(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) return ctx.notFound();

      const existing = await strapi.entityService.findOne(UID, id, { populate: ['organization'] });
      if (!existing) return ctx.notFound();
      if (String(relId(existing.organization)) !== String(ctx.state.orgId)) return ctx.forbidden();
      if (existing.status !== 'pending') return ctx.badRequest('Only pending overtime can be approved');

      const entry = await strapi.entityService.update(UID, id, {
        data: { status: 'approved' },
        populate: LIST_POPULATE,
      });

      return { data: entry };
    },
  };
};
