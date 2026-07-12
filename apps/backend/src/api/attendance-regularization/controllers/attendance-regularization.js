'use strict';

const { makeBooksCrudController, relId } = require('../../../utils/books-crud');
const { assertSelfOrHrAdmin, isHrAdmin } = require('../../../utils/hr-self-scope');

const UID = 'api::attendance-regularization.attendance-regularization';
const ORG_USER_UID = 'api::organization-user.organization-user';
const PROFILE_UID = 'api::employee-profile.employee-profile';
const ATTENDANCE_UID = 'api::attendance-record.attendance-record';
const { syncOvertimeFromAttendance } = require('../../../utils/overtime-utils');

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
      if (!payload.attendanceDate) return ctx.badRequest('attendanceDate is required');
      if (!String(payload.reason || '').trim()) return ctx.badRequest('reason is required');

      if (!assertSelfOrHrAdmin(ctx, orgUserId)) {
        return ctx.forbidden('You can only submit regularization for yourself');
      }

      const orgUser = await resolveOrgUserOr403(strapi, orgUserId, ctx.state.orgId);
      if (!orgUser) return ctx.badRequest('Invalid employee for this organization');

      const entry = await strapi.entityService.create(UID, {
        data: {
          attendanceDate: payload.attendanceDate,
          requestedStatus: String(payload.requestedStatus || 'present').toLowerCase() === 'wfh' ? 'wfh' : 'present',
          clockIn: String(payload.clockIn || '').trim() || null,
          clockOut: String(payload.clockOut || '').trim() || null,
          reason: String(payload.reason || '').trim(),
          status: 'pending',
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
      if (!isHrAdmin(ctx)) return ctx.forbidden('Only HR can approve regularization requests');

      const id = Number(ctx.params.id);
      if (!Number.isFinite(id)) return ctx.notFound();

      const existing = await strapi.entityService.findOne(UID, id, {
        populate: ['organization', 'organizationUser'],
      });
      if (!existing) return ctx.notFound();
      if (String(relId(existing.organization)) !== String(ctx.state.orgId)) return ctx.forbidden();
      if (existing.status !== 'pending') return ctx.badRequest('Only pending requests can be approved');

      const payload = normalizePayload(ctx.request?.body || {});
      const orgUserId = relId(existing.organizationUser);

      const entry = await strapi.entityService.update(UID, id, {
        data: {
          status: 'approved',
          hrComment: String(payload.hrComment || '').trim() || null,
          reviewedByUser: ctx.state.user.id,
        },
        populate: LIST_POPULATE,
      });

      const attendanceDate = existing.attendanceDate;
      const requestedStatus = existing.requestedStatus || 'present';
      const profile = await strapi.entityService.findMany(PROFILE_UID, {
        filters: { organizationUser: orgUserId, organization: ctx.state.orgId },
        limit: 1,
        populate: ['salaryStructure'],
      });
      const employeeProfile = profile[0] || null;
      const existingAttendance = await strapi.entityService.findMany(ATTENDANCE_UID, {
        filters: {
          organization: ctx.state.orgId,
          organizationUser: orgUserId,
          attendanceDate,
        },
        limit: 1,
      });

      const attendanceData = {
        attendanceDate,
        status: requestedStatus,
        clockIn: existing.clockIn || null,
        clockOut: existing.clockOut || null,
        workShift: employeeProfile?.primaryShift || 'morning',
        organizationUser: orgUserId,
        organization: ctx.state.orgId,
        notes: `Regularization approved: ${existing.reason || ''}`.trim(),
        createdByUser: ctx.state.user.id,
      };

      let attendanceEntry;
      if (existingAttendance.length) {
        attendanceEntry = await strapi.entityService.update(ATTENDANCE_UID, existingAttendance[0].id, {
          data: attendanceData,
        });
      } else {
        attendanceEntry = await strapi.entityService.create(ATTENDANCE_UID, { data: attendanceData });
      }

      await syncOvertimeFromAttendance(strapi, {
        attendance: attendanceEntry,
        profile: employeeProfile,
        orgId: ctx.state.orgId,
        actorUserId: ctx.state.user.id,
      });

      return { data: entry };
    },

    async reject(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');
      if (!isHrAdmin(ctx)) return ctx.forbidden('Only HR can reject regularization requests');

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
          hrComment: String(payload.hrComment || payload.rejectionReason || '').trim() || null,
          reviewedByUser: ctx.state.user.id,
        },
        populate: LIST_POPULATE,
      });

      return { data: entry };
    },
  };
};
