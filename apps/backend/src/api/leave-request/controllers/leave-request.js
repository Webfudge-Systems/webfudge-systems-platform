'use strict';

const { makeBooksCrudController, relId } = require('../../../utils/books-crud');
const { assertSelfOrHrAdmin } = require('../../../utils/hr-self-scope');

const UID = 'api::leave-request.leave-request';
const ORG_USER_UID = 'api::organization-user.organization-user';
const PROFILE_UID = 'api::employee-profile.employee-profile';

const LIST_POPULATE = {
  organizationUser: { populate: ['user', 'primaryDepartment'] },
  employeeProfile: true,
  approvedByUser: true,
};

function calcInclusiveDays(fromDate, toDate) {
  const from = new Date(fromDate);
  const to = new Date(toDate);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1;
  if (to < from) return 1;
  const diffMs = to.getTime() - from.getTime();
  return Math.max(1, Math.floor(diffMs / 86400000) + 1);
}

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

async function findProfileForOrgUser(strapi, orgUserId, orgId) {
  const rows = await strapi.entityService.findMany(PROFILE_UID, {
    filters: { organizationUser: orgUserId, organization: orgId },
    limit: 1,
  });
  return rows[0] || null;
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
          sort: q.sort || { createdAt: 'desc' },
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

      const orgUser = await resolveOrgUserOr403(strapi, orgUserId, ctx.state.orgId);
      if (!orgUser) return ctx.badRequest('Invalid employee for this organization');

      if (!assertSelfOrHrAdmin(ctx, orgUserId)) {
        return ctx.forbidden('You can only apply leave for yourself');
      }

      const fromDate = payload.fromDate;
      const toDate = payload.toDate || fromDate;
      if (!fromDate) return ctx.badRequest('fromDate is required');

      const profile = await findProfileForOrgUser(strapi, orgUserId, ctx.state.orgId);
      const days = calcInclusiveDays(fromDate, toDate);

      const entry = await strapi.entityService.create(UID, {
        data: {
          leaveType: String(payload.leaveType || '').trim(),
          fromDate,
          toDate,
          days,
          reason: String(payload.reason || '').trim(),
          status: 'pending',
          appliedOn: new Date().toISOString().slice(0, 10),
          organizationUser: orgUserId,
          employeeProfile: profile?.id || null,
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
      if (existing.status !== 'pending') return ctx.badRequest('Only pending requests can be approved');

      const entry = await strapi.entityService.update(UID, id, {
        data: {
          status: 'approved',
          approvedAt: new Date().toISOString(),
          approvedByUser: ctx.state.user.id,
          rejectionReason: null,
        },
        populate: LIST_POPULATE,
      });

      return { data: entry };
    },

    async reject(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) return ctx.notFound();

      const existing = await strapi.entityService.findOne(UID, id, { populate: ['organization'] });
      if (!existing) return ctx.notFound();
      if (String(relId(existing.organization)) !== String(ctx.state.orgId)) return ctx.forbidden();
      if (existing.status !== 'pending') return ctx.badRequest('Only pending requests can be rejected');

      const payload = normalizePayload(ctx.request?.body || {});
      const entry = await strapi.entityService.update(UID, id, {
        data: {
          status: 'rejected',
          approvedAt: new Date().toISOString(),
          approvedByUser: ctx.state.user.id,
          rejectionReason: String(payload.rejectionReason || payload.reason || '').trim() || null,
        },
        populate: LIST_POPULATE,
      });

      return { data: entry };
    },

    async cancel(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) return ctx.notFound();

      const existing = await strapi.entityService.findOne(UID, id, {
        populate: ['organization', 'organizationUser'],
      });
      if (!existing) return ctx.notFound();
      if (String(relId(existing.organization)) !== String(ctx.state.orgId)) return ctx.forbidden();
      if (existing.status !== 'pending') return ctx.badRequest('Only pending requests can be cancelled');

      const orgUserId = relId(existing.organizationUser);
      if (!assertSelfOrHrAdmin(ctx, orgUserId)) {
        return ctx.forbidden('You can only cancel your own leave requests');
      }

      const entry = await strapi.entityService.update(UID, id, {
        data: { status: 'cancelled' },
        populate: LIST_POPULATE,
      });

      return { data: entry };
    },

    async delete(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) return ctx.notFound();

      const existing = await strapi.entityService.findOne(UID, id, {
        populate: ['organization', 'organizationUser'],
      });
      if (!existing) return ctx.notFound();
      if (String(relId(existing.organization)) !== String(ctx.state.orgId)) return ctx.forbidden();

      const orgUserId = relId(existing.organizationUser);
      if (!assertSelfOrHrAdmin(ctx, orgUserId)) {
        return ctx.forbidden('You can only delete your own leave requests');
      }

      await strapi.entityService.delete(UID, id);
      return { data: { id } };
    },
  };
};
