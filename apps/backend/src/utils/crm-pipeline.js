'use strict';

/**
 * Configurable deal pipelines + lead statuses (ticket G2).
 *
 * - Each org has one or more deal pipelines (entity = 'deal') and exactly one lead status list
 *   (entity = 'lead'). Defaults are created lazily the first time an org reads them.
 * - Deals keep the legacy `stage` enum in sync so existing reports, won-deal automation and filters
 *   keep working: won/lost stages map to 'won'/'lost'; open stages map to their key when it is one
 *   of the legacy keys, otherwise to 'prospect'.
 * - Deals with no `pipeline` belong to the org's default pipeline; their stage key is the legacy
 *   `stage`, so no data migration is needed.
 */

const PIPELINE_UID = 'api::crm-pipeline.crm-pipeline';

const LEGACY_DEAL_STAGES = ['discovery', 'prospect', 'proposal', 'negotiation', 'won', 'lost'];

const DEFAULT_DEAL_STAGES = [
  { key: 'discovery', label: 'Discovery', probability: 10, color: 'blue', kind: 'open', requiredFields: [] },
  { key: 'prospect', label: 'Prospect', probability: 25, color: 'violet', kind: 'open', requiredFields: [] },
  { key: 'proposal', label: 'Proposal', probability: 50, color: 'amber', kind: 'open', requiredFields: [] },
  { key: 'negotiation', label: 'Negotiation', probability: 75, color: 'orange', kind: 'open', requiredFields: [] },
  { key: 'won', label: 'Won', probability: 100, color: 'emerald', kind: 'won', requiredFields: [] },
  { key: 'lost', label: 'Lost', probability: 0, color: 'red', kind: 'lost', requiredFields: [] },
];

/** System lead statuses drive conversion logic, so they can be renamed/reordered but not removed. */
const SYSTEM_LEAD_STATUSES = ['NEW', 'QUALIFIED', 'LOST', 'CONVERTED'];

const DEFAULT_LEAD_STATUSES = [
  { key: 'NEW', label: 'New', color: 'blue', kind: 'open' },
  { key: 'CONTACTED', label: 'Contacted', color: 'violet', kind: 'open' },
  { key: 'QUALIFIED', label: 'Qualified', color: 'emerald', kind: 'won' },
  { key: 'LOST', label: 'Lost', color: 'red', kind: 'lost' },
  { key: 'CONVERTED', label: 'Converted', color: 'teal', kind: 'won' },
];

const STAGE_COLORS = ['blue', 'violet', 'amber', 'orange', 'emerald', 'red', 'teal', 'pink', 'gray'];
const STAGE_KINDS = ['open', 'won', 'lost'];

/** Deal fields a stage may require before a deal can enter it. */
const DEAL_REQUIRED_FIELD_OPTIONS = [
  'value',
  'expectedCloseDate',
  'contact',
  'clientAccount',
  'leadCompany',
  'assignedTo',
  'description',
];

const REQUIRED_FIELD_LABELS = {
  value: 'deal value',
  expectedCloseDate: 'expected close date',
  contact: 'contact',
  clientAccount: 'client account',
  leadCompany: 'lead company',
  assignedTo: 'owner',
  description: 'description',
};

function slugKey(label, entity) {
  const base = String(label || '')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  if (!base) return null;
  return entity === 'lead' ? base.toUpperCase() : base.toLowerCase();
}

/**
 * Validate and normalize a stages array. Returns { stages } or { error }.
 * @param {unknown} input
 * @param {'deal'|'lead'} entity
 * @param {object[]|null} previous existing stages (lead: system statuses must survive)
 */
function normalizeStages(input, entity, previous = null) {
  if (!Array.isArray(input) || input.length === 0) return { error: 'Add at least one stage' };
  if (input.length > 30) return { error: 'A pipeline can have at most 30 stages' };
  const seen = new Set();
  const stages = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return { error: 'Invalid stage' };
    const label = String(raw.label || '').trim().slice(0, 60);
    if (!label) return { error: 'Every stage needs a name' };
    const key = (raw.key && String(raw.key).trim()) || slugKey(label, entity);
    if (!key) return { error: `Stage "${label}" needs a name with letters or numbers` };
    const finalKey = entity === 'lead' ? key.toUpperCase() : key;
    if (seen.has(finalKey)) return { error: `Two stages use the same name/key "${finalKey}"` };
    seen.add(finalKey);
    const kind = STAGE_KINDS.includes(raw.kind) ? raw.kind : 'open';
    const color = STAGE_COLORS.includes(raw.color) ? raw.color : 'gray';
    const stage = { key: finalKey, label, color, kind };
    if (entity === 'deal') {
      const p = Number(raw.probability);
      stage.probability = Number.isFinite(p) ? Math.min(100, Math.max(0, Math.round(p))) : kind === 'won' ? 100 : 0;
      stage.requiredFields = Array.isArray(raw.requiredFields)
        ? raw.requiredFields.filter((f) => DEAL_REQUIRED_FIELD_OPTIONS.includes(f))
        : [];
    }
    stages.push(stage);
  }
  if (entity === 'deal') {
    if (!stages.some((s) => s.kind === 'open')) return { error: 'A pipeline needs at least one open stage' };
  }
  if (entity === 'lead') {
    const missing = SYSTEM_LEAD_STATUSES.filter((k) => !seen.has(k));
    if (missing.length) return { error: `These system statuses can be renamed but not removed: ${missing.join(', ')}` };
    // System statuses keep their kind (conversion logic depends on it).
    for (const s of stages) {
      const def = DEFAULT_LEAD_STATUSES.find((d) => d.key === s.key);
      if (def && SYSTEM_LEAD_STATUSES.includes(s.key)) s.kind = def.kind;
    }
  }
  void previous;
  return { stages };
}

async function listPipelines(strapi, orgId, entity) {
  return strapi.entityService.findMany(PIPELINE_UID, {
    filters: { organization: orgId, entity },
    sort: [{ sortOrder: 'asc' }, { id: 'asc' }],
    limit: 100,
  });
}

/** Returns the org's pipelines for an entity, creating the default one when none exist. */
async function ensurePipelines(strapi, orgId, entity) {
  let rows = await listPipelines(strapi, orgId, entity);
  if (rows.length) return rows;
  await strapi.entityService.create(PIPELINE_UID, {
    data: {
      name: entity === 'lead' ? 'Lead statuses' : 'Sales',
      entity,
      isDefault: true,
      sortOrder: 0,
      stages: entity === 'lead' ? DEFAULT_LEAD_STATUSES : DEFAULT_DEAL_STAGES,
      organization: orgId,
    },
  });
  rows = await listPipelines(strapi, orgId, entity);
  return rows;
}

function defaultPipeline(rows) {
  return rows.find((p) => p.isDefault) || rows[0] || null;
}

/** Lead status keys for an org, in order (falls back to the defaults if lookup fails). */
async function leadStatusKeys(strapi, orgId) {
  try {
    const rows = await ensurePipelines(strapi, orgId, 'lead');
    const list = defaultPipeline(rows);
    const keys = (list?.stages || []).map((s) => s.key).filter(Boolean);
    return keys.length ? keys : DEFAULT_LEAD_STATUSES.map((s) => s.key);
  } catch {
    return DEFAULT_LEAD_STATUSES.map((s) => s.key);
  }
}

function legacyStageFor(stage) {
  if (!stage) return null;
  if (stage.kind === 'won') return 'won';
  if (stage.kind === 'lost') return 'lost';
  return LEGACY_DEAL_STAGES.includes(stage.key) && !['won', 'lost'].includes(stage.key) ? stage.key : 'prospect';
}

function relationId(rel) {
  if (rel == null || rel === '') return null;
  if (typeof rel === 'object') return rel.id ?? (Array.isArray(rel.set) ? rel.set[0]?.id ?? rel.set[0] : null);
  const n = parseInt(String(rel), 10);
  return Number.isNaN(n) ? null : n;
}

function isEmptyValue(v) {
  if (v == null || v === '') return true;
  if (typeof v === 'object' && !Array.isArray(v)) return relationId(v) == null && !Object.keys(v).length;
  return false;
}

/**
 * Apply pipeline/stage changes to a deal create/update payload (mutates `data`).
 * Returns null on success or an error message.
 * @param {object} existing current deal (with pipeline populated) or null on create
 */
async function applyDealPipeline(strapi, orgId, data, existing = null) {
  const touchesPipeline = 'pipeline' in data || 'pipelineStageKey' in data;
  const touchesLegacyStage = 'stage' in data && !touchesPipeline;
  if (!touchesPipeline && !touchesLegacyStage && existing) return null;

  const rows = await ensurePipelines(strapi, orgId, 'deal');
  const fallback = defaultPipeline(rows);

  const requestedPipelineId = 'pipeline' in data ? relationId(data.pipeline) : relationId(existing?.pipeline);
  const pipeline = requestedPipelineId ? rows.find((p) => p.id === requestedPipelineId) : fallback;
  if (!pipeline) return 'Pipeline not found in this organization';
  const stages = Array.isArray(pipeline.stages) ? pipeline.stages : [];

  let stage = null;
  if (touchesLegacyStage) {
    // Legacy writers (deal list, forms) send only `stage`. Map it into the deal's pipeline.
    const legacy = String(data.stage || '').toLowerCase();
    stage =
      stages.find((s) => s.key === legacy) ||
      (legacy === 'won' ? stages.find((s) => s.kind === 'won') : null) ||
      (legacy === 'lost' ? stages.find((s) => s.kind === 'lost') : null);
    if (!stage) return null; // unknown legacy value: leave it to the schema enum validation
  } else {
    const key =
      'pipelineStageKey' in data && data.pipelineStageKey
        ? String(data.pipelineStageKey)
        : !('pipeline' in data) && existing?.pipelineStageKey
          ? existing.pipelineStageKey
          : null;
    stage = key ? stages.find((s) => s.key === key) : null;
    if (key && !stage) return `Stage "${key}" is not in pipeline "${pipeline.name}"`;
    if (!stage) stage = stages.find((s) => s.kind === 'open') || stages[0];
  }
  if (!stage) return 'This pipeline has no stages';

  // Required fields for the target stage (checked against the merged deal).
  const merged = { ...(existing || {}), ...data };
  // Deal value defaults to 0, so a required value must be greater than 0.
  const missing = (stage.requiredFields || []).filter((f) =>
    f === 'value' ? !(Number(merged.value) > 0) : isEmptyValue(merged[f])
  );
  if (missing.length) {
    return `Fill in ${missing.map((f) => REQUIRED_FIELD_LABELS[f] || f).join(', ')} before moving this deal to "${stage.label}"`;
  }

  data.pipeline = pipeline.id;
  data.pipelineStageKey = stage.key;
  data.stage = legacyStageFor(stage);
  if (!('probability' in data) && typeof stage.probability === 'number') data.probability = stage.probability;
  return null;
}

module.exports = {
  PIPELINE_UID,
  LEGACY_DEAL_STAGES,
  DEFAULT_DEAL_STAGES,
  DEFAULT_LEAD_STATUSES,
  SYSTEM_LEAD_STATUSES,
  STAGE_COLORS,
  DEAL_REQUIRED_FIELD_OPTIONS,
  normalizeStages,
  ensurePipelines,
  defaultPipeline,
  leadStatusKeys,
  legacyStageFor,
  applyDealPipeline,
};
