'use strict';

/**
 * Applies a vertical pack (G22) to an org: deal pipeline, extra lead statuses, custom fields and
 * shared saved views. Additive and idempotent: anything that already exists (matched by name / key)
 * is left alone, nothing is ever updated destructively or deleted, so re-applying is a no-op.
 * Cadences and WhatsApp templates ship in the pack data but wait for their features.
 * `dryRun: true` returns the same summary without writing (used for the Settings preview).
 */

const { getPack } = require('./vertical-packs');
const { PIPELINE_UID, DEFAULT_LEAD_STATUSES, normalizeStages } = require('./crm-pipeline');
const { FIELD_UID, MAX_FIELDS_PER_ENTITY, normalizeDefinition } = require('./crm-custom-fields');
const { getSetting, setSetting } = require('./crm-org-settings');

const VIEW_UID = 'api::saved-view.saved-view';
const SETTING_KEY = 'verticalPack';
const MAX_PIPELINES = 20;

const PENDING_NOTES = {
  cadences: 'Available when Cadences (G14) ships.',
  whatsappTemplates: 'Available when Fudge Connect (WhatsApp) ships.',
};

const lower = (s) => String(s || '').trim().toLowerCase();

function emptySummary(pack) {
  return {
    pack: { key: pack.key, label: pack.label },
    created: { pipelines: [], leadStatuses: [], customFields: [], views: [] },
    skipped: { pipelines: [], leadStatuses: [], customFields: [], views: [] },
    pending: [
      { type: 'cadences', items: pack.cadences.map((c) => c.name), note: PENDING_NOTES.cadences },
      { type: 'whatsappTemplates', items: pack.whatsappTemplates.map((t) => t.name), note: PENDING_NOTES.whatsappTemplates },
    ],
  };
}

async function applyPipelines(strapi, orgId, pack, out, dryRun) {
  const es = strapi.entityService;
  const existing = await es.findMany(PIPELINE_UID, { filters: { organization: orgId, entity: 'deal' }, limit: 100 });
  const names = new Set(existing.map((p) => lower(p.name)));
  let count = existing.length;
  for (const def of pack.pipelines) {
    if (names.has(lower(def.name))) {
      out.skipped.pipelines.push(def.name);
      continue;
    }
    if (count >= MAX_PIPELINES) {
      out.skipped.pipelines.push(def.name);
      continue;
    }
    const { stages, error } = normalizeStages(def.stages, 'deal');
    if (error) throw new Error(`Pack ${pack.key} pipeline "${def.name}": ${error}`);
    // A brand-new org gets the pack pipeline as its default instead of the generic one.
    const isDefault = count === 0;
    if (!dryRun) {
      await es.create(PIPELINE_UID, {
        data: { name: def.name, entity: 'deal', isDefault, sortOrder: count, stages, organization: orgId },
      });
    }
    names.add(lower(def.name));
    count += 1;
    out.created.pipelines.push(def.name);
  }
}

async function applyLeadStatuses(strapi, orgId, pack, out, dryRun) {
  const es = strapi.entityService;
  const rows = await es.findMany(PIPELINE_UID, { filters: { organization: orgId, entity: 'lead' }, limit: 100 });
  const list = rows.find((p) => p.isDefault) || rows[0] || null;
  const current = Array.isArray(list?.stages) && list.stages.length ? list.stages : DEFAULT_LEAD_STATUSES;
  const keys = new Set(current.map((s) => String(s.key).toUpperCase()));
  const additions = [];
  for (const s of pack.leadStatuses) {
    if (keys.has(s.key)) out.skipped.leadStatuses.push(s.key);
    else additions.push({ key: s.key, label: s.label, color: s.color, kind: 'open' });
  }
  if (!additions.length) return;
  // New statuses go after the last open status, before qualified / lost / converted.
  let at = 0;
  current.forEach((s, i) => {
    if (s.kind === 'open') at = i + 1;
  });
  const next = [...current.slice(0, at), ...additions, ...current.slice(at)];
  const { stages, error } = normalizeStages(next, 'lead');
  if (error) {
    out.skipped.leadStatuses.push(...additions.map((s) => s.key));
    return;
  }
  if (!dryRun) {
    if (list) await es.update(PIPELINE_UID, list.id, { data: { stages } });
    else {
      await es.create(PIPELINE_UID, {
        data: { name: 'Lead statuses', entity: 'lead', isDefault: true, sortOrder: 0, stages, organization: orgId },
      });
    }
  }
  out.created.leadStatuses.push(...additions.map((s) => s.key));
}

async function applyCustomFields(strapi, orgId, pack, out, dryRun) {
  const es = strapi.entityService;
  const existing = await es.findMany(FIELD_UID, { filters: { organization: orgId }, limit: 500 });
  const taken = new Set(existing.map((f) => `${f.entity}:${f.key}`));
  const perEntity = {};
  for (const f of existing) perEntity[f.entity] = (perEntity[f.entity] || 0) + 1;
  let sort = existing.length;
  for (const def of pack.customFields) {
    const { data, error } = normalizeDefinition(def, { creating: true });
    if (error) throw new Error(`Pack ${pack.key} field "${def.label}": ${error}`);
    const id = `${data.entity}:${data.key}`;
    if (taken.has(id) || (perEntity[data.entity] || 0) >= MAX_FIELDS_PER_ENTITY) {
      out.skipped.customFields.push(data.key);
      continue;
    }
    if (!dryRun) {
      await es.create(FIELD_UID, { data: { ...data, sortOrder: sort, organization: orgId } });
    }
    taken.add(id);
    perEntity[data.entity] = (perEntity[data.entity] || 0) + 1;
    sort += 1;
    out.created.customFields.push(data.key);
  }
}

async function applyViews(strapi, orgId, userId, pack, out, dryRun) {
  const es = strapi.entityService;
  for (const def of pack.views) {
    const label = `${def.scope} · ${def.name}`;
    const existing = await es.findMany(VIEW_UID, { filters: { organization: orgId, scope: def.scope, name: def.name }, limit: 1 });
    // Saved views belong to a user; without one (e.g. a system call) there is no owner to give them.
    if (existing.length || !userId) {
      out.skipped.views.push(label);
      continue;
    }
    if (!dryRun) {
      await es.create(VIEW_UID, {
        data: { name: def.name, scope: def.scope, config: def.config, shared: true, isDefault: false, user: userId, organization: orgId },
      });
    }
    out.created.views.push(label);
  }
}

/**
 * @param {object} strapi
 * @param {{ orgId: number, userId?: number, packKey: string, dryRun?: boolean }} opts
 */
async function applyVerticalPack(strapi, { orgId, userId = null, packKey, dryRun = false }) {
  const pack = getPack(packKey);
  if (!pack) throw new Error(`Unknown vertical pack "${packKey}"`);
  if (!orgId) throw new Error('An organization is required');
  const out = emptySummary(pack);
  await applyPipelines(strapi, orgId, pack, out, dryRun);
  await applyLeadStatuses(strapi, orgId, pack, out, dryRun);
  await applyCustomFields(strapi, orgId, pack, out, dryRun);
  await applyViews(strapi, orgId, userId, pack, out, dryRun);
  if (!dryRun) {
    const prev = (await getSetting(strapi, orgId, SETTING_KEY)) || {};
    const history = [...new Set([...(Array.isArray(prev.history) ? prev.history : []), pack.key])];
    await setSetting(strapi, orgId, SETTING_KEY, { key: pack.key, appliedAt: new Date().toISOString(), history });
  }
  return out;
}

async function appliedPack(strapi, orgId) {
  return (await getSetting(strapi, orgId, SETTING_KEY)) || null;
}

module.exports = { applyVerticalPack, appliedPack, PENDING_NOTES, SETTING_KEY };
