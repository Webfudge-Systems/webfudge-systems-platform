'use strict';

/**
 * Model catalogue, task → tier routing and cost/credit maths.
 *
 * Tiers:
 *   cheap   — classify, extract, score, tag, translate (default Claude Haiku 5.5)
 *   strong  — reasoning, drafting, summaries, planning (default Claude Sonnet 5.5)
 *   premium — opt-in only, for the hardest reasoning (default Claude Opus 5.5)
 *
 * Override per deployment with AI_MODEL_CHEAP / AI_MODEL_STRONG / AI_MODEL_PREMIUM.
 * Prices are Anthropic first-party list prices in USD per million tokens (Nov 2026). A model that
 * is not listed here is still usable; it is priced with AI_PRICE_<IN|OUT>_PER_MTOK or, failing
 * that, at the strong-tier price so metering never undercounts.
 */

const MODELS = {
  'claude-haiku-5-5': { provider: 'anthropic', input: 0.1, output: 0.5, cacheRead: 0.01, cacheWrite: 0.125 },
  'claude-sonnet-5-5': { provider: 'anthropic', input: 2, output: 10, cacheRead: 0.1, cacheWrite: 2.5 },
  'claude-opus-5-5': { provider: 'anthropic', input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 },
  // Test-only model used by the mock provider.
  'mock-model': { provider: 'mock', input: 1, output: 1, cacheRead: 0.1, cacheWrite: 1.25 },
};

const DEFAULT_TIER_MODELS = {
  cheap: 'claude-haiku-5-5',
  strong: 'claude-sonnet-5-5',
  premium: 'claude-opus-5-5',
};

/** Task kinds a feature can ask for. Unknown tasks default to the strong tier. */
const TASK_TIERS = {
  classify: 'cheap',
  extract: 'cheap',
  score: 'cheap',
  tag: 'cheap',
  translate: 'cheap',
  route: 'cheap',
  reason: 'strong',
  draft: 'strong',
  summarize: 'strong',
  plan: 'strong',
  chat: 'strong',
};

const TIERS = Object.keys(DEFAULT_TIER_MODELS);

/**
 * Picks the model for a call. Precedence: explicit `model` > explicit `tier` > tier for `task`.
 * @returns {{ model: string, tier: string }}
 */
function resolveModel({ task, tier, model } = {}, env = process.env) {
  const resolvedTier = tier || TASK_TIERS[task] || 'strong';
  if (!TIERS.includes(resolvedTier)) throw new Error(`Unknown AI tier "${resolvedTier}" (use ${TIERS.join(', ')})`);
  if (model) return { model, tier: resolvedTier };
  const fromEnv = env[`AI_MODEL_${resolvedTier.toUpperCase()}`];
  return { model: (fromEnv && fromEnv.trim()) || DEFAULT_TIER_MODELS[resolvedTier], tier: resolvedTier };
}

function priceFor(model, env = process.env) {
  if (MODELS[model]) return MODELS[model];
  const input = Number(env.AI_PRICE_IN_PER_MTOK);
  const output = Number(env.AI_PRICE_OUT_PER_MTOK);
  if (input > 0 && output > 0) return { input, output, cacheRead: input * 0.1, cacheWrite: input * 1.25 };
  return MODELS[DEFAULT_TIER_MODELS.strong];
}

/** USD cost of one call from normalized usage. */
function costUsd(model, usage = {}, env = process.env) {
  const p = priceFor(model, env);
  const m = 1e6;
  const cost =
    ((usage.inputTokens || 0) * p.input +
      (usage.outputTokens || 0) * p.output +
      (usage.cacheReadTokens || 0) * p.cacheRead +
      (usage.cacheWriteTokens || 0) * p.cacheWrite) /
    m;
  return Math.round(cost * 1e6) / 1e6;
}

/**
 * Credits charged for a cost. 1 credit = AI_CREDIT_USD (default $0.01), rounded up, with a floor of
 * AI_MIN_CREDITS_PER_CALL (default 1) so tiny calls are not free.
 */
function creditsFor(cost, env = process.env) {
  const usdPerCredit = Number(env.AI_CREDIT_USD) > 0 ? Number(env.AI_CREDIT_USD) : 0.01;
  const minCredits = env.AI_MIN_CREDITS_PER_CALL !== undefined && env.AI_MIN_CREDITS_PER_CALL !== '' ? Number(env.AI_MIN_CREDITS_PER_CALL) : 1;
  return Math.max(minCredits, Math.ceil(cost / usdPerCredit - 1e-9));
}

module.exports = { MODELS, DEFAULT_TIER_MODELS, TASK_TIERS, TIERS, resolveModel, priceFor, costUsd, creditsFor };
