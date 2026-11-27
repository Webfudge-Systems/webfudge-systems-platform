'use strict';

/**
 * AI auto-capture (G10). Logic in utils/ai/auto-capture.js. :type is lead_company or deal.
 *
 * GET  /ai-capture/settings           { autoRun, autoApply }
 * PUT  /ai-capture/settings           { autoRun?, autoApply? }  (CRM settings manage access)
 * GET  /ai-capture/:type/:id          { capture, sources, settings }   (no AI call)
 * POST /ai-capture/:type/:id/run      { language? } → fresh suggestions (spends credits)
 * POST /ai-capture/:type/:id/apply    { fields: { budget: { amount? }, nextStep: {}, ... } } → agent action (undo: POST /ai/actions/:id/undo)
 * POST /ai-capture/:type/:id/dismiss  { field }
 */

const ai = require('../../../utils/ai');
const cap = require('../../../utils/ai/auto-capture');
const { listSources } = require('../../../utils/ai/capture-sources');
const { actorFromCtx } = require('../../../utils/ai/actions');
const { requireModuleAccess } = require('../../../utils/rbac');

const TYPES = { lead_company: 'leads', deal: 'deals' };
const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};

function signedIn(ctx) {
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

/** Validates :type and module access; returns the subject scope or null (response already set). */
function scope(ctx, access, { needAi = false } = {}) {
  if (needAi ? !ai.requireAiEnabled(ctx) : !signedIn(ctx)) return null;
  const { type, id } = ctx.params;
  if (!TYPES[type]) {
    ctx.badRequest('type must be lead_company or deal');
    return null;
  }
  if (requireModuleAccess(ctx, 'crm', TYPES[type], access)) return null;
  return { orgId: ctx.state.orgId, subjectType: type, subjectId: Number(id) };
}

const fail = (ctx, err) => ai.sendAiError(ctx, err);

module.exports = {
  async getSettings(ctx) {
    if (!signedIn(ctx)) return;
    return { data: await cap.getSettings(strapi, ctx.state.orgId) };
  },

  async putSettings(ctx) {
    if (!signedIn(ctx)) return;
    if (requireModuleAccess(ctx, 'crm', 'settings', 'manage')) return;
    return { data: await cap.saveSettings(strapi, ctx.state.orgId, body(ctx)) };
  },

  async show(ctx) {
    const s = scope(ctx, 'read');
    if (!s) return;
    const row = await cap.loadSubject(strapi, s.orgId, s.subjectType, s.subjectId);
    if (!row) return ctx.notFound('Record not found');
    ctx.set('Cache-Control', 'no-store');
    return { data: { capture: row.aiCapture || null, sources: listSources(), settings: await cap.getSettings(strapi, s.orgId), aiEnabled: ai.aiEnabled() } };
  },

  async run(ctx) {
    const s = scope(ctx, 'read', { needAi: true });
    if (!s) return;
    try {
      const out = await cap.runCapture(strapi, { ...s, userId: ctx.state.user.id, language: body(ctx).language, trigger: 'manual' });
      return { data: { ...out, credits: await ai.creditStatus(strapi, s.orgId) } };
    } catch (err) {
      return fail(ctx, err);
    }
  },

  async apply(ctx) {
    const s = scope(ctx, 'read');
    if (!s) return;
    try {
      return { data: await cap.applyCapture(strapi, { ...s, actor: actorFromCtx(ctx), fields: body(ctx).fields || {} }) };
    } catch (err) {
      return fail(ctx, err);
    }
  },

  async dismiss(ctx) {
    const s = scope(ctx, 'read');
    if (!s) return;
    try {
      return { data: { capture: await cap.dismissCapture(strapi, { ...s, field: body(ctx).field }) } };
    } catch (err) {
      return fail(ctx, err);
    }
  },
};
