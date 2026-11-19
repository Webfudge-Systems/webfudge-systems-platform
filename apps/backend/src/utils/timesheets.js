'use strict';

/**
 * Weekly timesheets (ticket W5). Time entries are per user / task / day; a timesheet is one user's
 * Monday-to-Sunday week. Submitted and approved weeks are locked (no entry changes); a rejected
 * week is editable again. Reports default to approved time only.
 */

const SHEET_UID = 'api::timesheet.timesheet';
const ENTRY_UID = 'api::timesheet.time-entry';
const TASK_UID = 'api::task.task';
const LOCKED = ['submitted', 'approved'];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));

/** 'YYYY-MM-DD' of the Monday on/before the given day (UTC date arithmetic on the calendar date). */
function weekStartOf(day) {
  const [y, m, d] = String(day).slice(0, 10).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7; // Monday = 0
  dt.setUTCDate(dt.getUTCDate() - dow);
  return dt.toISOString().slice(0, 10);
}

function weekDays(weekStart) {
  const [y, m, d] = weekStart.split('-').map(Number);
  return Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
}

const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());

async function findSheet(strapi, orgId, userId, weekStart) {
  const rows = await strapi.entityService.findMany(SHEET_UID, {
    filters: { organization: orgId, user: userId, weekStart },
    populate: { decidedBy: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] } },
    limit: 1,
  });
  return rows[0] || null;
}

async function getOrCreateSheet(strapi, orgId, userId, weekStart) {
  return (
    (await findSheet(strapi, orgId, userId, weekStart)) ||
    strapi.entityService.create(SHEET_UID, { data: { organization: orgId, user: userId, weekStart, status: 'draft' } })
  );
}

async function weekEntries(strapi, orgId, userId, weekStart) {
  const days = weekDays(weekStart);
  return strapi.entityService.findMany(ENTRY_UID, {
    filters: { organization: orgId, user: userId, date: { $gte: days[0], $lte: days[6] } },
    populate: {
      task: { fields: ['id', 'name'] },
      project: { fields: ['id', 'name'] },
    },
    sort: [{ date: 'asc' }, { id: 'asc' }],
    limit: 1000,
  });
}

async function refreshTotals(strapi, sheet, entries) {
  const total = round2(entries.reduce((a, e) => a + Number(e.hours || 0), 0));
  const billable = round2(entries.filter((e) => e.billable !== false).reduce((a, e) => a + Number(e.hours || 0), 0));
  if (Number(sheet.totalHours) !== total || Number(sheet.billableHours) !== billable) {
    await strapi.entityService.update(SHEET_UID, sheet.id, { data: { totalHours: total, billableHours: billable } });
  }
  return { totalHours: total, billableHours: billable };
}

async function taskProjectId(strapi, task) {
  const tp = relId(task.timeProject);
  if (tp) return tp;
  if (Array.isArray(task.projects) && task.projects.length) return relId(task.projects[0]);
  return null;
}

/** Keep task.hoursLogged (and project financials) in step with timesheet edits. */
async function bumpTaskHours(strapi, taskId, delta) {
  if (!taskId || !delta) return;
  const task = await strapi.entityService.findOne(TASK_UID, taskId, { fields: ['id', 'hoursLogged'], populate: { timeProject: { fields: ['id'] }, projects: { fields: ['id'] } } });
  if (!task) return;
  const next = Math.max(0, round2((parseFloat(task.hoursLogged) || 0) + delta));
  await strapi.entityService.update(TASK_UID, taskId, { data: { hoursLogged: next } });
  const projId = await taskProjectId(strapi, task);
  if (projId) {
    try {
      const { recomputeFinancials } = require('../api/project/controllers/project');
      await recomputeFinancials(projId);
    } catch (_) {
      /* best-effort */
    }
  }
}

/**
 * Add hours to a user's day on a task (used by the task timer and manual "log time").
 * Skipped silently when that week is locked. Does NOT touch task.hoursLogged (callers already did).
 */
async function recordTaskTime(strapi, { orgId, userId, task, hours, billable, date }) {
  const h = round2(hours);
  if (!orgId || !userId || !task?.id || !(h > 0)) return null;
  const day = date || new Date().toISOString().slice(0, 10);
  const weekStart = weekStartOf(day);
  const sheet = await getOrCreateSheet(strapi, orgId, userId, weekStart);
  if (LOCKED.includes(sheet.status)) return null;
  const existing = await strapi.entityService.findMany(ENTRY_UID, {
    filters: { organization: orgId, user: userId, task: task.id, date: day },
    limit: 1,
  });
  const projectId = await taskProjectId(strapi, task);
  let entry;
  if (existing[0]) {
    entry = await strapi.entityService.update(ENTRY_UID, existing[0].id, { data: { hours: round2(Number(existing[0].hours) + h) } });
  } else {
    entry = await strapi.entityService.create(ENTRY_UID, {
      data: {
        organization: orgId,
        user: userId,
        task: task.id,
        project: projectId,
        date: day,
        hours: h,
        billable: billable !== false,
        timesheet: sheet.id,
      },
    });
  }
  await refreshTotals(strapi, sheet, await weekEntries(strapi, orgId, userId, weekStart));
  return entry;
}

module.exports = {
  SHEET_UID,
  ENTRY_UID,
  TASK_UID,
  LOCKED,
  round2,
  relId,
  isDay,
  weekStartOf,
  weekDays,
  findSheet,
  getOrCreateSheet,
  weekEntries,
  refreshTotals,
  taskProjectId,
  bumpTaskHours,
  recordTaskTime,
};
