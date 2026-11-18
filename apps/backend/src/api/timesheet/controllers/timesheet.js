'use strict';

/**
 * Weekly timesheets (W5).
 * - Everyone with PM tasks write access keeps their own timesheet (grid of task × day).
 * - Approvers (PM org admin / manager role, or PM projects manage) see everyone's submitted weeks,
 *   approve or reject them, and run the org-wide hours report. Others only see their own numbers.
 * - Submitted and approved weeks are locked; rejecting unlocks the week for edits.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { requireModuleAccess, canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../../../utils/rbac');
const { notifyUsers } = require('../../../utils/notification-emitter');
const T = require('../../../utils/timesheets');

const MAX_RANGE_DAYS = 400;

function canApprove(ctx) {
  return isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'pm', 'projects', 'manage');
}

function guard(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  return true;
}

const userLabel = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || `User #${u.id}` : null);

function serializeSheet(sheet) {
  if (!sheet) return null;
  return {
    id: sheet.id,
    weekStart: sheet.weekStart,
    status: sheet.status,
    submittedAt: sheet.submittedAt,
    decidedAt: sheet.decidedAt,
    decisionNote: sheet.decisionNote,
    decidedBy: sheet.decidedBy ? { id: sheet.decidedBy.id, name: userLabel(sheet.decidedBy) } : null,
    totalHours: Number(sheet.totalHours) || 0,
    billableHours: Number(sheet.billableHours) || 0,
  };
}

function serializeEntry(e) {
  return {
    id: e.id,
    date: e.date,
    hours: Number(e.hours) || 0,
    billable: e.billable !== false,
    note: e.note || '',
    task: e.task ? { id: e.task.id, name: e.task.name } : null,
    project: e.project ? { id: e.project.id, name: e.project.name } : null,
  };
}

async function loadOrgTask(strapi, ctx, taskId) {
  const id = parseInt(String(taskId), 10);
  if (Number.isNaN(id)) return null;
  const task = await strapi.entityService.findOne(T.TASK_UID, id, {
    fields: ['id', 'name', 'billable'],
    populate: { organization: { fields: ['id'] }, timeProject: { fields: ['id'] }, projects: { fields: ['id'] } },
  });
  if (!task || orgIdFromRelation(task.organization) !== ctx.state.orgId) return null;
  return task;
}

async function loadOrgSheet(strapi, ctx) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const sheet = await strapi.entityService.findOne(T.SHEET_UID, id, {
    populate: { organization: { fields: ['id'] }, user: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] } },
  });
  if (!sheet || orgIdFromRelation(sheet.organization) !== ctx.state.orgId) return null;
  return sheet;
}

function parseRange(q) {
  const from = T.isDay(q.from) ? q.from : null;
  const to = T.isDay(q.to) ? q.to : null;
  if (!from || !to) return { error: 'from and to (YYYY-MM-DD) are required' };
  if (from > to) return { error: '"from" must be before "to"' };
  if ((new Date(`${to}T00:00:00Z`) - new Date(`${from}T00:00:00Z`)) / 86400000 > MAX_RANGE_DAYS) return { error: 'Pick a range of about a year or less' };
  return { from, to };
}

/** Entries in a date range with their week status, project and client. */
async function rangeEntries(strapi, orgId, { from, to, userId }) {
  const rows = await strapi.entityService.findMany(T.ENTRY_UID, {
    filters: { organization: orgId, date: { $gte: from, $lte: to }, ...(userId ? { user: userId } : {}) },
    populate: {
      user: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
      task: { fields: ['id', 'name'] },
      project: { fields: ['id', 'name'], populate: { clientAccount: { fields: ['id', 'companyName'] } } },
      timesheet: { fields: ['id', 'status'] },
    },
    sort: [{ date: 'asc' }, { id: 'asc' }],
    limit: 20000,
  });
  return rows.map((e) => ({
    id: e.id,
    date: e.date,
    hours: Number(e.hours) || 0,
    billable: e.billable !== false,
    note: e.note || '',
    status: e.timesheet?.status || 'draft',
    user: e.user ? { id: e.user.id, name: userLabel(e.user) } : null,
    task: e.task ? { id: e.task.id, name: e.task.name } : null,
    project: e.project ? { id: e.project.id, name: e.project.name } : null,
    client: e.project?.clientAccount ? { id: e.project.clientAccount.id, name: e.project.clientAccount.companyName } : null,
  }));
}

module.exports = createCoreController(T.SHEET_UID, ({ strapi }) => ({
  /** GET /timesheets/week?weekStart=YYYY-MM-DD[&userId=] */
  async week(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'read');
    if (denied) return denied;
    const q = ctx.query || {};
    const weekStart = T.weekStartOf(T.isDay(q.weekStart) ? q.weekStart : new Date().toISOString().slice(0, 10));
    const me = Number(ctx.state.user.id);
    const userId = q.userId ? parseInt(q.userId, 10) : me;
    if (Number.isNaN(userId)) return ctx.badRequest('Invalid userId');
    if (userId !== me && !canApprove(ctx)) return ctx.forbidden('You can only view your own timesheet');

    const [sheet, entries] = await Promise.all([
      T.findSheet(strapi, ctx.state.orgId, userId, weekStart),
      T.weekEntries(strapi, ctx.state.orgId, userId, weekStart),
    ]);
    const status = sheet?.status || 'draft';
    ctx.set('Cache-Control', 'no-store');
    return {
      data: {
        weekStart,
        days: T.weekDays(weekStart),
        sheet: serializeSheet(sheet) || { weekStart, status: 'draft', totalHours: 0, billableHours: 0 },
        entries: entries.map(serializeEntry),
        canEdit: userId === me && !T.LOCKED.includes(status) && canAccess(ctx, 'pm', 'tasks', 'write'),
        canApprove: canApprove(ctx),
      },
    };
  },

  /** PUT /timesheets/cell { date, taskId, hours, billable?, note? } — sets (not adds) my hours for that task/day. */
  async setCell(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'write');
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    if (!T.isDay(body.date)) return ctx.badRequest('date (YYYY-MM-DD) is required');
    const hours = T.round2(body.hours === '' || body.hours == null ? 0 : body.hours);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) return ctx.badRequest('Hours must be between 0 and 24');
    const task = await loadOrgTask(strapi, ctx, body.taskId);
    if (!task) return ctx.badRequest('Pick a task from this organization');

    const orgId = ctx.state.orgId;
    const userId = Number(ctx.state.user.id);
    const weekStart = T.weekStartOf(body.date);
    const sheet = await T.getOrCreateSheet(strapi, orgId, userId, weekStart);
    if (T.LOCKED.includes(sheet.status)) {
      return ctx.badRequest(sheet.status === 'approved' ? 'This week is approved and locked' : 'This week is submitted. Ask your manager to reject it to make changes');
    }

    const existing = await strapi.entityService.findMany(T.ENTRY_UID, {
      filters: { organization: orgId, user: userId, task: task.id, date: body.date },
      limit: 5,
    });
    const before = existing.reduce((a, e) => a + Number(e.hours || 0), 0);
    const dayEntries = await strapi.entityService.findMany(T.ENTRY_UID, {
      filters: { organization: orgId, user: userId, date: body.date },
      limit: 200,
    });
    const dayTotal = dayEntries.reduce((a, e) => a + Number(e.hours || 0), 0) - before + hours;
    if (dayTotal > 24) return ctx.badRequest('More than 24 hours on one day');

    const billable = typeof body.billable === 'boolean' ? body.billable : existing[0] ? existing[0].billable !== false : task.billable !== false;
    const note = body.note !== undefined ? String(body.note || '').slice(0, 250) : undefined;
    if (hours === 0) {
      for (const e of existing) await strapi.entityService.delete(T.ENTRY_UID, e.id);
    } else if (existing[0]) {
      await strapi.entityService.update(T.ENTRY_UID, existing[0].id, { data: { hours, billable, ...(note !== undefined ? { note } : {}), timesheet: sheet.id } });
      for (const extra of existing.slice(1)) await strapi.entityService.delete(T.ENTRY_UID, extra.id);
    } else {
      await strapi.entityService.create(T.ENTRY_UID, {
        data: {
          organization: orgId,
          user: userId,
          task: task.id,
          project: await T.taskProjectId(strapi, task),
          date: body.date,
          hours,
          billable,
          note: note || null,
          timesheet: sheet.id,
        },
      });
    }
    await T.bumpTaskHours(strapi, task.id, T.round2(hours - before));
    const entries = await T.weekEntries(strapi, orgId, userId, weekStart);
    const totals = await T.refreshTotals(strapi, sheet, entries);
    // W14: alert account managers straight away if this pushes a retainer past 80% / 100%
    require('../../../utils/retainers').checkRetainerAlerts(strapi, { orgId }).catch(() => {});
    if (sheet.status === 'rejected') await strapi.entityService.update(T.SHEET_UID, sheet.id, { data: { status: 'draft' } });
    return { data: { weekStart, entries: entries.map(serializeEntry), ...totals } };
  },

  /** PUT /timesheets/row { weekStart, taskId, billable } — billable flag for a whole task row in my week. */
  async setRow(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'write');
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    if (!T.isDay(body.weekStart) || typeof body.billable !== 'boolean') return ctx.badRequest('weekStart and billable are required');
    const task = await loadOrgTask(strapi, ctx, body.taskId);
    if (!task) return ctx.badRequest('Pick a task from this organization');
    const orgId = ctx.state.orgId;
    const userId = Number(ctx.state.user.id);
    const weekStart = T.weekStartOf(body.weekStart);
    const sheet = await T.getOrCreateSheet(strapi, orgId, userId, weekStart);
    if (T.LOCKED.includes(sheet.status)) return ctx.badRequest('This week is locked');
    const days = T.weekDays(weekStart);
    const rows = await strapi.entityService.findMany(T.ENTRY_UID, {
      filters: { organization: orgId, user: userId, task: task.id, date: { $gte: days[0], $lte: days[6] } },
      limit: 50,
    });
    for (const e of rows) await strapi.entityService.update(T.ENTRY_UID, e.id, { data: { billable: body.billable } });
    const entries = await T.weekEntries(strapi, orgId, userId, weekStart);
    const totals = await T.refreshTotals(strapi, sheet, entries);
    return { data: { weekStart, entries: entries.map(serializeEntry), ...totals } };
  },

  /** POST /timesheets/submit { weekStart } */
  async submit(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'write');
    if (denied) return denied;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    if (!T.isDay(body.weekStart)) return ctx.badRequest('weekStart is required');
    const orgId = ctx.state.orgId;
    const userId = Number(ctx.state.user.id);
    const weekStart = T.weekStartOf(body.weekStart);
    const sheet = await T.getOrCreateSheet(strapi, orgId, userId, weekStart);
    if (T.LOCKED.includes(sheet.status)) return ctx.badRequest(`This week is already ${sheet.status}`);
    const entries = await T.weekEntries(strapi, orgId, userId, weekStart);
    const totals = await T.refreshTotals(strapi, sheet, entries);
    if (!totals.totalHours) return ctx.badRequest('Add some hours before submitting');
    for (const e of entries) {
      if (T.relId(e.timesheet) !== sheet.id) await strapi.entityService.update(T.ENTRY_UID, e.id, { data: { timesheet: sheet.id } });
    }
    const updated = await strapi.entityService.update(T.SHEET_UID, sheet.id, {
      data: { status: 'submitted', submittedAt: new Date().toISOString(), decisionNote: null, decidedAt: null, decidedBy: null },
    });
    return { data: serializeSheet({ ...updated, ...totals }) };
  },

  /** GET /timesheets/approvals?status=submitted|approved|rejected|all — approvers only. */
  async approvals(ctx) {
    if (!guard(ctx)) return;
    if (!canApprove(ctx)) return ctx.forbidden('Only managers can review timesheets');
    const status = String(ctx.query?.status || 'submitted');
    const filters = { organization: ctx.state.orgId };
    if (status !== 'all') filters.status = status;
    else filters.status = { $in: ['submitted', 'approved', 'rejected'] };
    const rows = await strapi.entityService.findMany(T.SHEET_UID, {
      filters,
      populate: {
        user: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
        decidedBy: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
      },
      sort: [{ weekStart: 'desc' }, { submittedAt: 'desc' }],
      limit: 200,
    });
    ctx.set('Cache-Control', 'no-store');
    return { data: rows.map((s) => ({ ...serializeSheet(s), user: s.user ? { id: s.user.id, name: userLabel(s.user) } : null })) };
  },

  async approve(ctx) {
    if (!guard(ctx)) return;
    if (!canApprove(ctx)) return ctx.forbidden('Only managers can approve timesheets');
    const sheet = await loadOrgSheet(strapi, ctx);
    if (!sheet) return ctx.notFound('Timesheet not found');
    if (sheet.status !== 'submitted') return ctx.badRequest(`Only submitted weeks can be approved (this one is ${sheet.status})`);
    if (T.relId(sheet.user) === Number(ctx.state.user.id) && !isPmOrgAdminRole(ctx)) {
      return ctx.forbidden('Ask another manager to approve your own timesheet');
    }
    const updated = await strapi.entityService.update(T.SHEET_UID, sheet.id, {
      data: { status: 'approved', decidedAt: new Date().toISOString(), decidedBy: ctx.state.user.id, decisionNote: null },
    });
    await notifyUsers(strapi, {
      userIds: [T.relId(sheet.user)],
      organizationId: ctx.state.orgId,
      type: 'success',
      title: `Timesheet approved: week of ${sheet.weekStart}`,
      message: `${Number(sheet.totalHours) || 0} h approved`,
      data: { href: `/timesheets?week=${sheet.weekStart}` },
    });
    return { data: serializeSheet(updated) };
  },

  async reject(ctx) {
    if (!guard(ctx)) return;
    if (!canApprove(ctx)) return ctx.forbidden('Only managers can reject timesheets');
    const sheet = await loadOrgSheet(strapi, ctx);
    if (!sheet) return ctx.notFound('Timesheet not found');
    if (!['submitted', 'approved'].includes(sheet.status)) return ctx.badRequest(`This week is ${sheet.status}`);
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const note = String(body.note || '').trim().slice(0, 1000);
    if (!note) return ctx.badRequest('Tell them what to fix');
    const updated = await strapi.entityService.update(T.SHEET_UID, sheet.id, {
      data: { status: 'rejected', decidedAt: new Date().toISOString(), decidedBy: ctx.state.user.id, decisionNote: note },
    });
    await notifyUsers(strapi, {
      userIds: [T.relId(sheet.user)],
      organizationId: ctx.state.orgId,
      type: 'warning',
      title: `Timesheet sent back: week of ${sheet.weekStart}`,
      message: note,
      data: { href: `/timesheets?week=${sheet.weekStart}` },
    });
    return { data: serializeSheet(updated) };
  },

  /**
   * GET /timesheets/report?from&to&groupBy=person|project|client&status=approved|all[&userId=]
   * Approved time only unless status=all. Non-approvers only get their own hours.
   */
  async report(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'read');
    if (denied) return denied;
    const q = ctx.query || {};
    const range = parseRange(q);
    if (range.error) return ctx.badRequest(range.error);
    const groupBy = ['person', 'project', 'client'].includes(q.groupBy) ? q.groupBy : 'person';
    const approver = canApprove(ctx);
    const userId = approver ? (q.userId ? parseInt(q.userId, 10) || null : null) : Number(ctx.state.user.id);
    let entries = await rangeEntries(strapi, ctx.state.orgId, { ...range, userId });
    if (q.status !== 'all') entries = entries.filter((e) => e.status === 'approved');

    const keyOf = {
      person: (e) => [e.user?.id || 0, e.user?.name || 'Unknown'],
      project: (e) => [e.project?.id || 0, e.project?.name || 'No project'],
      client: (e) => [e.client?.id || 0, e.client?.name || 'No client'],
    }[groupBy];
    const groups = new Map();
    for (const e of entries) {
      const [k, label] = keyOf(e);
      const g = groups.get(k) || { key: k, label, hours: 0, billableHours: 0, nonBillableHours: 0 };
      g.hours += e.hours;
      if (e.billable) g.billableHours += e.hours;
      else g.nonBillableHours += e.hours;
      groups.set(k, g);
    }
    const rows = [...groups.values()]
      .map((g) => ({
        ...g,
        hours: T.round2(g.hours),
        billableHours: T.round2(g.billableHours),
        nonBillableHours: T.round2(g.nonBillableHours),
        billablePct: g.hours ? Math.round((g.billableHours / g.hours) * 100) : 0,
      }))
      .sort((a, b) => b.hours - a.hours);
    const totals = rows.reduce(
      (a, r) => ({ hours: T.round2(a.hours + r.hours), billableHours: T.round2(a.billableHours + r.billableHours), nonBillableHours: T.round2(a.nonBillableHours + r.nonBillableHours) }),
      { hours: 0, billableHours: 0, nonBillableHours: 0 }
    );
    ctx.set('Cache-Control', 'no-store');
    return { data: { rows, totals, groupBy, ...range }, meta: { scope: approver ? 'org' : 'own', status: q.status === 'all' ? 'all' : 'approved' } };
  },

  /** GET /timesheets/entries?from&to&status=approved|all[&userId=] — raw rows for CSV export. */
  async entries(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'read');
    if (denied) return denied;
    const q = ctx.query || {};
    const range = parseRange(q);
    if (range.error) return ctx.badRequest(range.error);
    const approver = canApprove(ctx);
    const userId = approver ? (q.userId ? parseInt(q.userId, 10) || null : null) : Number(ctx.state.user.id);
    let rows = await rangeEntries(strapi, ctx.state.orgId, { ...range, userId });
    if (q.status !== 'all') rows = rows.filter((e) => e.status === 'approved');
    ctx.set('Cache-Control', 'no-store');
    return { data: rows };
  },
}));
