'use strict';

/**
 * Smart triage + meeting → tasks (W20). Logic in utils/ai/work-triage.js.
 *
 * GET  /smart-triage/tasks                  open tasks with no assignee (incl. intake / portal requests)
 * POST /smart-triage/suggest                { taskIds, language? } → AI suggestions (no writes)
 * POST /smart-triage/apply                  { items: [{ taskId, priority?, assigneeId?, taskListId?, scheduledDate? }] }
 * POST /smart-triage/meetings/:id/extract   { notes?, language? } → action-item preview (no writes)
 * POST /smart-triage/meetings/:id/tasks     { projectId?, taskListId?, items: [...] } → creates the tasks
 *
 * The AI endpoints need PLATFORM_MODE=saas + AI_ENABLED (403 AI_DISABLED otherwise) and spend credits
 * (402 AI_CREDITS_EXHAUSTED when out). Writes run as agent actions: audited and undoable.
 */

const ai = require('../../../utils/ai');
const { getActionRunner, actorFromCtx, assertAllowed } = require('../../../utils/ai/actions');
const triage = require('../../../utils/ai/work-triage');
const { requireModuleAccess } = require('../../../utils/rbac');

const TASK_UID = 'api::task.task';
const OPEN = { $notIn: ['COMPLETED', 'CANCELLED'] };
const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};
const scopeOf = (ctx) => ({ orgId: ctx.state.orgId, userId: ctx.state.user?.id ?? null });

/** Action errors that are not AI errors are the user's input (task gone, not a member ...). */
function sendError(ctx, err) {
  if (err?.code) return ai.sendAiError(ctx, err);
  ctx.status = 400;
  ctx.body = { data: null, error: { status: 400, name: 'BadRequest', message: err?.message || 'Request failed.', details: { code: 'TRIAGE_FAILED' } } };
  return ctx.body;
}

function gate(ctx, access) {
  if (!ai.requireAiEnabled(ctx)) return false;
  const denied = requireModuleAccess(ctx, 'pm', 'tasks', access);
  return !denied;
}

module.exports = {
  async inbox(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'read');
    if (denied) return denied;
    const q = ctx.query || {};
    const filters = { organization: ctx.state.orgId, status: OPEN, assignee: { id: { $null: true } }, parent: { id: { $null: true } } };
    if (q.projectId) filters.projects = { id: parseInt(q.projectId, 10) || -1 };
    const rows = await strapi.entityService.findMany(TASK_UID, {
      filters,
      fields: ['id', 'name', 'description', 'priority', 'status', 'taskType', 'scheduledDate', 'estimatedHours', 'createdAt'],
      populate: { projects: { fields: ['id', 'name'] }, taskList: { fields: ['id', 'name'] }, clientRequestedBy: { fields: ['id', 'firstName', 'lastName'] }, meeting: { fields: ['id', 'title'] } },
      sort: { createdAt: 'desc' },
      limit: 200,
    });
    ctx.set('Cache-Control', 'no-store');
    return {
      data: rows.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description || null,
        priority: t.priority || null,
        status: t.status,
        taskType: t.taskType || 'task',
        scheduledDate: t.scheduledDate ? String(t.scheduledDate).slice(0, 10) : null,
        createdAt: t.createdAt,
        project: t.projects?.[0] ? { id: t.projects[0].id, name: t.projects[0].name } : null,
        taskList: t.taskList ? { id: t.taskList.id, name: t.taskList.name } : null,
        source: t.clientRequestedBy ? 'portal' : t.meeting ? 'meeting' : 'team',
      })),
      meta: { maxPerRun: triage.MAX_TRIAGE },
    };
  },

  async suggest(ctx) {
    if (!gate(ctx, 'write')) return ctx.body;
    try {
      const b = body(ctx);
      await assertAllowed(strapi, 'work.task.apply_triage', actorFromCtx(ctx), {});
      const out = await triage.suggestTriage(strapi, scopeOf(ctx), { taskIds: b.taskIds, language: b.language }, { client: ai.clientFor(strapi, ctx) });
      ctx.body = { data: { ...out, credits: await ai.creditStatus(strapi, ctx.state.orgId) } };
      return ctx.body;
    } catch (err) {
      return sendError(ctx, err);
    }
  },

  async apply(ctx) {
    if (!gate(ctx, 'write')) return ctx.body;
    const items = Array.isArray(body(ctx).items) ? body(ctx).items.slice(0, 100) : [];
    if (!items.length) return ctx.badRequest('Nothing to apply');
    const actor = actorFromCtx(ctx);
    const results = [];
    for (const it of items) {
      const input = { taskId: Number(it.taskId) };
      for (const k of ['priority', 'assigneeId', 'taskListId', 'scheduledDate']) if (it[k] !== undefined) input[k] = it[k];
      try {
        const record = await getActionRunner(strapi).propose({ key: 'work.task.apply_triage', actor, orgId: ctx.state.orgId, input, feature: 'work.task_triage', subject: { type: 'task', id: input.taskId } });
        results.push({ taskId: input.taskId, ok: true, actionId: record.id, undoable: record.undoable });
      } catch (err) {
        if (err?.code === 'AI_PERMISSION_DENIED' || err?.status === 403) return sendError(ctx, err);
        results.push({ taskId: input.taskId, ok: false, error: err.message });
      }
    }
    ctx.body = { data: { results, applied: results.filter((r) => r.ok).length } };
    return ctx.body;
  },

  /** Recent meetings of the org (meetings live in Grow; Work users pick one here without Grow access). */
  async meetings(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'tasks', 'read');
    if (denied) return denied;
    const since = new Date(Date.now() - 60 * 86400000).toISOString();
    const rows = await strapi.entityService.findMany('api::meeting.meeting', {
      filters: { organization: ctx.state.orgId, startTime: { $gte: since }, status: { $ne: 'cancelled' } },
      fields: ['id', 'title', 'startTime', 'notes', 'visibility'],
      populate: { organizer: { fields: ['id'] } },
      sort: { startTime: 'desc' },
      limit: 100,
    });
    const me = ctx.state.user.id;
    ctx.set('Cache-Control', 'no-store');
    return {
      data: rows
        .filter((m) => m.visibility !== 'private' || m.organizer?.id === me)
        .map((m) => ({ id: m.id, title: m.title || `Meeting #${m.id}`, startTime: m.startTime, notes: m.notes || '' })),
    };
  },

  async extract(ctx) {
    if (!gate(ctx, 'write')) return ctx.body;
    try {
      const b = body(ctx);
      await assertAllowed(strapi, 'work.meeting.create_tasks', actorFromCtx(ctx), {});
      const out = await triage.extractMeetingTasks(strapi, scopeOf(ctx), ctx.params.id, { notes: b.notes, language: b.language }, { client: ai.clientFor(strapi, ctx) });
      ctx.body = { data: { ...out, credits: await ai.creditStatus(strapi, ctx.state.orgId) } };
      return ctx.body;
    } catch (err) {
      return sendError(ctx, err);
    }
  },

  async createTasks(ctx) {
    if (!gate(ctx, 'write')) return ctx.body;
    try {
      const b = body(ctx);
      const record = await getActionRunner(strapi).propose({
        key: 'work.meeting.create_tasks',
        actor: actorFromCtx(ctx),
        orgId: ctx.state.orgId,
        input: {
          meetingId: Number(ctx.params.id),
          projectId: b.projectId ? Number(b.projectId) : null,
          taskListId: b.taskListId ? Number(b.taskListId) : null,
          assignerId: ctx.state.user.id,
          items: Array.isArray(b.items) ? b.items : [],
        },
        feature: 'work.meeting_action_items',
        subject: { type: 'meeting', id: Number(ctx.params.id) },
      });
      ctx.body = { data: { taskIds: record.result?.taskIds || [], count: record.result?.count || 0, actionId: record.id, undoable: record.undoable } };
      return ctx.body;
    } catch (err) {
      return sendError(ctx, err);
    }
  },
};
