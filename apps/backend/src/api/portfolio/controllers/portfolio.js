'use strict';

/**
 * GET /portfolio?clientAccountId=&managerId=&status=active|all  (W11)
 * Every project the user can see, with:
 *   - progress: % of tasks completed, overdue open tasks, schedule elapsed %
 *   - health: on_track / at_risk / off_track (+ the reasons)
 *   - budget burn: hours budget vs hours logged, or amount budget vs hours × hourly rate
 *   - billable hours (task time) and approved timesheet hours (W5)
 *   - upcoming milestones (task type "milestone", next 30 days)
 */

const { requireModuleAccess } = require('../../../utils/rbac');
const { buildProjectVisibilityFilters } = require('../../../utils/workspaces');

const PROJECT_UID = 'api::project.project';
const TASK_UID = 'api::task.task';
const ENTRY_UID = 'api::timesheet.time-entry';
const DONE = ['COMPLETED', 'CANCELLED'];
const CLOSED_PROJECT = ['COMPLETED', 'CANCELLED', 'ARCHIVED'];
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : null);
const userName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email : null);

function health({ complete, elapsed, overdue, burn, ended }) {
  const reasons = [];
  let level = 0; // 0 on track, 1 at risk, 2 off track
  const bump = (l, why) => {
    level = Math.max(level, l);
    reasons.push(why);
  };
  if (ended && complete < 100) bump(2, 'Past its end date');
  if (overdue >= 3) bump(2, `${overdue} overdue tasks`);
  else if (overdue > 0) bump(1, `${overdue} overdue task${overdue === 1 ? '' : 's'}`);
  if (elapsed != null && complete != null) {
    const gap = elapsed - complete;
    if (gap > 30) bump(2, `${gap}% behind schedule`);
    else if (gap > 15) bump(1, `${gap}% behind schedule`);
  }
  if (burn != null) {
    if (burn > 100) bump(2, `Budget ${burn}% used`);
    else if (burn >= 90 || (elapsed != null && burn > elapsed + 20)) bump(1, `Budget ${burn}% used`);
  }
  return { status: ['on_track', 'at_risk', 'off_track'][level], reasons };
}

module.exports = {
  async overview(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'read');
    if (denied) return denied;
    const q = ctx.query || {};
    // W1: project rules + workspace membership
    const filters = await buildProjectVisibilityFilters(strapi, ctx, ctx.state.orgId, ctx.state.user.id);
    if (q.clientAccountId) filters.clientAccount = { id: parseInt(q.clientAccountId, 10) || -1 };
    if (q.managerId) filters.projectManager = { id: parseInt(q.managerId, 10) || -1 };

    let projects = await strapi.entityService.findMany(PROJECT_UID, {
      filters,
      populate: {
        clientAccount: { fields: ['id', 'companyName'] },
        projectManager: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
      },
      sort: [{ name: 'asc' }],
      limit: 1000,
    });
    if (q.status !== 'all') projects = projects.filter((p) => !CLOSED_PROJECT.includes(String(p.status || '').toUpperCase()));
    const ids = projects.map((p) => p.id);
    if (!ids.length) return { data: { projects: [], summary: { total: 0 }, clients: [], managers: [] } };

    const [tasks, entries] = await Promise.all([
      strapi.entityService.findMany(TASK_UID, {
        filters: { organization: ctx.state.orgId, projects: { id: { $in: ids } } },
        fields: ['id', 'name', 'status', 'scheduledDate', 'hoursLogged', 'billable', 'taskType'],
        populate: { projects: { fields: ['id'] } },
        limit: 20000,
      }),
      strapi.contentTypes[ENTRY_UID]
        ? strapi.entityService.findMany(ENTRY_UID, {
            filters: { organization: ctx.state.orgId, project: { id: { $in: ids } } },
            fields: ['hours', 'billable'],
            populate: { project: { fields: ['id'] }, timesheet: { fields: ['status'] } },
            limit: 50000,
          })
        : Promise.resolve([]),
    ]);

    const today = new Date().toISOString().slice(0, 10);
    const in30 = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
    const byProject = new Map(ids.map((id) => [id, { tasks: [], approvedHours: 0, approvedBillable: 0 }]));
    for (const t of tasks) for (const p of t.projects || []) byProject.get(p.id)?.tasks.push(t);
    for (const e of entries) {
      if (e.timesheet?.status !== 'approved') continue;
      const b = byProject.get(e.project?.id);
      if (!b) continue;
      b.approvedHours += Number(e.hours) || 0;
      if (e.billable !== false) b.approvedBillable += Number(e.hours) || 0;
    }

    const rows = projects.map((p) => {
      const { tasks: ts, approvedHours, approvedBillable } = byProject.get(p.id);
      const total = ts.length;
      const done = ts.filter((t) => t.status === 'COMPLETED').length;
      const overdue = ts.filter((t) => !DONE.includes(t.status) && t.scheduledDate && String(t.scheduledDate).slice(0, 10) < today).length;
      const hoursLogged = r1(ts.reduce((a, t) => a + (Number(t.hoursLogged) || 0), 0));
      const billableHours = r1(ts.filter((t) => t.billable).reduce((a, t) => a + (Number(t.hoursLogged) || 0), 0));
      const complete = total ? pct(done, total) : null;
      const start = p.startDate ? new Date(p.startDate).getTime() : null;
      const end = p.endDate ? new Date(p.endDate).getTime() : null;
      const now = Date.now();
      const elapsed = start && end && end > start ? Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100))) : null;
      const ended = Boolean(end && now > end);

      let budget = null;
      const budgetAmount = Number(p.budgetAmount) || Number(p.budget) || 0;
      if (budgetAmount > 0) {
        if (p.budgetType === 'hours') {
          budget = { type: 'hours', budget: budgetAmount, used: hoursLogged, burn: pct(hoursLogged, budgetAmount) };
        } else {
          const used = Math.round(hoursLogged * (Number(p.hourlyRate) || 0));
          budget = { type: 'amount', budget: budgetAmount, used, burn: p.hourlyRate ? pct(used, budgetAmount) : null, currency: p.currency || 'INR' };
        }
      }
      const milestones = ts
        .filter((t) => t.taskType === 'milestone' && !DONE.includes(t.status) && t.scheduledDate && String(t.scheduledDate).slice(0, 10) <= in30)
        .map((t) => ({ id: t.id, name: t.name, due: String(t.scheduledDate).slice(0, 10), overdue: String(t.scheduledDate).slice(0, 10) < today }))
        .sort((a, b) => a.due.localeCompare(b.due))
        .slice(0, 3);
      const h = health({ complete: complete ?? 0, elapsed, overdue, burn: budget?.burn ?? null, ended });
      return {
        id: p.id,
        slug: p.slug || null,
        documentId: p.documentId,
        name: p.name,
        status: p.status || null,
        client: p.clientAccount ? { id: p.clientAccount.id, name: p.clientAccount.companyName } : null,
        manager: p.projectManager ? { id: p.projectManager.id, name: userName(p.projectManager) } : null,
        startDate: p.startDate,
        endDate: p.endDate,
        tasks: { total, done, overdue },
        complete,
        elapsed,
        hoursLogged,
        billableHours,
        approvedHours: r1(approvedHours),
        approvedBillableHours: r1(approvedBillable),
        budget,
        milestones,
        health: h.status,
        healthReasons: h.reasons,
      };
    });

    const count = (s) => rows.filter((r) => r.health === s).length;
    const uniq = (arr) => [...new Map(arr.filter(Boolean).map((x) => [x.id, x])).values()].sort((a, b) => a.name.localeCompare(b.name));
    ctx.set('Cache-Control', 'no-store');
    return {
      data: {
        projects: rows,
        summary: {
          total: rows.length,
          onTrack: count('on_track'),
          atRisk: count('at_risk'),
          offTrack: count('off_track'),
          overdueTasks: rows.reduce((a, r) => a + r.tasks.overdue, 0),
          hoursLogged: r1(rows.reduce((a, r) => a + r.hoursLogged, 0)),
          billableHours: r1(rows.reduce((a, r) => a + r.billableHours, 0)),
          upcomingMilestones: rows.reduce((a, r) => a + r.milestones.length, 0),
        },
        clients: uniq(rows.map((r) => r.client)),
        managers: uniq(rows.map((r) => r.manager)),
      },
    };
  },
};
