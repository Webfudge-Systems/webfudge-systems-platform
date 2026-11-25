'use strict';

/**
 * Provider-agnostic LLM client.
 *
 *   const ai = createAiClient({ provider, meter });
 *   const { text } = await ai.generate({ task: 'draft', feature: 'grow.followup', system, prompt });
 *
 * Per call: route to a model (task → tier → model), check credits (meter.check), call the provider
 * with a timeout, retry retryable failures with exponential backoff, then record usage, cost and
 * credits (meter.record). The meter is injected so this package stays storage-agnostic; the
 * backend supplies one that reads the plan allowance and writes ai-usage rows.
 */

const { resolveModel, costUsd, creditsFor } = require('./models');
const { AiTimeoutError, AiError } = require('./errors');

const DEFAULT_EFFORT = { cheap: 'low' };

function withTimeout(promise, ms) {
  if (!ms) return promise;
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new AiTimeoutError(ms)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * @param {object} opts
 * @param {{ name: string, complete: Function, supportsJsonSchema?: boolean }} opts.provider
 * @param {{ check?: Function, record?: Function }} [opts.meter]
 * @param {number} [opts.timeoutMs]    per attempt (default AI_TIMEOUT_MS or 60000)
 * @param {number} [opts.retries]      extra attempts for retryable errors (default AI_MAX_RETRIES or 2)
 * @param {number} [opts.retryDelayMs] base backoff (default 500)
 */
function createAiClient({ provider, meter = null, env = process.env, timeoutMs, retries, retryDelayMs = 500, logger = null } = {}) {
  if (!provider || typeof provider.complete !== 'function') throw new Error('createAiClient needs a provider with complete()');
  const timeout = timeoutMs ?? (Number(env.AI_TIMEOUT_MS) || 60000);
  const maxRetries = retries ?? (env.AI_MAX_RETRIES !== undefined && env.AI_MAX_RETRIES !== '' ? Number(env.AI_MAX_RETRIES) : 2);

  /**
   * @param {object} o
   * @param {string} o.feature          metering key, e.g. "grow.lead_score" (required)
   * @param {string} [o.task]           classify | extract | score | draft | reason | summarize | ...
   * @param {string} [o.tier]           cheap | strong | premium (overrides task)
   * @param {string} [o.model]          exact model id (overrides tier)
   * @param {string} [o.system]
   * @param {string} [o.prompt]         shorthand for one user message
   * @param {Array}  [o.messages]
   * @param {number} [o.maxTokens]
   * @param {string} [o.effort]
   * @param {object} [o.jsonSchema]
   * @param {boolean}[o.cache]
   * @param {object} [o.metadata]       passed to meter.record (e.g. subject ids)
   */
  async function generate(o = {}) {
    if (!o.feature) throw new Error('generate() needs a `feature` key for metering');
    const { model, tier } = resolveModel(o, env);
    const messages = o.messages || [{ role: 'user', content: String(o.prompt ?? '') }];
    const call = { feature: o.feature, task: o.task || null, tier, model, provider: provider.name, metadata: o.metadata || null };

    if (meter && meter.check) await meter.check(call);

    const req = {
      model,
      system: o.system,
      messages,
      maxTokens: o.maxTokens || (tier === 'cheap' ? 1024 : 4096),
      effort: o.effort || DEFAULT_EFFORT[tier],
      jsonSchema: o.jsonSchema,
      cache: o.cache,
    };

    const started = Date.now();
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
      try {
        const res = await withTimeout(provider.complete(req), timeout);
        const usedModel = res.model || model;
        const cost = costUsd(usedModel, res.usage, env);
        const credits = creditsFor(cost, env);
        const out = {
          text: res.text,
          model: usedModel,
          tier,
          stopReason: res.stopReason,
          usage: res.usage,
          costUsd: cost,
          credits,
          attempts: attempt + 1,
          latencyMs: Date.now() - started,
        };
        if (meter && meter.record) {
          await meter.record({ ...call, model: usedModel, usage: res.usage, costUsd: cost, credits, latencyMs: out.latencyMs, status: 'ok' });
        }
        return out;
      } catch (err) {
        lastError = err;
        const retryable = Boolean(err && err.retryable);
        if (!retryable || attempt === maxRetries) break;
        const delay = retryDelayMs * 2 ** attempt + Math.floor(Math.random() * retryDelayMs);
        if (logger && logger.warn) logger.warn(`[ai] ${o.feature} attempt ${attempt + 1} failed (${err.code || err.message}); retrying in ${delay} ms`);
        await sleep(delay);
      }
    }

    if (meter && meter.record) {
      await meter
        .record({ ...call, usage: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0, credits: 0, latencyMs: Date.now() - started, status: 'error', error: lastError?.code || String(lastError?.message || lastError) })
        .catch(() => {});
    }
    if (lastError instanceof AiError) throw lastError;
    throw new AiError('The AI request failed.', { code: 'AI_ERROR', status: 502, cause: lastError });
  }

  return { generate, provider, resolveModel: (o) => resolveModel(o, env) };
}

module.exports = { createAiClient, withTimeout };
