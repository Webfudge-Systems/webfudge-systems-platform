'use strict';

/**
 * Fudge AI in the backend (ticket P5). SaaS only, and only when AI_ENABLED=true.
 *
 * What a feature endpoint needs:
 *
 *   const ai = require('../../../utils/ai');
 *   if (!ai.requireAiEnabled(ctx)) return;
 *   try {
 *     const client = ai.clientFor(strapi, ctx);                         // metered for ctx's org + user
 *     const t = renderTemplate('grow.xxx', vars, { language });          // from @webfudge/ai
 *     const { object } = await generateObject(client, { ...t, feature: 'grow.xxx' });
 *     ...
 *   } catch (err) {
 *     return ai.sendAiError(ctx, err);                                   // 402 + upgrade link when credits run out
 *   }
 *
 * Credits: every call writes an ai-usage row (tokens, model, cost, credits). Before each call the
 * organization's credits used this month are compared with its allowance: the sum of
 * aiCreditsMonthly over the apps it has full access to (plan rows, see utils/saas-plans.js).
 * Months follow AI_CREDIT_TIMEZONE (default Asia/Kolkata), so credits reset on the 1st with no job.
 */

const { createAiClient, createProviderFromEnv, AiDisabledError, AiCreditsExhaustedError } = require('@webfudge/ai');
const { isSaas } = require('../platform');
const { planError, APP_LABEL } = require('../saas-plans');
const { mockRespond } = require('./mock-responder');

const USAGE_UID = 'api::ai.ai-usage';

/** Feature key prefix → app slug (for upgrade links and the per-app breakdown). */
const FEATURE_APP = { grow: 'crm', work: 'pm', connect: 'connect', voice: null, memory: null };

function aiEnabled() {
  return isSaas() && String(process.env.AI_ENABLED || '').toLowerCase() === 'true';
}

function appForFeature(feature) {
  const prefix = String(feature || '').split('.')[0];
  return FEATURE_APP[prefix] !== undefined ? FEATURE_APP[prefix] : null;
}

// ---------- periods ----------

function creditTimezone() {
  return process.env.AI_CREDIT_TIMEZONE || 'Asia/Kolkata';
}

/** { period: 'YYYY-MM', resetsOn: 'YYYY-MM-01' (first day of next month) } in the credit timezone. */
function currentPeriod(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: creditTimezone(), year: 'numeric', month: '2-digit' }).formatToParts(date);
  const y = Number(parts.find((p) => p.type === 'year').value);
  const m = Number(parts.find((p) => p.type === 'month').value);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return { period: `${y}-${String(m).padStart(2, '0')}`, resetsOn: `${ny}-${String(nm).padStart(2, '0')}-01` };
}

// ---------- provider / client ----------

let provider = null;
function getProvider() {
  if (!provider) provider = createProviderFromEnv(process.env, { mockRespond });
  return provider;
}

/** For tests: swap the provider (e.g. a mock with scripted answers). */
function setProvider(p) {
  provider = p;
}

function providerConfigured() {
  const name = String(process.env.AI_PROVIDER || 'anthropic').toLowerCase();
  if (name === 'mock') return true;
  if (name === 'anthropic') return Boolean(process.env.ANTHROPIC_API_KEY);
  return false;
}

// ---------- credits ----------

function columnOf(meta, attr) {
  const a = meta?.attributes?.[attr];
  return (a && a.columnName) || attr.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/** Credits used this period, by feature. Uses a SQL SUM (works on SQLite and Postgres). */
async function usageRows(strapi, orgId, period) {
  const meta = strapi.db.metadata.get(USAGE_UID);
  const col = (a) => columnOf(meta, a);
  return strapi.db
    .connection(meta.tableName)
    .where(col('orgKey'), Number(orgId))
    .andWhere(col('period'), period)
    .select({ feature: col('feature'), app: col('app') })
    .sum({ credits: col('credits'), inputTokens: col('inputTokens'), outputTokens: col('outputTokens') })
    .count({ calls: '*' })
    .groupBy(col('feature'), col('app'));
}

/** The org's monthly allowance: sum of aiCreditsMonthly over apps with full access. */
async function creditAllowance(strapi, orgId) {
  const { getOrgAccess } = require('../saas-access');
  const access = await getOrgAccess(strapi, orgId);
  const byApp = {};
  let total = 0;
  for (const [app, a] of Object.entries(access)) {
    const credits = a.access === 'full' ? Number(a.aiCreditsMonthly) || 0 : 0;
    byApp[app] = { credits, planCode: a.planCode, tier: a.tier, access: a.access };
    total += credits;
  }
  return { total, byApp };
}

/**
 * @returns {Promise<{ period, resetsOn, allowance, used, remaining, byFeature, byApp }>}
 */
async function creditStatus(strapi, orgId) {
  const { period, resetsOn } = currentPeriod();
  const [{ total, byApp }, rows] = await Promise.all([creditAllowance(strapi, orgId), usageRows(strapi, orgId, period)]);
  const byFeature = rows
    .map((r) => ({ feature: r.feature, app: r.app || null, calls: Number(r.calls) || 0, credits: Number(r.credits) || 0, inputTokens: Number(r.inputTokens) || 0, outputTokens: Number(r.outputTokens) || 0 }))
    .sort((a, b) => b.credits - a.credits);
  const used = byFeature.reduce((s, r) => s + r.credits, 0);
  return { period, resetsOn, allowance: total, used, remaining: Math.max(0, total - used), byFeature, byApp };
}

function exhaustedMessage(status, app) {
  const appName = APP_LABEL[app] || 'your apps';
  if (!status.allowance) return `Fudge AI is not included in your current plan. Upgrade ${appName} to Pro to use AI features.`;
  return `Your organization has used all ${status.allowance} AI credits for this month. Credits reset on ${status.resetsOn}; upgrade ${appName} for more.`;
}

/** Meter for one org + user: blocks calls when credits are used up and records every call. */
function createMeter(strapi, { orgId, userId = null }) {
  return {
    async check(call) {
      const status = await creditStatus(strapi, orgId);
      if (status.remaining > 0) return status;
      const app = appForFeature(call.feature) || 'crm';
      throw new AiCreditsExhaustedError(exhaustedMessage(status, app), {
        app,
        feature: call.feature,
        used: status.used,
        allowance: status.allowance,
        resetsOn: status.resetsOn,
      });
    },
    async record(r) {
      const { period } = currentPeriod();
      try {
        await strapi.entityService.create(USAGE_UID, {
          data: {
            organization: orgId,
            orgKey: Number(orgId),
            user: userId,
            period,
            feature: r.feature,
            app: appForFeature(r.feature),
            task: r.task,
            tier: r.tier,
            provider: r.provider,
            model: r.model,
            inputTokens: r.usage?.inputTokens || 0,
            outputTokens: r.usage?.outputTokens || 0,
            cacheReadTokens: r.usage?.cacheReadTokens || 0,
            cacheWriteTokens: r.usage?.cacheWriteTokens || 0,
            costUsd: r.costUsd || 0,
            credits: r.credits || 0,
            status: r.status || 'ok',
            error: r.error ? String(r.error).slice(0, 250) : null,
            latencyMs: r.latencyMs ?? null,
            meta: r.metadata || null,
          },
        });
      } catch (err) {
        // Never lose the answer because the usage row failed; log loudly instead.
        strapi.log.error(`[ai] failed to record usage for org ${orgId} (${r.feature}): ${err?.message || err}`);
      }
    },
  };
}

/** A metered AI client for the signed-in user's organization. */
function clientFor(strapi, ctx, opts = {}) {
  const orgId = opts.orgId || ctx.state.orgId;
  const userId = opts.userId !== undefined ? opts.userId : ctx.state.user?.id ?? null;
  return createAiClient({ provider: getProvider(), meter: createMeter(strapi, { orgId, userId }), logger: strapi.log });
}

// ---------- HTTP helpers ----------

/** Answers 401/403 and returns false when there is no user/org or AI is switched off. */
function requireAiEnabled(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Sign in first.');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.status = 403;
    ctx.body = { data: null, error: { status: 403, name: 'AiError', message: 'Create or join an organization first.', details: { code: 'NO_ORGANIZATION' } } };
    return false;
  }
  if (!aiEnabled()) {
    sendAiError(ctx, new AiDisabledError());
    return false;
  }
  return true;
}

/** Maps an AI error to the response. Credits exhausted uses the plan-limit (402) shape the apps already handle. */
function sendAiError(ctx, err) {
  const log = global.strapi?.log || console;
  if (err?.code === 'AI_CREDITS_EXHAUSTED') {
    return planError(ctx, { code: 'AI_CREDITS_EXHAUSTED', message: err.message, ...err.details, app: err.details?.app || 'crm' });
  }
  if (err?.code && String(err.code).startsWith('AI_')) {
    if (err.status >= 500) log.warn(`[ai] ${err.code}: ${err.message}${err.cause ? ` (${err.cause.message || err.cause})` : ''}`);
    ctx.status = err.status || 500;
    ctx.body = { data: null, error: { status: ctx.status, name: 'AiError', message: err.message, details: { code: err.code, ...(err.details || {}) } } };
    return ctx.body;
  }
  log.error(`[ai] unexpected error: ${err?.stack || err}`);
  ctx.status = 500;
  ctx.body = { data: null, error: { status: 500, name: 'AiError', message: 'Something went wrong with Fudge AI.', details: { code: 'AI_ERROR' } } };
  return ctx.body;
}

module.exports = {
  USAGE_UID,
  aiEnabled,
  appForFeature,
  currentPeriod,
  getProvider,
  setProvider,
  providerConfigured,
  creditAllowance,
  creditStatus,
  createMeter,
  clientFor,
  requireAiEnabled,
  sendAiError,
};
