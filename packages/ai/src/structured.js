'use strict';

/**
 * JSON schema → validated object.
 *
 *   const { object } = await generateObject(ai, { feature, task: 'extract', schema, system, prompt });
 *
 * The provider is asked for schema-constrained JSON when it supports it (Claude structured
 * outputs). Keywords the API does not enforce (minimum, maxLength, maxItems, ...) are stripped from
 * the schema sent to the provider and checked here with Ajv against the full schema. Invalid or
 * unparsable output is retried with the validation errors fed back to the model. Every attempt is
 * metered (each one is a real call).
 */

const Ajv = require('ajv');
const { AiInvalidOutputError } = require('./errors');

const ajv = new Ajv({ allErrors: true, strict: false });
const compiled = new WeakMap();

const PROVIDER_UNSUPPORTED = new Set([
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'minLength', 'maxLength', 'pattern',
  'minItems', 'maxItems', 'uniqueItems', 'contains',
  'minProperties', 'maxProperties',
]);

/** Copy of `schema` without keywords structured outputs rejects; objects get additionalProperties:false. */
function providerSchema(schema) {
  if (Array.isArray(schema)) return schema.map(providerSchema);
  if (!schema || typeof schema !== 'object') return schema;
  const out = {};
  for (const [k, v] of Object.entries(schema)) {
    if (PROVIDER_UNSUPPORTED.has(k)) continue;
    if (k === 'properties' || k === '$defs' || k === 'definitions') {
      out[k] = Object.fromEntries(Object.entries(v).map(([pk, pv]) => [pk, providerSchema(pv)]));
    } else if (typeof v === 'object' && v !== null) {
      out[k] = providerSchema(v);
    } else {
      out[k] = v;
    }
  }
  if (out.type === 'object') out.additionalProperties = false;
  return out;
}

function validatorFor(schema) {
  let v = compiled.get(schema);
  if (!v) {
    v = ajv.compile(schema);
    compiled.set(schema, v);
  }
  return v;
}

/** Pulls the first JSON value out of text (handles ```json fences and leading prose). */
function parseJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    return { ok: true, value: JSON.parse(candidate) };
  } catch (_) {
    const start = candidate.search(/[[{]/);
    const end = Math.max(candidate.lastIndexOf('}'), candidate.lastIndexOf(']'));
    if (start >= 0 && end > start) {
      try {
        return { ok: true, value: JSON.parse(candidate.slice(start, end + 1)) };
      } catch (e) {
        return { ok: false, error: `Not valid JSON: ${e.message}` };
      }
    }
    return { ok: false, error: 'The answer did not contain JSON.' };
  }
}

function formatErrors(errors = []) {
  return errors
    .slice(0, 10)
    .map((e) => `${e.instancePath || '(root)'} ${e.message}`)
    .join('; ');
}

/**
 * @param {{ generate: Function, provider?: { supportsJsonSchema?: boolean } }} ai  client from createAiClient
 * @param {object} o           same options as ai.generate, plus:
 * @param {object} o.schema    JSON schema of the result (required)
 * @param {number} [o.maxAttempts] default 3
 * @returns {Promise<{ object: any, attempts: number, credits: number, costUsd: number, model: string, calls: object[] }>}
 */
async function generateObject(ai, o = {}) {
  if (!o.schema) throw new Error('generateObject() needs a `schema`');
  const validate = validatorFor(o.schema);
  const maxAttempts = o.maxAttempts || 3;
  const nativeSchema = ai.provider?.supportsJsonSchema !== false;
  const schemaText = JSON.stringify(o.schema);
  const system = nativeSchema
    ? o.system
    : `${o.system ? `${o.system}\n\n` : ''}Reply with only a JSON value that matches this JSON schema, with no other text:\n${schemaText}`;

  const messages = o.messages ? [...o.messages] : [{ role: 'user', content: String(o.prompt ?? '') }];
  const calls = [];
  let lastProblem = '';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const res = await ai.generate({
      ...o,
      system,
      messages,
      jsonSchema: nativeSchema ? providerSchema(o.schema) : undefined,
      metadata: { ...(o.metadata || {}), attempt },
    });
    calls.push(res);
    const parsed = parseJson(res.text);
    if (parsed.ok && validate(parsed.value)) {
      return {
        object: parsed.value,
        attempts: attempt,
        credits: calls.reduce((s, c) => s + (c.credits || 0), 0),
        costUsd: calls.reduce((s, c) => s + (c.costUsd || 0), 0),
        model: res.model,
        calls,
      };
    }
    lastProblem = parsed.ok ? formatErrors(validate.errors) : parsed.error;
    messages.push({ role: 'assistant', content: res.text || '(empty)' });
    messages.push({
      role: 'user',
      content: `That answer was not valid: ${lastProblem}. Reply again with only JSON that matches the schema exactly.`,
    });
  }

  throw new AiInvalidOutputError(undefined, { attempts: maxAttempts, problem: lastProblem });
}

module.exports = { generateObject, providerSchema, parseJson };
