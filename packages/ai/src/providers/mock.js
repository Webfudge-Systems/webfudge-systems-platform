'use strict';

/**
 * Deterministic provider for tests and local end-to-end runs (AI_PROVIDER=mock).
 *
 *   const provider = createMockProvider({ responses: ['{"score": 80}', new Error('boom')] });
 *   const provider = createMockProvider({ respond: (req) => ({ text: '...' }) });
 *
 * Each queued item is a string (the text), an object { text, usage, stopReason, delayMs } or an
 * Error to throw. With nothing queued and no `respond`, it answers with `defaultText`.
 * Every request is kept in `provider.calls` for assertions.
 */

function createMockProvider({ responses = [], respond, defaultText = 'ok', supportsJsonSchema = true } = {}) {
  const queue = [...responses];
  const calls = [];

  async function complete(req) {
    calls.push(req);
    let item = queue.length ? queue.shift() : respond ? await respond(req, calls.length) : defaultText;
    if (item instanceof Error) throw item;
    if (typeof item === 'string') item = { text: item };
    if (item.delayMs) await new Promise((r) => setTimeout(r, item.delayMs));
    const inputChars = JSON.stringify(req.messages || []).length + String(req.system || '').length;
    return {
      text: item.text ?? '',
      model: item.model || req.model,
      stopReason: item.stopReason || 'end_turn',
      usage: item.usage || {
        inputTokens: Math.ceil(inputChars / 4),
        outputTokens: Math.ceil(String(item.text ?? '').length / 4),
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
      },
    };
  }

  return {
    name: 'mock',
    supportsJsonSchema,
    complete,
    calls,
    push: (...items) => queue.push(...items),
  };
}

module.exports = { createMockProvider };
