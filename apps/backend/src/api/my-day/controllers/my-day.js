'use strict';

/**
 * W21 My Day + Ask Work (SaaS only).
 *
 * GET  /my-day?date=YYYY-MM-DD&tzOffset=-330   → saved plan for that day (generated on first open)
 * POST /my-day/plan { date, tzOffset, overrides?, reset? } → re-plan with the deterministic scheduler
 *      overrides: { order: [taskId], excluded: [taskId], pinned: [{ taskId, start }], workStart, workEnd }
 * POST /my-day/ask { question, language?, history? } → Ask Work (Fudge AI; read-only tools, PM RBAC)
 *
 * Inputs: the user's open tasks (due date, priority, estimate, W2 dependsOn), their meetings that day,
 * and their daily capacity (W6 weeklyCapacityHours / 5, default 8 h).
 */

const { requireModuleAccess } = require('../../../utils/rbac');
const { isSaas } = require('../../../utils/platform');
const { planDay } = require('../../../utils/my-day-scheduler');
const ai = require('../../../utils/ai');
const { askWork } = require('../../../utils/ai/ask-work');

const PLAN_UID = 'api::my-day.my-day-plan';
const TASK_UID = 'api::task.task';
const MEETING_UID = 'api::meeting.meeting';
const MEMBER_UID = 'api::organization-user.organization-user';
const DONE = ['COMPLETED', 'CANCELLED'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function guard(ctx) {
  if (!isSaas()) return ctx.notFound();
  if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
  if (!ctx.state.orgId) return ctx.forbidden('No active organization');
  return requireModuleAccess(ctx, 'pm', 'tasks', 'read');
}

/** tzOffset follows Date#getTimezoneOffset (IST = -330). */
function dayContext(rawDate, rawOffset) {
  const tzOffset = Math.max(-840, Math.min(840, parseInt(rawOffset, 10) || 0));
  const localNow = new Date(Date.now() - tzOffset * 60000);
  const today = localNow.toISOString().slice(0, 10);
  const date = DATE_RE.test(rawDate || '') ? rawDate : today;
  const [y, m, d] = date.split('-').map(Number);
  const midnight = Date.UTC(y, m - 1, d) + tzOffset * 60000; // local midnight as a UTC instant
  const nowMinute = date === today ? Math.floor((Date.now() - midnight) / 60000) : null;
  return { date, today, tzOffset, midnight, nowMinute: date < today ? 24 * 60 : nowMinute };
}

function cleanOverrides(raw) {
  const ids = (a) => (Array.isArray(a) ? a.map((x) => parseInt(x, 10)).filter(Number.isFinite).slice(0, 200) : []);
  const minute = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 && n <= 24 * 60 ? n : undefined;
  };
  const o = raw && typeof raw === 'object' ? raw : {};
  const out = {
    order: ids(o.order),
    excluded: ids(o.excluded),
    pinned: (Array.isArray(o.pinned) ? o.pinned : [])
      .map((p) => ({ taskId: parseInt(p?.taskId, 10), start: minute(p?.start) }))
      .filter((p) => Number.isFinite(p.taskId) && p.start !== undefined)
      .slice(0, 50),
  };
  const ws = minute(o.workStart);
  const we = minute(o.workEnd);
  if (ws !== undefined && we !== undefined && we > ws) Object.assign(out, { workStart: ws, workEnd: we });
  return out;
}

async function loadInputs(strapi, ctx, day) {
  const orgId = ctx.state.orgId;
  const userId = ctx.state.user.id;
  const dayEndIso = new Date(day.midnight + 24 * 3600000).toISOString();

  const [tasks, meetings, members] = await Promise.all([
    strapi.entityService.findMany(TASK_UID, {
      filters: {
        organization: orgId,
        assignee: { id: userId },
        status: { $notIn: DONE },
        $or: [{ startDate: { $null: true } }, { startDate: { $lt: dayEndIso } }],
      },
      fields: ['id', 'name', 'status', 'priority', 'scheduledDate', 'estimatedHours', 'dependsOn'],
      populate: { projects: { fields: ['id', 'name'] } },
      sort: { scheduledDate: 'asc' },
      limit: 300,
    }),
    strapi.entityService.findMany(MEETING_UID, {
      filters: {
        organization: orgId,
        status: { $ne: 'cancelled' },
        startTime: { $lt: dayEndIso },
        endTime: { $gt: new Date(day.midnight).toISOString() },
        $or: [{ organizer: { id: userId } }, { assignedTo: { id: userId } }],
      },
      fields: ['id', 'title', 'startTime', 'endTime'],
      limit: 50,
    }),
    strapi.entityService.findMany(MEMBER_UID, { filters: { organization: orgId, user: userId }, fields: ['weeklyCapacityHours'], limit: 1 }),
  ]);

  const predIds = [...new Set(tasks.flatMap((t) => (Array.isArray(t.dependsOn) ? t.dependsOn : []).map((d) => Number(d?.taskId ?? d))).filter(Number.isFinite))];
  const openPreds = predIds.length
    ? await strapi.entityService.findMany(TASK_UID, { filters: { organization: orgId, id: { $in: predIds }, status: { $notIn: DONE } }, fields: ['id'], limit: predIds.length })
    : [];

  const weekly = members[0]?.weeklyCapacityHours;
  const toMinute = (iso) => Math.round((new Date(iso).getTime() - day.midnight) / 60000);
  return {
    tasks: tasks.map((t) => ({
      id: t.id,
      name: t.name,
      priority: t.priority,
      dueDate: t.scheduledDate ? new Date(new Date(t.scheduledDate).getTime() - day.tzOffset * 60000).toISOString().slice(0, 10) : null,
      estimatedHours: t.estimatedHours,
      dependsOn: t.dependsOn,
      projectName: t.projects?.[0]?.name || null,
    })),
    openTaskIds: [...tasks.map((t) => t.id), ...openPreds.map((t) => t.id)],
    meetings: meetings.filter((m) => m.startTime && m.endTime).map((m) => ({ id: m.id, title: m.title, start: toMinute(m.startTime), end: toMinute(m.endTime) })),
    capacityHours: weekly == null ? 8 : Math.round((Number(weekly) / 5) * 10) / 10,
  };
}

async function findSaved(strapi, ctx, date) {
  const rows = await strapi.entityService.findMany(PLAN_UID, {
    filters: { orgKey: Number(ctx.state.orgId), userKey: Number(ctx.state.user.id), date },
    sort: { id: 'desc' },
    limit: 1,
  });
  return rows[0] || null;
}

async function buildAndSave(strapi, ctx, day, overrides, saved) {
  const inputs = await loadInputs(strapi, ctx, day);
  const plan = planDay({
    date: day.date,
    ...inputs,
    nowMinute: day.nowMinute,
    workStart: overrides.workStart ?? 540,
    workEnd: overrides.workEnd ?? 1080,
    overrides,
  });
  const data = { date: day.date, orgKey: Number(ctx.state.orgId), userKey: Number(ctx.state.user.id), overrides, plan, generatedAt: new Date(), user: ctx.state.user.id, organization: ctx.state.orgId };
  const row = saved ? await strapi.entityService.update(PLAN_UID, saved.id, { data }) : await strapi.entityService.create(PLAN_UID, { data });
  return { row, inputs };
}

function respond(ctx, day, row, inputs) {
  const openIds = new Set(inputs.openTaskIds);
  const names = new Map(inputs.tasks.map((t) => [t.id, t.name]));
  const plan = row.plan || { blocks: [], unscheduled: [] };
  // A saved plan can outlive its tasks: flag blocks whose task was finished since.
  const blocks = (plan.blocks || []).map((b) => (b.kind === 'task' && openIds && !openIds.has(b.id) ? { ...b, done: true } : b));
  ctx.set('Cache-Control', 'no-store');
  const unscheduled = (plan.unscheduled || []).map((u) => ({ ...u, name: names.get(u.id) || null }));
  return { data: { ...plan, blocks, unscheduled, date: day.date, today: day.today, nowMinute: day.nowMinute, overrides: row.overrides || {}, capacityHours: inputs.capacityHours, generatedAt: row.generatedAt } };
}

module.exports = {
  async getDay(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const day = dayContext(ctx.query.date, ctx.query.tzOffset);
    const saved = await findSaved(strapi, ctx, day.date);
    if (saved) {
      return respond(ctx, day, saved, await loadInputs(strapi, ctx, day));
    }
    const { row, inputs } = await buildAndSave(strapi, ctx, day, {}, null);
    return respond(ctx, day, row, inputs);
  },

  async replan(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const body = ctx.request.body || {};
    const day = dayContext(body.date, body.tzOffset);
    const saved = await findSaved(strapi, ctx, day.date);
    const overrides = body.reset ? {} : cleanOverrides(body.overrides !== undefined ? body.overrides : saved?.overrides);
    const { row, inputs } = await buildAndSave(strapi, ctx, day, overrides, saved);
    return respond(ctx, day, row, inputs);
  },

  async ask(ctx) {
    if (!isSaas()) return ctx.notFound();
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const body = ctx.request.body || {};
    const question = String(body.question || '').trim().slice(0, 500);
    if (!question) return ctx.badRequest('Ask a question first.');
    try {
      const data = await askWork(strapi, ctx, { question, language: body.language, history: body.history });
      ctx.set('Cache-Control', 'no-store');
      return { data };
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },
};
