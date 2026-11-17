/**
 * Configurable deal pipelines + lead statuses (ticket G2) — Strapi /crm-pipelines.
 * Each pipeline: { id, name, entity: 'deal'|'lead', isDefault, sortOrder, stages: [...] }.
 * Stage: { key, label, color, kind: 'open'|'won'|'lost', probability?, requiredFields? }.
 */
import strapiClient from '../strapiClient';

const ENDPOINT = '/crm-pipelines';

const pipelineService = {
  /** @param {'deal'|'lead'} entity */
  async list(entity = 'deal') {
    const res = await strapiClient.get(ENDPOINT, { entity });
    return { data: Array.isArray(res?.data) ? res.data : [], meta: res?.meta || {} };
  },

  async create(payload) {
    const res = await strapiClient.post(ENDPOINT, { data: payload });
    return res?.data;
  },

  async update(id, payload) {
    const res = await strapiClient.put(`${ENDPOINT}/${id}`, { data: payload });
    return res?.data;
  },

  async remove(id) {
    return strapiClient.delete(`${ENDPOINT}/${id}`);
  },
};

/** The org's default pipeline from a list. */
export function defaultPipelineOf(pipelines) {
  return (pipelines || []).find((p) => p.isDefault) || (pipelines || [])[0] || null;
}

/** Which pipeline a deal belongs to (deals without one are in the default pipeline). */
export function dealPipelineId(deal, pipelines) {
  const raw = deal?.pipeline;
  const id = raw && typeof raw === 'object' ? raw.id : raw;
  if (id != null && id !== '') return Number(id);
  return defaultPipelineOf(pipelines)?.id ?? null;
}

/** The deal's stage key inside its pipeline (legacy deals: their `stage`, which matches the default pipeline keys). */
export function dealStageKey(deal) {
  if (deal?.pipelineStageKey) return String(deal.pipelineStageKey);
  return String(deal?.stage || 'discovery').toLowerCase();
}

export default pipelineService;
