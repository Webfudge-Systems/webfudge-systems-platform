'use strict';

/**
 * Fudge AI (P5) endpoints:
 *   GET  /api/ai/usage                 credits this month (Accounts → Apps & billing)
 *   GET  /api/ai/actions?status=       approval queue (default pending_approval) and AI action history
 *   POST /api/ai/actions/:id/approve   execute a queued outbound action as the approver
 *   POST /api/ai/actions/:id/reject    { reason? }
 *   POST /api/ai/actions/:id/undo      revert an executed, undoable action
 *   POST /api/ai/memory/search         { query, k?, sourceTypes? } (managers/admins)
 * Feature endpoints live with their records, e.g. POST /api/lead-companies/:id/ai-score.
 */

const ai = require('../../../utils/ai');
const { getActionRunner, actorFromCtx, fromDb, POPULATE, ACTION_UID, createStrapiActionStore } = require('../../../utils/ai/actions');
const { getMemory } = require('../../../utils/ai/memory');
const { canAccess, canManageAppSettings, isAdminRole } = require('../../../utils/rbac');
const { isSaas } = require('../../../utils/platform');

const STATUSES = ['pending_approval', 'executed', 'rejected', 'failed', 'undone'];

function requireMember(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Sign in first.');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.status = 403;
    ctx.body = { data: null, error: { status: 403, name: 'AiError', message: 'Create or join an organization first.', details: { code: 'NO_ORGANIZATION' } } };
    return false;
  }
  return true;
}

/** Sees every AI action in the org (otherwise only the ones proposed for you). */
function canSeeAllActions(ctx) {
  return (
    isAdminRole({ name: ctx.state.orgRole, code: ctx.state.orgRoleCode }) ||
    canManageAppSettings(ctx) ||
    canAccess(ctx, 'crm', 'leads', 'manage') ||
    canAccess(ctx, 'pm', 'projects', 'manage')
  );
}

/** Writes need the action's app to be in full access (not read-only or locked). */
async function requireAppWrite(ctx, app) {
  if (!isSaas() || !app) return true;
  const { getOrgAccess } = require('../../../utils/saas-access');
  const access = (await getOrgAccess(strapi, ctx.state.orgId))[app];
  if (access && access.access === 'full') return true;
  ctx.status = 403;
  ctx.body = { data: null, error: { status: 403, name: 'AppAccessError', message: 'This app is read-only or locked for your organization.', details: { code: 'APP_READ_ONLY', apps: [app] } } };
  return false;
}

async function invalidate(orgId) {
  try {
    await require('../../../utils/cache').invalidateOrg(orgId);
  } catch (_) {
    /* cache is optional */
  }
}

function serializeAction(record, ctx) {
  const mine = String(record.actorId) === String(ctx.state.user?.id);
  return {
    id: record.id,
    actionKey: record.actionKey,
    label: record.label,
    app: record.app,
    feature: record.feature,
    status: record.status,
    outbound: record.outbound,
    undoable: record.undoable && record.status === 'executed',
    subjectType: record.subjectType,
    subjectId: record.subjectId,
    summary: record.summary,
    // The draft (e.g. email subject/body) is what the approver reviews.
    input: record.input,
    result: record.result,
    error: record.error,
    proposedFor: record.actor ? { id: record.actor.id, name: record.actor.username || record.actor.email } : null,
    decidedBy: record.decidedBy ? { id: record.decidedBy.id, name: record.decidedBy.username || record.decidedBy.email } : null,
    decidedAt: record.decidedAt,
    executedAt: record.executedAt,
    undoneAt: record.undoneAt,
    createdAt: record.createdAt,
    mine,
  };
}

async function decide(ctx, verb) {
  if (!ai.requireAiEnabled(ctx)) return ctx.body;
  const runner = getActionRunner(strapi);
  const orgId = ctx.state.orgId;
  try {
    const existing = await createStrapiActionStore(strapi).get(ctx.params.id);
    if (existing && String(existing.orgId) === String(orgId) && !(await requireAppWrite(ctx, existing.app))) return ctx.body;
    const opts = { actor: actorFromCtx(ctx), orgId };
    let record;
    if (verb === 'approve') record = await runner.approve(ctx.params.id, opts);
    else if (verb === 'reject') record = await runner.reject(ctx.params.id, { ...opts, reason: ctx.request.body?.reason ? String(ctx.request.body.reason).slice(0, 500) : null });
    else record = await runner.undo(ctx.params.id, opts);
    await invalidate(orgId);
    ctx.body = { data: serializeAction(record, ctx) };
    return ctx.body;
  } catch (err) {
    return ai.sendAiError(ctx, err);
  }
}

module.exports = {
  async usage(ctx) {
    if (!requireMember(ctx)) return ctx.body;
    if (!ai.aiEnabled()) {
      ctx.body = { data: { enabled: false } };
      return ctx.body;
    }
    try {
      const status = await ai.creditStatus(strapi, ctx.state.orgId);
      ctx.body = { data: { enabled: true, configured: ai.providerConfigured(), ...status } };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },

  async actions(ctx) {
    if (!requireMember(ctx)) return ctx.body;
    if (!ai.aiEnabled()) {
      ctx.body = { data: [], meta: { enabled: false, total: 0 } };
      return ctx.body;
    }
    const status = String(ctx.query.status || 'pending_approval');
    const filters = { organization: ctx.state.orgId };
    if (status !== 'all') {
      if (!STATUSES.includes(status)) return ctx.badRequest(`status must be one of ${STATUSES.join(', ')} or all`);
      filters.status = status;
    }
    if (ctx.query.app) filters.app = String(ctx.query.app);
    if (!canSeeAllActions(ctx)) filters.actor = ctx.state.user.id;
    const limit = Math.min(100, Math.max(1, Number(ctx.query.limit) || 50));
    const [rows, total] = await Promise.all([
      strapi.entityService.findMany(ACTION_UID, { filters, populate: POPULATE, sort: { createdAt: 'desc' }, limit }),
      strapi.entityService.count(ACTION_UID, { filters }),
    ]);
    ctx.body = { data: rows.map((r) => serializeAction(fromDb(r), ctx)), meta: { enabled: true, total, canSeeAll: canSeeAllActions(ctx) } };
    return ctx.body;
  },

  approve: (ctx) => decide(ctx, 'approve'),
  reject: (ctx) => decide(ctx, 'reject'),
  undo: (ctx) => decide(ctx, 'undo'),

  async memorySearch(ctx) {
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    if (!canSeeAllActions(ctx)) return ctx.forbidden('Only managers and admins can search business memory directly.');
    const body = ctx.request.body || {};
    const query = String(body.query || '').trim().slice(0, 500);
    if (!query) return ctx.badRequest('query is required');
    const k = Math.min(20, Math.max(1, Number(body.k) || 5));
    const sourceTypes = Array.isArray(body.sourceTypes) ? body.sourceTypes.map(String).slice(0, 10) : undefined;
    try {
      const hits = await getMemory(strapi).search(ctx.state.orgId, query, { k, sourceTypes });
      ctx.body = { data: hits };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },
  /**
   * POST /api/ai/transcribe  multipart: audio (file, up to 25 MB), language? ('en' | 'hi' | 'mr' | 'auto')
   * Voice-note transcription (Whisper), metered in AI credits by audio minute.
   */
  async transcribe(ctx) {
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const files = ctx.request.files || {};
    const file = Array.isArray(files.audio) ? files.audio[0] : files.audio;
    if (!file) return ctx.badRequest('Attach the voice note as the "audio" file.');
    const filePath = file.filepath || file.path;
    const mimeType = String(file.mimetype || file.type || '').split(';')[0].trim().toLowerCase();
    const language = String(ctx.request.body?.language || 'auto').toLowerCase();
    try {
      const audio = await require('fs').promises.readFile(filePath);
      const data = await require('../../../utils/ai/voice').transcribeVoiceNote(strapi, ctx, { audio, mimeType, language });
      ctx.body = { data };
      return ctx.body;
    } catch (err) {
      if (!err?.code && err?.message && /audio|Voice notes|Unsupported/.test(err.message)) return ctx.badRequest(err.message);
      return ai.sendAiError(ctx, err);
    }
  },
};
