'use strict';

/**
 * @webfudge/ai — Fudge AI foundation. SERVER-SIDE ONLY: never import this from a Next.js app
 * (it reads provider keys from the environment). Browser code calls the backend /api/ai/* and
 * feature endpoints instead. See docs/AI_PLATFORM.md.
 */

const { createAiClient } = require('./client');
const { createAnthropicProvider } = require('./providers/anthropic');
const { createMockProvider } = require('./providers/mock');
const { AiNotConfiguredError } = require('./errors');

/**
 * Provider from env: AI_PROVIDER = anthropic (default) | mock.
 * `mockRespond` is the responder used when AI_PROVIDER=mock (local end-to-end runs).
 */
function createProviderFromEnv(env = process.env, { mockRespond } = {}) {
  const name = String(env.AI_PROVIDER || 'anthropic').toLowerCase();
  if (name === 'anthropic') return createAnthropicProvider({ apiKey: env.ANTHROPIC_API_KEY, timeoutMs: Number(env.AI_TIMEOUT_MS) || 60000, env });
  if (name === 'mock') return createMockProvider({ respond: mockRespond });
  throw new AiNotConfiguredError(`Unknown AI_PROVIDER "${name}" (use anthropic or mock).`);
}

module.exports = {
  createAiClient,
  createProviderFromEnv,
  createAnthropicProvider,
  createMockProvider,
  ...require('./models'),
  ...require('./structured'),
  ...require('./templates'),
  ...require('./memory'),
  ...require('./transcription'),
  ...require('./actions'),
  ...require('./errors'),
};
