'use strict';

/**
 * Business memory storage for the backend.
 *
 * Rows live in api::ai.ai-memory-chunk (text + embedding as JSON), so it works on SQLite locally
 * and on any Postgres. Search loads the org's chunks for the current embedding model (capped by
 * AI_MEMORY_SCAN_LIMIT, default 5000) and ranks by cosine similarity in Node.
 *
 * On Postgres with the pgvector extension installed (CREATE EXTENSION vector; done by a DBA, never
 * by this code), vectors are also written to a side table ai_memory_vectors and search runs in SQL
 * (embedding <=> query). Set AI_MEMORY_PGVECTOR=off to force the fallback.
 *
 *   const memory = getMemory(strapi);
 *   await memory.index(orgId, { sourceType: 'note', sourceId: 12, text });
 *   const hits = await memory.search(orgId, 'GST invoice', { k: 5 });
 */

const { createMemory, createEmbedderFromEnv, cosine } = require('@webfudge/ai');

const CHUNK_UID = 'api::ai.ai-memory-chunk';
const VECTOR_TABLE = 'ai_memory_vectors';

let pgvector = null; // null = not checked yet, true/false after the check

async function pgvectorAvailable(strapi) {
  if (pgvector !== null) return pgvector;
  pgvector = false;
  if (String(process.env.AI_MEMORY_PGVECTOR || 'auto').toLowerCase() === 'off') return pgvector;
  const client = strapi.db?.config?.connection?.client || strapi.db?.dialect?.client;
  if (!/^(pg|postgres)/.test(String(client || ''))) return pgvector;
  try {
    const knex = strapi.db.connection;
    const res = await knex.raw("select 1 from pg_extension where extname = 'vector'");
    if (!res.rows?.length) return pgvector;
    await knex.raw(`create table if not exists ${VECTOR_TABLE} (chunk_id integer primary key, org_key integer not null, model text not null, embedding vector not null)`);
    await knex.raw(`create index if not exists ${VECTOR_TABLE}_org_model on ${VECTOR_TABLE} (org_key, model)`);
    pgvector = true;
    strapi.log.info('[ai] business memory: using pgvector');
  } catch (err) {
    strapi.log.warn(`[ai] pgvector not used (${err.message}); falling back to in-app cosine search`);
  }
  return pgvector;
}

const toVectorLiteral = (v) => `[${v.map((x) => Number(x).toFixed(6)).join(',')}]`;

function createStrapiMemoryStore(strapi) {
  const knex = () => strapi.db.connection;
  return {
    name: 'strapi',
    async upsert(orgId, items) {
      const usePg = await pgvectorAvailable(strapi);
      for (const it of items) {
        const row = await strapi.entityService.create(CHUNK_UID, {
          data: {
            organization: orgId,
            orgKey: Number(orgId),
            sourceType: it.sourceType,
            sourceId: String(it.sourceId),
            chunkIndex: it.chunkIndex,
            text: it.text,
            embedding: usePg ? null : it.embedding,
            model: it.model,
            contentHash: it.contentHash,
            metadata: it.metadata,
          },
        });
        if (usePg) {
          await knex().raw(`insert into ${VECTOR_TABLE} (chunk_id, org_key, model, embedding) values (?, ?, ?, ?::vector) on conflict (chunk_id) do update set embedding = excluded.embedding, model = excluded.model`, [row.id, Number(orgId), it.model, toVectorLiteral(it.embedding)]);
        }
      }
    },
    async removeSource(orgId, sourceType, sourceId) {
      const where = { orgKey: Number(orgId), sourceType, sourceId: String(sourceId) };
      if (await pgvectorAvailable(strapi)) {
        const ids = (await strapi.db.query(CHUNK_UID).findMany({ where, select: ['id'] })).map((r) => r.id);
        if (ids.length) await knex()(VECTOR_TABLE).whereIn('chunk_id', ids).del();
      }
      await strapi.db.query(CHUNK_UID).deleteMany({ where });
    },
    async search(orgId, vector, { k = 5, sourceTypes, model } = {}) {
      const where = { orgKey: Number(orgId) };
      if (model) where.model = model;
      if (sourceTypes?.length) where.sourceType = { $in: sourceTypes };
      const fields = ['id', 'sourceType', 'sourceId', 'chunkIndex', 'text', 'metadata'];

      if (await pgvectorAvailable(strapi)) {
        const res = await knex().raw(
          `select chunk_id, 1 - (embedding <=> ?::vector) as score from ${VECTOR_TABLE} where org_key = ? ${model ? 'and model = ?' : ''} order by embedding <=> ?::vector limit ?`,
          [toVectorLiteral(vector), Number(orgId), ...(model ? [model] : []), toVectorLiteral(vector), sourceTypes?.length ? k * 4 : k]
        );
        const scores = new Map(res.rows.map((r) => [r.chunk_id, Number(r.score)]));
        if (!scores.size) return [];
        const rows = await strapi.db.query(CHUNK_UID).findMany({ where: { ...where, id: { $in: [...scores.keys()] } }, select: fields });
        return rows.map((r) => ({ ...r, score: scores.get(r.id) })).sort((a, b) => b.score - a.score).slice(0, k);
      }

      const limit = Number(process.env.AI_MEMORY_SCAN_LIMIT) || 5000;
      const rows = await strapi.db.query(CHUNK_UID).findMany({ where, select: [...fields, 'embedding'], orderBy: { id: 'desc' }, limit });
      return rows
        .map((r) => ({ ...r, score: cosine(vector, Array.isArray(r.embedding) ? r.embedding : []), embedding: undefined }))
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
    },
  };
}

let memory = null;
function getMemory(strapi) {
  if (!memory) memory = createMemory({ embedder: createEmbedderFromEnv(process.env), store: createStrapiMemoryStore(strapi) });
  return memory;
}

/** Index a record without ever failing the caller (memory is best-effort). */
async function indexQuietly(strapi, orgId, doc) {
  try {
    return await getMemory(strapi).index(orgId, doc);
  } catch (err) {
    strapi.log.warn(`[ai] memory index failed for ${doc.sourceType}:${doc.sourceId}: ${err.message}`);
    return null;
  }
}

module.exports = { CHUNK_UID, getMemory, indexQuietly, createStrapiMemoryStore, pgvectorAvailable };
