'use strict';

/**
 * Business memory: a per-organization retrieval index over records, notes and chats.
 *
 *   const memory = createMemory({ embedder, store });
 *   await memory.index(orgId, { sourceType: 'lead_company', sourceId: 42, text: '...' });
 *   const hits = await memory.search(orgId, 'who asked about GST invoices?', { k: 5 });
 *
 * Pluggable pieces:
 *   embedder — { name, model, dimensions, embed(texts, { inputType }) → number[][] }
 *     - createHashEmbedder(): local, free, deterministic (hashed word + bigram features). Lexical,
 *       not semantic, but works for English, Hindi and Marathi with no vendor. Default.
 *     - createVoyageEmbedder(): Voyage AI embeddings API (Anthropic's recommended embeddings
 *       partner). Set AI_EMBEDDINGS_PROVIDER=voyage and VOYAGE_API_KEY.
 *   store — { upsert(orgId, rows), removeSource(orgId, sourceType, sourceId), search(orgId, vector, opts) }
 *     - createInMemoryStore() here (tests); the backend has a Strapi store (SQLite/Postgres,
 *       cosine in JS) and uses pgvector when the extension is installed.
 * Every store method takes orgId first and must never return another organization's rows.
 */

const crypto = require('crypto');
const { AiNotConfiguredError, AiProviderError } = require('./errors');

// ---------- embedders ----------

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function tokenize(text) {
  return (String(text || '').toLowerCase().normalize('NFC').match(/[\p{L}\p{M}\p{N}]+/gu) || []).filter((t) => t.length > 1 || /\p{N}/u.test(t));
}

function normalize(vec) {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const n = Math.sqrt(sum) || 1;
  return vec.map((v) => v / n);
}

function createHashEmbedder({ dimensions = 512 } = {}) {
  function embedOne(text) {
    const vec = new Array(dimensions).fill(0);
    const tokens = tokenize(text);
    const features = [...tokens, ...tokens.slice(1).map((t, i) => `${tokens[i]}_${t}`)];
    const counts = new Map();
    for (const f of features) counts.set(f, (counts.get(f) || 0) + 1);
    for (const [f, c] of counts) {
      const h = fnv1a(f);
      vec[h % dimensions] += (h & 0x80000000 ? -1 : 1) * (1 + Math.log(c));
    }
    return normalize(vec);
  }
  return {
    name: 'hash',
    model: `hash-${dimensions}`,
    dimensions,
    async embed(texts) {
      return texts.map(embedOne);
    },
  };
}

function createVoyageEmbedder({ apiKey = process.env.VOYAGE_API_KEY, model = process.env.AI_EMBEDDINGS_MODEL || 'voyage-3.5-lite', timeoutMs = 30000, fetchImpl = globalThis.fetch } = {}) {
  return {
    name: 'voyage',
    model,
    dimensions: null,
    async embed(texts, { inputType = 'document' } = {}) {
      if (!apiKey) throw new AiNotConfiguredError('VOYAGE_API_KEY is not set on the API service.');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl('https://api.voyageai.com/v1/embeddings', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ input: texts, model, input_type: inputType }),
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new AiProviderError('The embeddings provider returned an error.', { status: 502, retryable: res.status === 429 || res.status >= 500, details: { providerStatus: res.status } });
        }
        const json = await res.json();
        return (json.data || []).sort((a, b) => a.index - b.index).map((d) => normalize(d.embedding));
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

/** Embedder from env: AI_EMBEDDINGS_PROVIDER = hash (default) | voyage. */
function createEmbedderFromEnv(env = process.env) {
  const name = String(env.AI_EMBEDDINGS_PROVIDER || 'hash').toLowerCase();
  if (name === 'voyage') return createVoyageEmbedder({ apiKey: env.VOYAGE_API_KEY, model: env.AI_EMBEDDINGS_MODEL || 'voyage-3.5-lite' });
  if (name === 'hash') return createHashEmbedder();
  throw new AiNotConfiguredError(`Unknown AI_EMBEDDINGS_PROVIDER "${name}" (use hash or voyage).`);
}

// ---------- helpers ----------

function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i += 1) dot += a[i] * b[i];
  return dot; // vectors are normalized
}

/** Splits text into chunks of about `size` characters on paragraph / sentence boundaries. */
function chunkText(text, size = 800) {
  const clean = String(text || '').replace(/\r/g, '').trim();
  if (!clean) return [];
  if (clean.length <= size) return [clean];
  const pieces = clean.split(/(?<=[.!?।\n])\s+/u);
  const chunks = [];
  let current = '';
  for (const p of pieces) {
    if (current && current.length + p.length + 1 > size) {
      chunks.push(current.trim());
      current = '';
    }
    if (p.length > size) {
      for (let i = 0; i < p.length; i += size) chunks.push(p.slice(i, i + size));
    } else {
      current += `${current ? ' ' : ''}${p}`;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex').slice(0, 32);

// ---------- in-memory store (tests, scripts) ----------

function createInMemoryStore() {
  const rows = [];
  return {
    name: 'memory',
    rows,
    async upsert(orgId, items) {
      for (const it of items) rows.push({ ...it, orgId: String(orgId) });
    },
    async removeSource(orgId, sourceType, sourceId) {
      for (let i = rows.length - 1; i >= 0; i -= 1) {
        const r = rows[i];
        if (r.orgId === String(orgId) && r.sourceType === sourceType && String(r.sourceId) === String(sourceId)) rows.splice(i, 1);
      }
    },
    async search(orgId, vector, { k = 5, sourceTypes, model } = {}) {
      return rows
        .filter((r) => r.orgId === String(orgId) && (!sourceTypes || sourceTypes.includes(r.sourceType)) && (!model || r.model === model))
        .map((r) => ({ ...r, score: cosine(vector, r.embedding) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    },
  };
}

// ---------- memory facade ----------

function createMemory({ embedder = createHashEmbedder(), store = createInMemoryStore(), chunkSize = 800, minScore = 0.05 } = {}) {
  async function index(orgId, { sourceType, sourceId, text, metadata = null }) {
    if (!orgId) throw new Error('memory.index needs an orgId');
    if (!sourceType || sourceId === undefined || sourceId === null) throw new Error('memory.index needs sourceType and sourceId');
    const chunks = chunkText(text, chunkSize);
    await store.removeSource(orgId, sourceType, sourceId);
    if (!chunks.length) return { chunks: 0 };
    const vectors = await embedder.embed(chunks, { inputType: 'document' });
    await store.upsert(
      orgId,
      chunks.map((c, i) => ({
        sourceType,
        sourceId: String(sourceId),
        chunkIndex: i,
        text: c,
        embedding: vectors[i],
        model: embedder.model,
        contentHash: sha(c),
        metadata,
      }))
    );
    return { chunks: chunks.length };
  }

  async function search(orgId, query, { k = 5, sourceTypes } = {}) {
    if (!orgId) throw new Error('memory.search needs an orgId');
    if (!String(query || '').trim()) return [];
    const [vector] = await embedder.embed([String(query)], { inputType: 'query' });
    const hits = await store.search(orgId, vector, { k, sourceTypes, model: embedder.model });
    return hits
      .filter((h) => h.score >= minScore)
      .map((h) => ({ sourceType: h.sourceType, sourceId: h.sourceId, chunkIndex: h.chunkIndex, text: h.text, score: Math.round(h.score * 1000) / 1000, metadata: h.metadata || null }));
  }

  async function remove(orgId, sourceType, sourceId) {
    await store.removeSource(orgId, sourceType, sourceId);
  }

  return { index, search, remove, embedder, store };
}

module.exports = {
  createMemory,
  createHashEmbedder,
  createVoyageEmbedder,
  createEmbedderFromEnv,
  createInMemoryStore,
  chunkText,
  cosine,
  tokenize,
};
