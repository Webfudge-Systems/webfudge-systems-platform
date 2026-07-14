'use strict';

const { makeBooksCrudController, relId } = require('../../../utils/books-crud');
const { assertSelfOrHrAdmin } = require('../../../utils/hr-self-scope');

const UID = 'api::attendance-record.attendance-record';
const ORG_USER_UID = 'api::organization-user.organization-user';
const PROFILE_UID = 'api::employee-profile.employee-profile';

const LIST_POPULATE = {
  organizationUser: { populate: ['user', 'primaryDepartment'] },
  employeeProfile: true,
};

const SHIFT_START_BY_ID = {
  morning: '09:00',
  evening: '14:00',
  night: '22:00',
};

function normalizeWorkShift(value) {
  const raw = String(value || 'morning').toLowerCase();
  return ['morning', 'evening', 'night'].includes(raw) ? raw : 'morning';
}

function parseAssignedShifts(source) {
  if (Array.isArray(source)) {
    return source.map(normalizeWorkShift).filter((id, index, list) => list.indexOf(id) === index);
  }
  return [];
}

function resolveWorkShiftForProfile(profile, requestedShift) {
  const primary = normalizeWorkShift(profile?.primaryShift || 'morning');
  const assigned = parseAssignedShifts(profile?.assignedShifts);
  const normalized = assigned.length ? assigned : [primary];
  if (!profile?.flexibleShift) return primary;
  const picked = normalizeWorkShift(requestedShift);
  return normalized.includes(picked) ? picked : primary;
}

function getShiftStart(workShift) {
  return SHIFT_START_BY_ID[normalizeWorkShift(workShift)] || SHIFT_START_BY_ID.morning;
}

function normalizePayload(body = {}) {
  return body.data || body;
}

function parseClockMinutes(value) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

function calcDurationMinutes(clockIn, clockOut) {
  const inMin = parseClockMinutes(clockIn);
  const outMin = parseClockMinutes(clockOut);
  if (inMin == null || outMin == null || outMin <= inMin) return 0;
  return outMin - inMin;
}

function isLateClockIn(clockIn, shiftStart = SHIFT_START) {
  const inMin = parseClockMinutes(clockIn);
  const startMin = parseClockMinutes(shiftStart);
  return inMin != null && startMin != null && inMin > startMin;
}

function normalizeStatus(value) {
  const raw = String(value || 'present').toLowerCase().replace(/\s+/g, '_');
  if (raw === 'on_leave' || raw === 'onleave') return 'on_leave';
  if (['present', 'wfh', 'absent'].includes(raw)) return raw;
  return 'present';
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
    populate: ['salaryStructure'],
  });
  return rows[0] || null;
}

async function syncOvertimeForAttendance(strapi, attendance, orgId, actorUserId) {
  if (!attendance?.organizationUser) return null;
  const orgUserId = relId(attendance.organizationUser) || attendance.organizationUser;
  const profile = await findProfileForOrgUser(strapi, orgUserId, orgId);
  const { syncOvertimeFromAttendance } = require('../../../utils/overtime-utils');
  return syncOvertimeFromAttendance(strapi, {
    attendance,
    profile,
    orgId,
    actorUserId,
  });
}

function buildAttendanceData(payload, orgId, orgUserId, profile, userId) {
  const attendanceDate = payload.attendanceDate;
  const status = normalizeStatus(payload.status);
  const clockIn = status === 'present' || status === 'wfh' ? String(payload.clockIn || '').trim() : '';
  const clockOut = status === 'present' || status === 'wfh' ? String(payload.clockOut || '').trim() : '';
  const durationMinutes =
    status === 'present' || status === 'wfh'
      ? Number(payload.durationMinutes || calcDurationMinutes(clockIn, clockOut) || 0)
      : 0;
  const workShift = resolveWorkShiftForProfile(profile, payload.workShift);
  const shiftStart = getShiftStart(workShift);

  return {
    attendanceDate,
    clockIn: clockIn || null,
    clockOut: clockOut || null,
    durationMinutes,
    status,
    workShift,
    location: String(payload.location || '').trim() || null,
    late: Boolean(payload.late) || (status === 'present' && isLateClockIn(clockIn, shiftStart)),
    notes: String(payload.notes || '').trim() || null,
    organizationUser: orgUserId,
    employeeProfile: profile?.id || null,
    organization: orgId,
    createdByUser: userId,
  };
}

const base = makeBooksCrudController(UID, {
  defaultPopulate: Object.keys(LIST_POPULATE),
  extraFilters: (q) => {
    const filters = {};
    if (q.organizationUser) filters.organizationUser = q.organizationUser;
    if (q.status) filters.status = normalizeStatus(q.status);
    if (q.date) filters.attendanceDate = q.date;
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
      const limit = Math.min(parseInt(q.limit || '200', 10), 500);
      const filters = { organization: ctx.state.orgId };

      if (q.organizationUser) filters.organizationUser = q.organizationUser;
      if (q.status) filters.status = normalizeStatus(q.status);
      if (q.date) {
        filters.attendanceDate = q.date;
      } else if (q.from || q.to) {
        filters.attendanceDate = {};
        if (q.from) filters.attendanceDate.$gte = q.from;
        if (q.to) filters.attendanceDate.$lte = q.to;
      }

      const [results, total] = await Promise.all([
        strapi.entityService.findMany(UID, {
          filters,
          start: (page - 1) * limit,
          limit,
          sort: q.sort || { attendanceDate: 'desc' },
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

      const orgUser = await resolveOrgUserOr403(strapi, orgUserId, ctx.state.orgId);
      if (!orgUser) return ctx.badRequest('Invalid employee for this organization');

      if (!assertSelfOrHrAdmin(ctx, orgUserId)) {
        return ctx.forbidden('You can only mark attendance for yourself');
      }

      const profile = await findProfileForOrgUser(strapi, orgUserId, ctx.state.orgId);
      const data = buildAttendanceData(payload, ctx.state.orgId, orgUserId, profile, ctx.state.user.id);

      const existing = await strapi.entityService.findMany(UID, {
        filters: {
          organization: ctx.state.orgId,
          organizationUser: orgUserId,
          attendanceDate: payload.attendanceDate,
        },
        limit: 1,
      });

      if (existing.length) {
        const entry = await strapi.entityService.update(UID, existing[0].id, {
          data: {
            clockIn: data.clockIn,
            clockOut: data.clockOut,
            durationMinutes: data.durationMinutes,
            status: data.status,
            workShift: data.workShift,
            location: data.location,
            late: data.late,
            notes: data.notes,
          },
          populate: LIST_POPULATE,
        });
        await syncOvertimeForAttendance(strapi, entry, ctx.state.orgId, ctx.state.user.id);
        return { data: entry };
      }

      const entry = await strapi.entityService.create(UID, {
        data,
        populate: LIST_POPULATE,
      });
      await syncOvertimeForAttendance(strapi, entry, ctx.state.orgId, ctx.state.user.id);
      return { data: entry };
    },

    async update(ctx) {
      if (!ctx.state.user) return ctx.unauthorized();
      if (!ctx.state.orgId) return ctx.forbidden('No active organization');

      const existing = await strapi.entityService.findOne(UID, ctx.params.id, { populate: ['organization'] });
      if (!existing) return ctx.notFound();
      if (String(relId(existing.organization)) !== String(ctx.state.orgId)) return ctx.forbidden();

      const payload = normalizePayload(ctx.request?.body || {});
      const status = normalizeStatus(payload.status ?? existing.status);
      const clockIn = payload.clockIn !== undefined ? String(payload.clockIn || '').trim() : existing.clockIn;
      const clockOut = payload.clockOut !== undefined ? String(payload.clockOut || '').trim() : existing.clockOut;
      const durationMinutes =
        payload.durationMinutes !== undefined
          ? Number(payload.durationMinutes || 0)
          : calcDurationMinutes(clockIn, clockOut) || existing.durationMinutes;
      const orgUserId = relId(existing.organizationUser);
      const profile = orgUserId ? await findProfileForOrgUser(strapi, orgUserId, ctx.state.orgId) : null;
      const workShift = resolveWorkShiftForProfile(profile, payload.workShift ?? existing.workShift);
      const shiftStart = getShiftStart(workShift);

      const entry = await strapi.entityService.update(UID, ctx.params.id, {
        data: {
          ...(payload.attendanceDate ? { attendanceDate: payload.attendanceDate } : {}),
          clockIn: status === 'present' || status === 'wfh' ? clockIn : null,
          clockOut: status === 'present' || status === 'wfh' ? clockOut : null,
          durationMinutes: status === 'present' || status === 'wfh' ? durationMinutes : 0,
          status,
          workShift,
          ...(payload.location !== undefined ? { location: String(payload.location || '').trim() || null } : {}),
          late:
            payload.late !== undefined
              ? Boolean(payload.late)
              : status === 'present' && isLateClockIn(clockIn, shiftStart),
          ...(payload.notes !== undefined ? { notes: String(payload.notes || '').trim() || null } : {}),
        },
        populate: LIST_POPULATE,
      });

      await syncOvertimeForAttendance(strapi, entry, ctx.state.orgId, ctx.state.user.id);

      return { data: entry };
    },
  };
};
