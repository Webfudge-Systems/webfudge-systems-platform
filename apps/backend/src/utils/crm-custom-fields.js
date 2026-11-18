'use strict';

/**
 * No-code custom fields for CRM records (ticket G1).
 *
 * Definitions live in `crm-custom-field` (per org + entity). Values are stored on each record in its
 * `customFields` JSON attribute as { [fieldKey]: value }. Values are validated against the org's
 * definitions on create/update; unknown keys are dropped.
 */

const FIELD_UID = 'api::crm-custom-field.crm-custom-field';

const ENTITIES = ['lead', 'contact', 'account', 'deal'];
const ENTITY_UIDS = {
  lead: 'api::lead-company.lead-company',
  contact: 'api::contact.contact',
  account: 'api::client-account.client-account',
  deal: 'api::deal.deal',
};
const FIELD_TYPES = ['text', 'number', 'currency', 'date', 'select', 'multiselect', 'user', 'phone', 'url', 'checkbox'];
const MAX_FIELDS_PER_ENTITY = 50;

function slugKey(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function normalizeOptions(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  const out = [];
  for (const o of raw) {
    const label = String(typeof o === 'object' && o ? o.label ?? o.value ?? '' : o ?? '').trim().slice(0, 80);
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push(label);
  }
  return out.slice(0, 100);
}

/** Validate a field definition payload. Returns { data } or { error }. */
function normalizeDefinition(body, { creating }) {
  const data = {};
  if (creating || body.label != null) {
    const label = String(body.label || '').trim().slice(0, 80);
    if (!label) return { error: 'Field name is required' };
    data.label = label;
  }
  if (creating) {
    if (!ENTITIES.includes(body.entity)) return { error: `Entity must be one of: ${ENTITIES.join(', ')}` };
    data.entity = body.entity;
    if (!FIELD_TYPES.includes(body.type)) return { error: `Type must be one of: ${FIELD_TYPES.join(', ')}` };
    data.type = body.type;
    const key = slugKey(body.key || body.label);
    if (!key || !/^[a-z]/.test(key)) return { error: 'Field name must start with a letter' };
    data.key = key;
  }
  if (body.options != null) data.options = normalizeOptions(body.options);
  if (body.required != null) data.required = Boolean(body.required);
  if (body.showInTable != null) data.showInTable = Boolean(body.showInTable);
  if (body.sortOrder != null && Number.isFinite(Number(body.sortOrder))) data.sortOrder = Number(body.sortOrder);
  return { data };
}

async function listFields(strapi, orgId, entity) {
  if (!orgId || !ENTITIES.includes(entity)) return [];
  return strapi.entityService.findMany(FIELD_UID, {
    filters: { organization: orgId, entity },
    sort: [{ sortOrder: 'asc' }, { id: 'asc' }],
    limit: 200,
  });
}

function isBlank(v) {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

/** Coerce one value to the field's type. Returns { value } or { error }. */
function coerce(def, raw) {
  if (isBlank(raw)) return { value: null };
  const label = def.label;
  switch (def.type) {
    case 'number':
    case 'currency': {
      const n = Number(typeof raw === 'string' ? raw.replace(/[,\s₹]/g, '') : raw);
      if (!Number.isFinite(n)) return { error: `${label} must be a number` };
      return { value: def.type === 'currency' ? Math.round(n * 100) / 100 : n };
    }
    case 'date': {
      const s = String(raw).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s))) return { error: `${label} must be a date (YYYY-MM-DD)` };
      return { value: s };
    }
    case 'checkbox':
      return { value: raw === true || raw === 'true' || raw === 1 || raw === '1' };
    case 'select': {
      const s = String(raw);
      if (!(def.options || []).includes(s)) return { error: `${label}: "${s}" is not one of the options` };
      return { value: s };
    }
    case 'multiselect': {
      const arr = (Array.isArray(raw) ? raw : [raw]).map(String);
      const bad = arr.filter((v) => !(def.options || []).includes(v));
      if (bad.length) return { error: `${label}: "${bad[0]}" is not one of the options` };
      return { value: [...new Set(arr)] };
    }
    case 'user': {
      const n = parseInt(typeof raw === 'object' ? raw.id : raw, 10);
      if (Number.isNaN(n)) return { error: `${label} must be a user` };
      return { value: n };
    }
    case 'url': {
      const s = String(raw).trim().slice(0, 500);
      if (!/^https?:\/\/\S+\.\S+/i.test(s)) return { error: `${label} must be a web address starting with http:// or https://` };
      return { value: s };
    }
    case 'phone': {
      const s = String(raw).trim().slice(0, 30);
      if (!/^\+?[\d\s()-]{6,}$/.test(s)) return { error: `${label} must be a phone number` };
      return { value: s };
    }
    default:
      return { value: String(raw).slice(0, 2000) };
  }
}

/**
 * Validate `data.customFields` against the org's definitions and merge with the record's current values.
 * Mutates `data`. Returns null on success or an error message.
 * @param {'lead'|'contact'|'account'|'deal'} entity
 * @param {object|null} existing current record (null on create)
 * @param {object[]|null} [defsPreloaded] field definitions already loaded (bulk imports)
 */
async function applyCustomFields(strapi, orgId, entity, data, existing = null, defsPreloaded = null) {
  const touched = data && Object.prototype.hasOwnProperty.call(data, 'customFields');
  // Writers that don't send custom values (older forms, conversions, imports) are never blocked;
  // "required" is enforced whenever custom values are sent.
  if (!touched) return null;
  const defs = defsPreloaded || (await listFields(strapi, orgId, entity));
  const input = data.customFields && typeof data.customFields === 'object' && !Array.isArray(data.customFields) ? data.customFields : {};
  const current = existing?.customFields && typeof existing.customFields === 'object' ? existing.customFields : {};
  const next = {};
  // Keep values of fields that still exist.
  for (const d of defs) if (d.key in current) next[d.key] = current[d.key];
  for (const d of defs) {
    if (!(d.key in input)) continue;
    const { value, error } = coerce(d, input[d.key]);
    if (error) return error;
    if (value == null) delete next[d.key];
    else next[d.key] = value;
  }
  const missing = defs.filter((d) => d.required && isBlank(next[d.key]) && next[d.key] !== false).map((d) => d.label);
  if (missing.length) return `Fill in ${missing.join(', ')}`;
  data.customFields = next;
  return null;
}

/**
 * List filtering on custom fields: `?cf[fieldKey]=value` (exact for select/checkbox/number/date,
 * contains for text-like, "has" for multiselect). Adds an `id $in` condition to `filters`.
 * Scans the org's records (fine for SMB volumes; capped at 10k).
 */
async function applyCustomFieldFilter(strapi, ctx, entity, filters) {
  const cf = ctx.query?.cf;
  if (!cf || typeof cf !== 'object' || Array.isArray(cf)) return;
  const defs = await listFields(strapi, ctx.state.orgId, entity);
  const conds = Object.entries(cf)
    .map(([key, raw]) => ({ def: defs.find((d) => d.key === key), raw }))
    .filter((c) => c.def && !isBlank(c.raw));
  if (!conds.length) return;
  const rows = await strapi.entityService.findMany(ENTITY_UIDS[entity], {
    filters: { organization: ctx.state.orgId },
    fields: ['id', 'customFields'],
    limit: 10000,
  });
  const ids = rows
    .filter((row) => {
      const vals = row.customFields || {};
      return conds.every(({ def, raw }) => {
        const v = vals[def.key];
        if (v == null) return false;
        const q = String(raw).toLowerCase();
        if (def.type === 'multiselect') return Array.isArray(v) && v.map((x) => String(x).toLowerCase()).includes(q);
        if (def.type === 'checkbox') return String(Boolean(v)) === q;
        if (['text', 'phone', 'url'].includes(def.type)) return String(v).toLowerCase().includes(q);
        return String(v).toLowerCase() === q;
      });
    })
    .map((row) => row.id);
  const cond = { id: { $in: ids.length ? ids : [-1] } };
  if (Array.isArray(filters.$and)) filters.$and.push(cond);
  else filters.$and = [cond];
}

module.exports = {
  FIELD_UID,
  ENTITIES,
  FIELD_TYPES,
  MAX_FIELDS_PER_ENTITY,
  normalizeDefinition,
  listFields,
  applyCustomFields,
  applyCustomFieldFilter,
};
