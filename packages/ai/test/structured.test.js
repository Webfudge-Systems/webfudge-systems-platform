'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAiClient, createMockProvider, generateObject, providerSchema, parseJson, renderTemplate, listTemplates, registerTemplate } = require('../src');

const schema = {
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    reasons: { type: 'array', items: { type: 'string', maxLength: 50 }, minItems: 1, maxItems: 3 },
  },
  required: ['score', 'reasons'],
  additionalProperties: false,
};

test('providerSchema strips keywords structured outputs does not support', () => {
  const s = providerSchema(schema);
  assert.equal(s.properties.score.minimum, undefined);
  assert.equal(s.properties.score.maximum, undefined);
  assert.equal(s.properties.reasons.maxItems, undefined);
  assert.equal(s.properties.reasons.items.maxLength, undefined);
  assert.equal(s.additionalProperties, false);
  assert.deepEqual(s.required, ['score', 'reasons']);
  // The original is untouched (still validated locally).
  assert.equal(schema.properties.score.maximum, 100);
});

test('parseJson handles fences and prose', () => {
  assert.deepEqual(parseJson('```json\n{"a":1}\n```').value, { a: 1 });
  assert.deepEqual(parseJson('Sure! {"a":2} hope that helps').value, { a: 2 });
  assert.equal(parseJson('no json here').ok, false);
});

test('structured output: valid first answer', async () => {
  const provider = createMockProvider({ responses: ['{"score": 72, "reasons": ["Has email"]}'] });
  const ai = createAiClient({ provider, env: {} });
  const res = await generateObject(ai, { feature: 'f', task: 'extract', schema, prompt: 'x' });
  assert.deepEqual(res.object, { score: 72, reasons: ['Has email'] });
  assert.equal(res.attempts, 1);
  // Native schema mode: stripped schema is sent to the provider.
  assert.equal(provider.calls[0].jsonSchema.properties.score.maximum, undefined);
});

test('structured output: retries on invalid JSON and on schema violations, feeding errors back', async () => {
  const provider = createMockProvider({
    responses: [
      'not json at all',
      '{"score": 140, "reasons": ["too high"]}', // violates maximum (only checked locally)
      '{"score": 90, "reasons": ["Fixed"]}',
    ],
  });
  const records = [];
  const ai = createAiClient({ provider, env: {}, meter: { record: async (r) => records.push(r) } });
  const res = await generateObject(ai, { feature: 'grow.lead_score', task: 'score', schema, prompt: 'x' });
  assert.equal(res.object.score, 90);
  assert.equal(res.attempts, 3);
  assert.equal(records.length, 3); // each attempt is metered
  assert.equal(res.credits, 3);
  const lastCall = provider.calls[2];
  const feedback = lastCall.messages[lastCall.messages.length - 1].content;
  assert.match(feedback, /must be <= 100/);
  assert.equal(lastCall.messages[lastCall.messages.length - 2].role, 'assistant');
});

test('structured output: gives up with AI_INVALID_OUTPUT after maxAttempts', async () => {
  const provider = createMockProvider({ respond: () => '{"score": "high"}' });
  const ai = createAiClient({ provider, env: {} });
  await assert.rejects(generateObject(ai, { feature: 'f', schema, prompt: 'x', maxAttempts: 2 }), (err) => {
    assert.equal(err.code, 'AI_INVALID_OUTPUT');
    return true;
  });
  assert.equal(provider.calls.length, 2);
});

test('structured output: providers without native JSON schema get the schema in the system prompt', async () => {
  const provider = createMockProvider({ supportsJsonSchema: false, responses: ['{"score": 1, "reasons": ["a"]}'] });
  const ai = createAiClient({ provider, env: {} });
  await generateObject(ai, { feature: 'f', schema, system: 'Base.', prompt: 'x' });
  assert.equal(provider.calls[0].jsonSchema, undefined);
  assert.match(provider.calls[0].system, /^Base\.\n\nReply with only a JSON value/);
});

test('templates: per-app registry with English, Hindi and Marathi output', () => {
  const keys = listTemplates().map((t) => t.key);
  assert.ok(keys.includes('grow.lead_score'));
  assert.ok(keys.includes('grow.followup_email'));
  assert.ok(keys.includes('work.task_summary'));
  assert.ok(keys.includes('work.weekly_status'));
  assert.ok(listTemplates('work').every((t) => t.app === 'work' && t.key.startsWith('work.')));

  const en = renderTemplate('grow.lead_score', { lead: { companyName: 'Acme', email: 'a@acme.in', id: 9 } });
  assert.equal(en.task, 'score');
  assert.equal(en.language, 'en');
  assert.match(en.prompt, /"companyName": "Acme"/);
  assert.doesNotMatch(en.prompt, /"id"/);
  assert.match(en.prompt, /Output language: English/);

  const hi = renderTemplate('grow.lead_score', { lead: { companyName: 'Acme' } }, { language: 'hi' });
  assert.match(hi.prompt, /Output language: Hindi/);
  assert.equal(hi.system, en.system); // system prompt identical across languages → shared cache prefix
  const mr = renderTemplate('grow.lead_score', { lead: {} }, { language: 'mr-IN' });
  assert.equal(mr.language, 'mr');
  assert.equal(renderTemplate('grow.lead_score', { lead: {} }, { language: 'fr' }).language, 'en');

  assert.throws(() => registerTemplate({ key: 'sales.x', user: () => '' }), /must start with/);
  assert.throws(() => registerTemplate({ key: 'grow.lead_score', user: () => '' }), /already registered/);
});
