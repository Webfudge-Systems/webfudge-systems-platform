'use strict';

/**
 * SaaS only: plan tiers, limits and Business-only features (tickets G16 Grow, W15 Work).
 *
 * The customer-facing tiers map onto the existing plan codes, so billing, Razorpay and existing
 * subscriptions keep working unchanged:
 *
 *   free         → Free
 *   standard     → Pro
 *   professional → Business
 *   enterprise   → Business  (legacy rows from the first catalogue; no longer seeded)
 *   trial        → Business  (a 14-day trial shows everything)
 *
 * Limits live on the plan rows (maxUsers, maxContacts, aiCreditsMonthly; editable in the Strapi
 * admin). The defaults below are used when a row has no value yet.
 *
 * To gate a new Business feature: add its key to FEATURES, then either
 *   - add `{ name: 'global::plan-feature', config: { feature: 'pm.client_portal' } }` to the route's
 *     middlewares, or
 *   - call `requireFeature(ctx, strapi, 'pm.client_portal')` in the controller.
 * The frontends use `usePlanFeature(key)` / `<PlanGate feature={key}>` from @webfudge/ui.
 */

const { isSaas } = require('./platform');

const TIER_RANK = { free: 0, pro: 1, business: 2 };
const TIER_LABEL = { free: 'Free', pro: 'Pro', business: 'Business' };

const CODE_TIER = { free: 'free', trial: 'business', standard: 'pro', professional: 'business', enterprise: 'business' };

/** Business-only (or Pro-only) features. Keys are `<app>.<feature>`. */
const FEATURES = {
  'crm.ai_sdr': { app: 'crm', tier: 'business', label: 'AI SDR' },
  'crm.call_coach': { app: 'crm', tier: 'business', label: 'Call coach' },
  'crm.forecast': { app: 'crm', tier: 'business', label: 'Sales forecast' },
  'pm.client_portal': { app: 'pm', tier: 'business', label: 'Client portal' },
  'pm.profitability': { app: 'pm', tier: 'business', label: 'Project profitability' },
  'pm.ai_teammates': { app: 'pm', tier: 'business', label: 'AI teammates' },
};

/**
 * Default limits per app and plan code. null = no limit.
 * aiCreditsMonthly is stored for later use (AI features are not metered yet).
 */
const PLAN_LIMITS = {
  crm: {
    free: { maxUsers: 2, maxContacts: 500, aiCreditsMonthly: 0 },
    standard: { maxUsers: null, maxContacts: null, aiCreditsMonthly: 100 },
    professional: { maxUsers: null, maxContacts: null, aiCreditsMonthly: 1000 },
    enterprise: { maxUsers: null, maxContacts: null, aiCreditsMonthly: 1000 },
  },
  pm: {
    free: { maxUsers: 5, maxContacts: null, aiCreditsMonthly: 0 },
    standard: { maxUsers: null, maxContacts: null, aiCreditsMonthly: 100 },
    professional: { maxUsers: null, maxContacts: null, aiCreditsMonthly: 1000 },
    enterprise: { maxUsers: null, maxContacts: null, aiCreditsMonthly: 1000 },
  },
};

const APP_LABEL = { crm: 'Fudge Grow', pm: 'Fudge Work' };

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

function tierFor(planCode, plan) {
  return (plan && TIER_RANK[plan.tier] !== undefined ? plan.tier : null) || CODE_TIER[planCode] || 'free';
}

/**
 * Plan details for one subscription: tier, limits, AI credits and allowed feature keys.
 * Works with or without the plan relation populated (falls back to the defaults above).
 */
function planEntitlements(sub) {
  const app = sub.app?.slug || null;
  const planCode = sub.planCode || (sub.status === 'trial' ? 'trial' : null);
  const plan = sub.plan && typeof sub.plan === 'object' ? sub.plan : null;
  const tier = tierFor(planCode, plan);
  const defaults = (PLAN_LIMITS[app] || {})[planCode] || {};
  const isTrial = sub.status === 'trial' || planCode === 'trial';
  // Paid plans are capped by the seats bought (see seatLimitProblem); maxUsers is the plan ceiling.
  const maxUsers = isTrial ? null : num(plan?.maxUsers) ?? defaults.maxUsers ?? null;
  const maxContacts = isTrial ? null : num(plan?.maxContacts) ?? defaults.maxContacts ?? null;
  const aiCreditsMonthly = num(plan?.aiCreditsMonthly) ?? defaults.aiCreditsMonthly ?? 0;
  const features = Object.entries(FEATURES)
    .filter(([, f]) => f.app === app && TIER_RANK[tier] >= TIER_RANK[f.tier])
    .map(([key]) => key);
  return {
    tier,
    tierLabel: TIER_LABEL[tier],
    limits: { users: maxUsers, contacts: maxContacts },
    aiCreditsMonthly,
    features,
  };
}

function accountsBillingUrl(app) {
  const base = (process.env.ACCOUNTS_URL || '').replace(/\/+$/, '');
  return `${base}/billing?app=${encodeURIComponent(app)}`;
}

function planError(ctx, { code, message, app, ...details }) {
  ctx.status = 402;
  ctx.body = {
    data: null,
    error: { status: 402, name: 'PlanLimitError', message, details: { code, app, upgradeUrl: accountsBillingUrl(app), ...details } },
  };
}

/** True when the organization's current plan for the feature's app includes it. Always true on Internal. */
async function hasFeature(strapi, orgId, key) {
  if (!isSaas()) return true;
  const feature = FEATURES[key];
  if (!feature) throw new Error(`Unknown plan feature "${key}"`);
  const { getOrgAccess } = require('./saas-access');
  const access = (await getOrgAccess(strapi, orgId))[feature.app];
  return Boolean(access && access.access !== 'locked' && access.features?.includes(key));
}

/** Answers 402 PLAN_FEATURE_REQUIRED and returns false when the plan does not include the feature. */
async function requireFeature(ctx, strapi, key) {
  if (!isSaas()) return true;
  if (await hasFeature(strapi, ctx.state.orgId, key)) return true;
  const feature = FEATURES[key];
  planError(ctx, {
    code: 'PLAN_FEATURE_REQUIRED',
    app: feature.app,
    feature: key,
    requiredTier: feature.tier,
    message: `${feature.label} is part of the ${APP_LABEL[feature.app]} ${TIER_LABEL[feature.tier]} plan. Upgrade to use it.`,
  });
  return false;
}

async function contactCount(strapi, orgId) {
  return strapi.entityService.count('api::contact.contact', { filters: { organization: orgId } });
}

/**
 * Contacts the organization can still add on its Grow plan: Infinity when unlimited.
 * Returns { limit, count, remaining }.
 */
async function contactAllowance(strapi, orgId) {
  if (!isSaas() || !orgId) return { limit: null, count: null, remaining: Infinity };
  const { getOrgAccess } = require('./saas-access');
  const limit = (await getOrgAccess(strapi, orgId)).crm?.limits?.contacts ?? null;
  if (limit == null) return { limit: null, count: null, remaining: Infinity };
  const count = await contactCount(strapi, orgId);
  return { limit, count, remaining: Math.max(0, limit - count) };
}

const contactLimitMessage = (limit) =>
  `The Free plan includes up to ${limit} contacts. Upgrade ${APP_LABEL.crm} to Pro to add more.`;

/** Answers 402 PLAN_CONTACT_LIMIT and returns false when adding `adding` contacts would go over the plan. */
async function requireContactCapacity(ctx, strapi, adding = 1) {
  const { limit, count, remaining } = await contactAllowance(strapi, ctx.state.orgId);
  if (remaining >= adding) return true;
  planError(ctx, { code: 'PLAN_CONTACT_LIMIT', app: 'crm', limit, count, message: contactLimitMessage(limit) });
  return false;
}

module.exports = {
  TIER_RANK,
  TIER_LABEL,
  CODE_TIER,
  FEATURES,
  PLAN_LIMITS,
  APP_LABEL,
  tierFor,
  planEntitlements,
  accountsBillingUrl,
  planError,
  hasFeature,
  requireFeature,
  contactCount,
  contactAllowance,
  contactLimitMessage,
  requireContactCapacity,
};
