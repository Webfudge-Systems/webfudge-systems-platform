'use strict';

/**
 * Anthropic (Claude) adapter. The only file that imports the vendor SDK.
 *
 * - Prompt caching: the system prompt is sent as a cached block (cache_control ephemeral). Keep
 *   templates' system text stable and put per-record data in the user message so the prefix hits.
 * - Structured output: `jsonSchema` maps to output_config.format = json_schema.
 * - Refusals: on Sonnet/Opus 5.5 the server-side fallback beta re-runs a declined request on a
 *   fallback model (AI_REFUSAL_FALLBACK=off to disable). A final refusal raises AiRefusalError.
 * - Retries are done by the client wrapper (one policy for every provider), so the SDK's own
 *   retries are off here.
 */

const { AiNotConfiguredError, AiProviderError, AiRefusalError, AiTimeoutError } = require('../errors');

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
const FALLBACK_MODELS = new Set(['claude-sonnet-5-5', 'claude-opus-5-5']);

function loadSdk() {
  // Lazy so the package can be required (and tested) without the SDK being exercised.
  const mod = require('@anthropic-ai/sdk');
  return mod.default || mod.Anthropic || mod;
}

function createAnthropicProvider({ apiKey = process.env.ANTHROPIC_API_KEY, timeoutMs = 60000, env = process.env, client } = {}) {
  let sdkClient = client || null;
  let Anthropic = null;

  function getClient() {
    if (sdkClient) return sdkClient;
    if (!apiKey) throw new AiNotConfiguredError('ANTHROPIC_API_KEY is not set on the API service.');
    Anthropic = loadSdk();
    sdkClient = new Anthropic({ apiKey, timeout: timeoutMs, maxRetries: 0 });
    return sdkClient;
  }

  function mapError(err) {
    if (err && err.code && String(err.code).startsWith('AI_')) return err;
    const SDK = Anthropic || (() => { try { return loadSdk(); } catch (_) { return null; } })();
    if (SDK && SDK.APIConnectionTimeoutError && err instanceof SDK.APIConnectionTimeoutError) return new AiTimeoutError(timeoutMs, err);
    if (SDK && SDK.APIConnectionError && err instanceof SDK.APIConnectionError) {
      return new AiProviderError('Could not reach the AI provider.', { status: 502, retryable: true, cause: err });
    }
    const status = err && typeof err.status === 'number' ? err.status : null;
    if (status) {
      const retryable = status === 408 || status === 409 || status === 429 || status >= 500;
      return new AiProviderError(status === 429 ? 'The AI provider is busy. Please try again shortly.' : 'The AI provider returned an error.', {
        status: status === 429 ? 429 : 502,
        retryable,
        cause: err,
        details: { providerStatus: status },
      });
    }
    return new AiProviderError('The AI provider returned an error.', { cause: err });
  }

  /**
   * @param {object} req
   * @param {string} req.model
   * @param {string} [req.system]
   * @param {Array<{role:'user'|'assistant', content:any}>} req.messages
   * @param {number} [req.maxTokens]
   * @param {object} [req.jsonSchema]  JSON schema for structured output
   * @param {string} [req.effort]      low | medium | high | xhigh | max
   * @param {boolean} [req.cache]      cache the system prompt (default true)
   */
  async function complete(req) {
    const c = getClient();
    const params = {
      model: req.model,
      max_tokens: req.maxTokens || 4096,
      messages: req.messages,
    };
    if (req.system) {
      params.system = req.cache === false ? req.system : [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }];
    }
    const outputConfig = {};
    if (req.effort) outputConfig.effort = req.effort;
    if (req.jsonSchema) outputConfig.format = { type: 'json_schema', schema: req.jsonSchema };
    if (Object.keys(outputConfig).length) params.output_config = outputConfig;

    const useFallback = FALLBACK_MODELS.has(req.model) && String(env.AI_REFUSAL_FALLBACK || 'on').toLowerCase() !== 'off';
    let response;
    try {
      response = useFallback
        ? await c.beta.messages.create({ ...params, betas: [FALLBACK_BETA], fallbacks: 'default' })
        : await c.messages.create(params);
    } catch (err) {
      throw mapError(err);
    }

    if (response.stop_reason === 'refusal') {
      throw new AiRefusalError({ category: response.stop_details?.category || null });
    }
    const text = (response.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('');
    const u = response.usage || {};
    return {
      text,
      model: response.model || req.model,
      stopReason: response.stop_reason,
      usage: {
        inputTokens: u.input_tokens || 0,
        outputTokens: u.output_tokens || 0,
        cacheReadTokens: u.cache_read_input_tokens || 0,
        cacheWriteTokens: u.cache_creation_input_tokens || 0,
      },
    };
  }

  return { name: 'anthropic', supportsJsonSchema: true, complete };
}

module.exports = { createAnthropicProvider };
