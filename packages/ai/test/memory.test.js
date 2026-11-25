'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  createMemory,
  createHashEmbedder,
  createVoyageEmbedder,
  createInMemoryStore,
  chunkText,
  createTranscriberFromEnv,
  createStubTranscriber,
} = require('../src');

test('memory search ranks the relevant note first and stays inside the organization', async () => {
  const memory = createMemory({ embedder: createHashEmbedder(), store: createInMemoryStore() });
  await memory.index(1, { sourceType: 'note', sourceId: 1, text: 'Client asked for GST invoices every month and wants payment by UPI.' });
  await memory.index(1, { sourceType: 'note', sourceId: 2, text: 'Team outing planned for Diwali in Lonavala.' });
  await memory.index(1, { sourceType: 'lead_company', sourceId: 3, text: 'Acme Steel, Pune. Manufacturing. Interested in bulk pricing.' });
  await memory.index(2, { sourceType: 'note', sourceId: 9, text: 'Other org: GST invoices monthly via UPI payment.' });

  const hits = await memory.search(1, 'GST invoice payment', { k: 3 });
  assert.equal(hits[0].sourceId, '1');
  assert.ok(hits.every((h) => h.sourceId !== '9'), 'never returns another organization');

  const leadsOnly = await memory.search(1, 'manufacturing Pune', { sourceTypes: ['lead_company'] });
  assert.equal(leadsOnly.length, 1);
  assert.equal(leadsOnly[0].sourceId, '3');
});

test('memory works for Hindi and Marathi text', async () => {
  const memory = createMemory();
  await memory.index(1, { sourceType: 'note', sourceId: 'hi', text: 'ग्राहक ने अगले महीने डेमो के लिए कहा है' });
  await memory.index(1, { sourceType: 'note', sourceId: 'mr', text: 'ग्राहकाला पुण्यात कारखाना आहे आणि किंमत हवी आहे' });
  const hi = await memory.search(1, 'डेमो अगले महीने');
  assert.equal(hi[0].sourceId, 'hi');
  const mr = await memory.search(1, 'पुण्यात कारखाना');
  assert.equal(mr[0].sourceId, 'mr');
});

test('re-indexing a source replaces its old chunks; remove deletes them', async () => {
  const store = createInMemoryStore();
  const memory = createMemory({ store });
  await memory.index(1, { sourceType: 'note', sourceId: 5, text: 'first version about pricing' });
  await memory.index(1, { sourceType: 'note', sourceId: 5, text: 'second version about delivery' });
  assert.equal(store.rows.length, 1);
  assert.match(store.rows[0].text, /second/);
  await memory.remove(1, 'note', 5);
  assert.equal(store.rows.length, 0);
  assert.deepEqual(await memory.search(1, 'delivery'), []);
});

test('chunkText splits long text on sentence boundaries', () => {
  const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} talks about a thing.`).join(' ');
  const chunks = chunkText(text, 200);
  assert.ok(chunks.length > 5);
  assert.ok(chunks.every((c) => c.length <= 200));
  assert.deepEqual(chunkText('   '), []);
});

test('voyage embedder: posts to the embeddings API and needs a key', async () => {
  let body;
  const fetchImpl = async (url, init) => {
    assert.equal(url, 'https://api.voyageai.com/v1/embeddings');
    body = JSON.parse(init.body);
    return { ok: true, json: async () => ({ data: [{ index: 0, embedding: [3, 4] }] }) };
  };
  const e = createVoyageEmbedder({ apiKey: 'k', model: 'voyage-3.5-lite', fetchImpl });
  const [v] = await e.embed(['hello'], { inputType: 'query' });
  assert.deepEqual(v, [0.6, 0.8]);
  assert.equal(body.input_type, 'query');
  await assert.rejects(createVoyageEmbedder({ apiKey: '' }).embed(['x']), (err) => err.code === 'AI_NOT_CONFIGURED');
});

test('transcription: unconfigured by default, stub for tests, validates audio', async () => {
  const none = createTranscriberFromEnv({});
  await assert.rejects(none.transcribe({ audio: Buffer.from('x'), mimeType: 'audio/ogg' }), (e) => e.code === 'AI_NOT_CONFIGURED');
  const stub = createStubTranscriber({ text: 'नमस्ते' });
  const out = await stub.transcribe({ audio: Buffer.from('x'), mimeType: 'audio/webm', language: 'hi' });
  assert.equal(out.text, 'नमस्ते');
  assert.equal(out.language, 'hi');
  await assert.rejects(stub.transcribe({ audio: Buffer.alloc(0) }), /No audio/);
  await assert.rejects(stub.transcribe({ audio: Buffer.from('x'), mimeType: 'video/mp4' }), /Unsupported/);
});

test('whisper transcriber: posts the audio with model and language, maps the result', async () => {
  const { createWhisperTranscriber } = require('../src');
  let sent;
  const fetchImpl = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/audio/transcriptions');
    assert.equal(init.headers.authorization, 'Bearer sk-test');
    sent = init.body;
    return { ok: true, json: async () => ({ text: ' नमस्ते, कल डेमो रखते हैं ', language: 'hindi', duration: 42.5, segments: [{ start: 0, end: 2, text: ' नमस्ते ' }] }) };
  };
  const t = createWhisperTranscriber({ apiKey: 'sk-test', fetchImpl });
  const out = await t.transcribe({ audio: Buffer.from('fake-audio'), mimeType: 'audio/ogg' });
  assert.equal(sent.get('model'), 'whisper-1');
  assert.equal(sent.get('response_format'), 'verbose_json');
  assert.equal(sent.get('language'), null); // auto-detect
  assert.equal(sent.get('file').name, 'voice-note.ogg');
  assert.equal(out.text, 'नमस्ते, कल डेमो रखते हैं');
  assert.equal(out.language, 'hi');
  assert.equal(out.durationSec, 42.5);
  assert.equal(out.segments[0].text, 'नमस्ते');

  await t.transcribe({ audio: Buffer.from('x'), mimeType: 'audio/webm', language: 'mr' });
  assert.equal(sent.get('language'), 'mr');

  const busy = createWhisperTranscriber({ apiKey: 'k', fetchImpl: async () => ({ ok: false, status: 429 }) });
  await assert.rejects(busy.transcribe({ audio: Buffer.from('x'), mimeType: 'audio/webm' }), (e) => e.code === 'AI_PROVIDER_ERROR' && e.retryable);
  await assert.rejects(createWhisperTranscriber({ apiKey: '' }).transcribe({ audio: Buffer.from('x'), mimeType: 'audio/webm' }), (e) => e.code === 'AI_NOT_CONFIGURED');
  const { createTranscriberFromEnv } = require('../src');
  assert.equal(createTranscriberFromEnv({ AI_TRANSCRIPTION_PROVIDER: 'whisper', OPENAI_API_KEY: 'k' }).name, 'whisper');
});
