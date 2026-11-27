'use strict';

/**
 * G20 Ask Grow + Draft anything (SaaS).
 *   POST /ask-grow/query { question, language? }  → { filter, chips, explanation, rows, total, ids, ignored }  (Fudge AI, metered)
 *   POST /ask-grow/run   { filter }                → same without AI (the leads list re-applies a saved filter)
 *   POST /ask-grow/draft { recordType: lead|deal|contact, recordId, kind: email|followup|proposal_intro, instructions?, language? }
 *   GET|PUT /ask-grow/brand-tone { tone, signature }  org brand tone used by drafts (PUT needs CRM settings manage)
 * Reads respect crm.<module> read access and the org; the model only ever returns a whitelisted filter.
 */

const { isSaas } = require('../../../utils/platform');
const { requireModuleAccess } = require('../../../utils/rbac');
const ai = require('../../../utils/ai');
const askGrow = require('../../../utils/ai/ask-grow');

function base(ctx) {
  if (!isSaas()) {
    ctx.notFound();
    return false;
  }
  if (!ctx.state.user) {
    ctx.unauthorized('Sign in first.');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  return true;
}

module.exports = {
  async query(ctx) {
    if (!isSaas()) return ctx.notFound();
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    const body = ctx.request.body || {};
    const question = String(body.question || '').trim().slice(0, 500);
    if (!question) return ctx.badRequest('Ask a question first.');
    try {
      const data = await askGrow.askGrow(strapi, ctx, { question, language: body.language });
      ctx.set('Cache-Control', 'no-store');
      return { data };
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },

  async run(ctx) {
    if (!base(ctx)) return ctx.body;
    const denied = requireModuleAccess(ctx, 'crm', 'leads', 'read');
    if (denied) return denied;
    const data = await askGrow.runFilter(strapi, ctx, (ctx.request.body || {}).filter);
    ctx.set('Cache-Control', 'no-store');
    return { data };
  },

  async draft(ctx) {
    if (!isSaas()) return ctx.notFound();
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const b = ctx.request.body || {};
    try {
      const data = await askGrow.draftMessage(strapi, ctx, { recordType: b.recordType, recordId: b.recordId, kind: b.kind, instructions: b.instructions, language: b.language });
      return { data };
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },

  async getBrandTone(ctx) {
    if (!base(ctx)) return ctx.body;
    return { data: await askGrow.getBrandTone(strapi, ctx.state.orgId) };
  },

  async setBrandTone(ctx) {
    if (!base(ctx)) return ctx.body;
    const denied = requireModuleAccess(ctx, 'crm', 'settings', 'manage');
    if (denied) return denied;
    const b = ctx.request.body || {};
    return { data: await askGrow.setBrandTone(strapi, ctx.state.orgId, b.data || b) };
  },
};
