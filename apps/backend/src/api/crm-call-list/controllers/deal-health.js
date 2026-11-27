'use strict';

/**
 * Deal health, daily call list and revenue forecast (ticket G19, SaaS only).
 *
 *   GET  /deal-health/call-list            → today's prioritised list for me (?userId= for managers)
 *   POST /deal-health/call-list/refresh    → rebuild my list now (runs Fudge AI on my deals when on; metered)
 *   GET  /deal-health/deals/:id            → health score + reasons + what to say for one deal
 *   POST /deal-health/deals/:id/analyse    → re-read this deal's notes with Fudge AI (metered)
 *   GET  /deal-health/forecast             → 3-month weighted forecast with 80% range (plan feature crm.forecast)
 *   POST /deal-health/forecast/explain     → Fudge AI explains this month's forecast (metered)
 *
 * All numbers come from utils/deal-health.js (deterministic). AI only finds competitor/tone mentions
 * in notes and writes text. With AI off the reasons and talking points are deterministic.
 */

const { renderTemplate, generateObject } = require('@webfudge/ai');
const { isSaas } = require('../../../utils/platform');
const { requireFeature } = require('../../../utils/saas-plans');
const { requireModuleAccess, canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../../../utils/rbac');
const loader = require('../../../utils/deal-health-loader');
const ai = require('../../../utils/ai');

const isManager = (ctx) => isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'crm', 'deals', 'manage');

async function gate(ctx, feature = loader.FEATURE) {
  if (!isSaas()) {
    ctx.notFound('Not available');
    return false;
  }
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  if (requireModuleAccess(ctx, 'crm', 'deals', 'read')) return false;
  return requireFeature(ctx, strapi, feature);
}

function targetUser(ctx) {
  const asked = parseInt(String(ctx.query?.userId || ''), 10);
  if (asked && asked !== Number(ctx.state.user.id)) return isManager(ctx) ? asked : null;
  return Number(ctx.state.user.id);
}

module.exports = {
  async callList(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const userId = targetUser(ctx);
    if (!userId) return ctx.forbidden("Only managers can see another rep's list");
    const today = loader.todayIso();
    let row = await strapi.db.query(loader.LIST_UID).findOne({ where: { organization: ctx.state.orgId, user: userId, date: today } });
    if (!row) {
      // Not built by the cron yet (new org, or cron off): build the deterministic list now.
      const data = await loader.loadOrg(strapi, ctx.state.orgId, today);
      row = await loader.saveList(strapi, ctx.state.orgId, userId, today, loader.callListFor(data, userId), false);
    }
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      data: { date: today, userId, items: row.items || [], aiUsed: !!row.aiUsed, generatedAt: row.generatedAt },
      meta: { aiEnabled: ai.aiEnabled(), manager: isManager(ctx) },
    };
    return ctx.body;
  },

  async refreshCallList(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const userId = Number(ctx.state.user.id);
    const today = loader.todayIso();
    const data = await loader.loadOrg(strapi, ctx.state.orgId, today);
    const mine = data.open.filter((d) => Number(d.ownerId) === userId);
    let analysed = 0;
    let aiError = null;
    if (ai.aiEnabled()) {
      try {
        analysed = await loader.analyseDeals(strapi, ctx.state.orgId, data, mine, { language: ctx.request.body?.language });
      } catch (err) {
        if (!String(err?.code || '').startsWith('AI_')) throw err;
        aiError = { code: err.code, message: err.message };
      }
    }
    const items = loader.callListFor(data, userId);
    const row = await loader.saveList(strapi, ctx.state.orgId, userId, today, items, mine.some((d) => d.aiHealth));
    ctx.body = { data: { date: today, userId, items, aiUsed: !!row.aiUsed, generatedAt: row.generatedAt, analysed, aiError }, meta: { aiEnabled: ai.aiEnabled() } };
    return ctx.body;
  },

  async deal(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const id = parseInt(String(ctx.params.id), 10);
    const data = await loader.loadOrg(strapi, ctx.state.orgId);
    const deal = [...data.open, ...data.closed].find((d) => d.id === id);
    if (!deal) return ctx.notFound('Deal not found');
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { data: { dealId: id, stage: deal.stage, ...loader.healthFor(data, deal) }, meta: { aiEnabled: ai.aiEnabled() } };
    return ctx.body;
  },

  async analyseDeal(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const id = parseInt(String(ctx.params.id), 10);
    try {
      const data = await loader.loadOrg(strapi, ctx.state.orgId);
      const deal = data.open.find((d) => d.id === id);
      if (!deal) return ctx.notFound('Open deal not found');
      await loader.analyseDeals(strapi, ctx.state.orgId, data, [deal], { force: true, language: ctx.request.body?.language });
      ctx.body = { data: { dealId: id, stage: deal.stage, ...loader.healthFor(data, deal), credits: await ai.creditStatus(strapi, ctx.state.orgId) } };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },

  async forecast(ctx) {
    if (!(await gate(ctx, 'crm.forecast'))) return ctx.body;
    const data = await loader.loadOrg(strapi, ctx.state.orgId);
    const mineOnly = !isManager(ctx) || ctx.query?.scope === 'mine';
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      data: { today: data.today, scope: mineOnly ? 'mine' : 'org', ...loader.forecastFor(data, { ownerId: mineOnly ? ctx.state.user.id : null }) },
      meta: { aiEnabled: ai.aiEnabled() },
    };
    return ctx.body;
  },

  async explainForecast(ctx) {
    if (!(await gate(ctx, 'crm.forecast'))) return ctx.body;
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    try {
      const data = await loader.loadOrg(strapi, ctx.state.orgId);
      const mineOnly = !isManager(ctx) || ctx.request.body?.scope === 'mine';
      const fc = loader.forecastFor(data, { ownerId: mineOnly ? ctx.state.user.id : null });
      const t = renderTemplate(
        'grow.forecast_explain',
        { forecast: { ...fc.months[0], stageWinRates: fc.rates }, currency: ctx.request.body?.currency, today: data.today },
        { language: ctx.request.body?.language }
      );
      const out = await generateObject(ai.clientFor(strapi, ctx), { ...t, feature: 'grow.forecast_explain', metadata: { subjectType: 'forecast', subjectId: ctx.state.orgId } });
      ctx.body = {
        data: { ...out.object, month: fc.months[0].month, language: t.language, model: out.model, creditsUsed: out.credits, credits: await ai.creditStatus(strapi, ctx.state.orgId) },
      };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },
};
