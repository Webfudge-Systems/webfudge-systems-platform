'use strict';

/**
 * Workload & capacity planner (W6).
 * GET /capacity?weekStart=YYYY-MM-DD&weeks=4&departmentId=&jobRole=
 *   → per active member: weekly capacity (hours), allocated hours per week (sum of estimates of their
 *     open tasks due that week), unestimated task count, and the tasks themselves.
 *   Overdue open tasks are counted in the first week (they still need doing).
 * PUT /capacity/members/:userId { weeklyCapacityHours?, jobRole? } — PM admin / manager only.
 * Managers (PM admin / manager role or PM projects manage) see everyone; members see only themselves.
 */

const { requireModuleAccess, canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../../../utils/rbac');

const TASK_UID = 'api::task.task';
const MEMBER_UID = 'api::organization-user.organization-user';
const OPEN = { $notIn: ['COMPLETED', 'CANCELLED'] };
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;

const isManager = (ctx) => isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'pm', 'projects', 'manage');

function mondayOf(day) {
  const [y, m, d] = String(day).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}
const addDays = (day, n) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};
const userName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ') || u?.username || u?.email || `User #${u?.id}`;

module.exports = {
  async plan(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'read');
    if (denied) return denied;
    const q = ctx.query || {};
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = mondayOf(/^\d{4}-\d{2}-\d{2}$/.test(q.weekStart || '') ? q.weekStart : today);
    const weeks = Math.min(8, Math.max(1, parseInt(q.weeks, 10) || 4));
    const weekStarts = Array.from({ length: weeks }, (_, i) => addDays(weekStart, i * 7));
    const end = addDays(weekStart, weeks * 7 - 1);
    const manager = isManager(ctx);

    const memberFilters = { organization: ctx.state.orgId, isActive: true };
    if (!manager) memberFilters.user = ctx.state.user.id;
    if (manager && q.departmentId) memberFilters.departments = { id: parseInt(q.departmentId, 10) || -1 };
    if (manager && q.jobRole) memberFilters.jobRole = String(q.jobRole);
    const members = await strapi.entityService.findMany(MEMBER_UID, {
      filters: memberFilters,
      populate: { user: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] }, role: { fields: ['id', 'name'] } },
      limit: 500,
    });
    const userIds = members.map((m) => m.user?.id).filter(Boolean);

    const tasks = userIds.length
      ? await strapi.entityService.findMany(TASK_UID, {
          filters: {
            organization: ctx.state.orgId,
            status: OPEN,
            assignee: { id: { $in: userIds } },
            $or: [{ scheduledDate: { $lte: end } }, { scheduledDate: { $null: true } }],
          },
          fields: ['id', 'name', 'status', 'priority', 'scheduledDate', 'startDate', 'estimatedHours'],
          populate: { assignee: { fields: ['id'] }, projects: { fields: ['id', 'name'] } },
          limit: 5000,
        })
      : [];

    const byUser = new Map(userIds.map((id) => [id, []]));
    for (const t of tasks) {
      const uid = t.assignee?.id;
      if (byUser.has(uid)) byUser.get(uid).push(t);
    }

    const rows = members
      .filter((m) => m.user?.id)
      .map((m) => {
        const capacity = m.weeklyCapacityHours == null ? 40 : Number(m.weeklyCapacityHours);
        const cells = weekStarts.map((ws) => ({ weekStart: ws, allocated: 0, unestimated: 0, tasks: [] }));
        const noDate = [];
        for (const t of byUser.get(m.user.id) || []) {
          const due = t.scheduledDate ? String(t.scheduledDate).slice(0, 10) : null;
          const row = {
            id: t.id,
            name: t.name,
            status: t.status,
            priority: t.priority,
            scheduledDate: due,
            estimatedHours: t.estimatedHours == null ? null : Number(t.estimatedHours),
            overdue: Boolean(due && due < today),
            project: t.projects?.[0] ? { id: t.projects[0].id, name: t.projects[0].name } : null,
          };
          if (!due) {
            noDate.push(row);
            continue;
          }
          let idx = weekStarts.findIndex((ws) => due >= ws && due <= addDays(ws, 6));
          if (idx === -1 && due < weekStart) idx = 0; // overdue work lands in the first week
          if (idx === -1) continue;
          const cell = cells[idx];
          cell.tasks.push(row);
          if (row.estimatedHours == null) cell.unestimated += 1;
          else cell.allocated += row.estimatedHours;
        }
        for (const c of cells) {
          c.allocated = r1(c.allocated);
          c.utilization = capacity > 0 ? Math.round((c.allocated / capacity) * 100) : null;
          c.state = capacity <= 0 ? 'off' : c.allocated > capacity ? 'over' : c.allocated >= capacity * 0.8 ? 'full' : 'ok';
        }
        return {
          userId: m.user.id,
          membershipId: m.id,
          name: userName(m.user),
          orgRole: m.role?.name || null,
          jobRole: m.jobRole || null,
          capacity,
          cells,
          noDate,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const jobRoles = manager
      ? [...new Set((await strapi.entityService.findMany(MEMBER_UID, { filters: { organization: ctx.state.orgId, isActive: true }, fields: ['jobRole'], limit: 500 })).map((m) => m.jobRole).filter(Boolean))].sort()
      : [];
    ctx.set('Cache-Control', 'no-store');
    return { data: { weekStarts, rows, jobRoles }, meta: { manager } };
  },

  async setMember(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    if (!isManager(ctx)) return ctx.forbidden('Only managers can change capacity');
    const userId = parseInt(ctx.params.userId, 10);
    if (Number.isNaN(userId)) return ctx.badRequest('Invalid user');
    const rows = await strapi.entityService.findMany(MEMBER_UID, { filters: { organization: ctx.state.orgId, user: userId }, limit: 1 });
    if (!rows[0]) return ctx.notFound('Not a member of this organization');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const data = {};
    if (body.weeklyCapacityHours !== undefined) {
      const h = Number(body.weeklyCapacityHours);
      if (!Number.isFinite(h) || h < 0 || h > 100) return ctx.badRequest('Weekly capacity must be between 0 and 100 hours');
      data.weeklyCapacityHours = r1(h);
    }
    if (body.jobRole !== undefined) data.jobRole = String(body.jobRole || '').trim().slice(0, 60) || null;
    if (!Object.keys(data).length) return ctx.badRequest('Nothing to update');
    const entry = await strapi.entityService.update(MEMBER_UID, rows[0].id, { data });
    return { data: { userId, weeklyCapacityHours: Number(entry.weeklyCapacityHours), jobRole: entry.jobRole || null } };
  },
};
