'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createAiClient,
  createMockProvider,
  resolveModel,
  costUsd,
  creditsFor,
  AiCreditsExhaustedError,
  AiProviderError,
  AiTimeoutError,
} = require('../src');

test('routing: tasks map to tiers and tiers to default models', () => {
  const env = {};
  assert.deepEqual(resolveModel({ task: 'classify' }, env), { model: 'claude-haiku-5-5', tier: 'cheap' });
  assert.deepEqual(resolveModel({ task: 'extract' }, env), { model: 'claude-haiku-5-5', tier: 'cheap' });
  assert.deepEqual(resolveModel({ task: 'score' }, env), { model: 'claude-haiku-5-5', tier: 'cheap' });
  assert.deepEqual(resolveModel({ task: 'draft' }, env), { model: 'claude-sonnet-5-5', tier: 'strong' });
  assert.deepEqual(resolveModel({ task: 'reason' }, env), { model: 'claude-sonnet-5-5', tier: 'strong' });
  assert.deepEqual(resolveModel({ task: 'something-new' }, env), { model: 'claude-sonnet-5-5', tier: 'strong' });
  assert.deepEqual(resolveModel({ tier: 'premium' }, env), { model: 'claude-opus-5-5', tier: 'premium' });
});

test('routing: env overrides per tier, explicit model wins, bad tier throws', () => {
  const env = { AI_MODEL_CHEAP: 'claude-haiku-4-5', AI_MODEL_STRONG: 'claude-opus-5-5' };
  assert.equal(resolveModel({ task: 'classify' }, env).model, 'claude-haiku-4-5');
  assert.equal(resolveModel({ task: 'draft' }, env).model, 'claude-opus-5-5');
  assert.equal(resolveModel({ task: 'draft', model: 'x-model' }, env).model, 'x-model');
  assert.throws(() => resolveModel({ tier: 'huge' }, env), /Unknown AI tier/);
});

test('cost and credits', () => {
  // Haiku 5.5: $0.10 in / $0.50 out per MTok
  const cost = costUsd('claude-haiku-5-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 }, {});
  assert.equal(cost, 0.6);
  assert.equal(creditsFor(0.6, {}), 60); // $0.01 per credit
  assert.equal(creditsFor(0.00001, {}), 1); // minimum 1 credit per call
  assert.equal(creditsFor(0.00001, { AI_MIN_CREDITS_PER_CALL: '0' }), 1); // still rounds up a non-zero cost
  assert.equal(creditsFor(0.05, { AI_CREDIT_USD: '0.1' }), 1);
  // Unknown model is priced at the strong tier, never free.
  assert.ok(costUsd('who-knows', { inputTokens: 1000 }, {}) > 0);
});

test('generate: routes, calls provider and records usage on the meter', async () => {
  const provider = createMockProvider({ responses: [{ text: 'hello', usage: { inputTokens: 100, outputTokens: 20, cacheReadTokens: 0, cacheWriteTokens: 0 } }] });
  const records = [];
  const ai = createAiClient({ provider, env: {}, meter: { check: async () => {}, record: async (r) => records.push(r) } });
  const res = await ai.generate({ feature: 'grow.test', task: 'classify', system: 'sys', prompt: 'hi' });
  assert.equal(res.text, 'hello');
  assert.equal(res.model, 'claude-haiku-5-5');
  assert.equal(provider.calls[0].model, 'claude-haiku-5-5');
  assert.equal(provider.calls[0].effort, 'low'); // cheap tier default
  assert.equal(records.length, 1);
  assert.equal(records[0].feature, 'grow.test');
  assert.equal(records[0].status, 'ok');
  assert.equal(records[0].credits, 1);
  assert.equal(records[0].usage.inputTokens, 100);
});

test('metering: an exhausted allowance blocks the call before the provider is reached', async () => {
  const provider = createMockProvider({ defaultText: 'should not be called' });
  const meter = {
    check: async () => {
      throw new AiCreditsExhaustedError(undefined, { used: 100, allowance: 100 });
    },
    record: async () => assert.fail('nothing to record'),
  };
  const ai = createAiClient({ provider, meter, env: {} });
  await assert.rejects(ai.generate({ feature: 'grow.lead_score', task: 'score', prompt: 'x' }), (err) => {
    assert.equal(err.code, 'AI_CREDITS_EXHAUSTED');
    assert.equal(err.status, 402);
    return true;
  });
  assert.equal(provider.calls.length, 0);
});

test('retries retryable provider errors, then succeeds', async () => {
  const provider = createMockProvider({
    responses: [new AiProviderError('busy', { status: 429, retryable: true }), new AiProviderError('busy', { status: 429, retryable: true }), 'third time'],
  });
  const ai = createAiClient({ provider, env: {}, retries: 2, retryDelayMs: 1 });
  const res = await ai.generate({ feature: 'f', prompt: 'x' });
  assert.equal(res.text, 'third time');
  assert.equal(res.attempts, 3);
});

test('does not retry non-retryable errors and records the failure with 0 credits', async () => {
  const provider = createMockProvider({ responses: [new AiProviderError('bad request', { status: 400, retryable: false }), 'never'] });
  const records = [];
  const ai = createAiClient({ provider, env: {}, retries: 2, retryDelayMs: 1, meter: { record: async (r) => records.push(r) } });
  await assert.rejects(ai.generate({ feature: 'f', prompt: 'x' }), /bad request/);
  assert.equal(provider.calls.length, 1);
  assert.equal(records[0].status, 'error');
  assert.equal(records[0].credits, 0);
});

test('timeout: a slow provider is cut off and retried', async () => {
  const provider = createMockProvider({ responses: [{ text: 'slow', delayMs: 200 }, 'fast'] });
  const ai = createAiClient({ provider, env: {}, timeoutMs: 30, retries: 1, retryDelayMs: 1 });
  const res = await ai.generate({ feature: 'f', prompt: 'x' });
  assert.equal(res.text, 'fast');

  const provider2 = createMockProvider({ responses: [{ text: 'slow', delayMs: 200 }] });
  const ai2 = createAiClient({ provider: provider2, env: {}, timeoutMs: 30, retries: 0 });
  await assert.rejects(ai2.generate({ feature: 'f', prompt: 'x' }), (err) => err instanceof AiTimeoutError);
});

test('generate requires a feature key', async () => {
  const ai = createAiClient({ provider: createMockProvider(), env: {} });
  await assert.rejects(ai.generate({ prompt: 'x' }), /feature/);
});
