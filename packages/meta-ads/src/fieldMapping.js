'use strict';

/**
 * Maps Meta lead-form answers (field_data) onto Grow lead-company / contact fields.
 *
 * Question keys differ per form, so each form can carry its own mapping
 * `{ [metaQuestionKey]: target }`. Questions without an explicit target fall back to the
 * built-in aliases below. Targets:
 *   fullName, firstName, lastName, email, phone, jobTitle      → contact (email/phone also on the lead)
 *   companyName, website, industry, address, city, state, country, zipCode → lead company
 *   notes                                                      → appended to the lead description
 *   custom:<key>                                               → lead company custom field <key>
 *   ignore                                                     → dropped
 * Answers that match nothing are kept in `unmappedAnswers`, so no captured signal is lost.
 */

const CONTACT_TARGETS = ['fullName', 'firstName', 'lastName', 'jobTitle'];
const SHARED_TARGETS = ['email', 'phone'];
const LEAD_TARGETS = ['companyName', 'website', 'industry', 'address', 'city', 'state', 'country', 'zipCode', 'notes'];
const TARGETS = [...CONTACT_TARGETS, ...SHARED_TARGETS, ...LEAD_TARGETS, 'ignore'];

/** Built-in aliases, keyed by target. Meta's standard question keys come first. */
const DEFAULT_ALIASES = {
  fullName: ['full_name', 'name', 'your_name'],
  firstName: ['first_name'],
  lastName: ['last_name', 'surname'],
  email: ['email', 'work_email', 'email_address'],
  phone: ['phone_number', 'phone', 'mobile_number', 'mobile', 'work_phone_number', 'whatsapp_number'],
  jobTitle: ['job_title', 'designation', 'title'],
  companyName: ['company_name', 'company', 'business_name', 'organization', 'organisation'],
  website: ['website', 'company_website'],
  industry: ['industry'],
  address: ['street_address', 'address'],
  city: ['city'],
  state: ['state', 'province'],
  country: ['country'],
  zipCode: ['zip_code', 'zip', 'post_code', 'postal_code', 'pincode', 'pin_code'],
};

function normalizeKey(key) {
  return String(key || '')
    .toLowerCase()
    .trim()
    .replace(/[?!.,:]/g, '')
    .replace(/[\s-]+/g, '_');
}

const ALIAS_LOOKUP = new Map();
for (const [target, aliases] of Object.entries(DEFAULT_ALIASES)) {
  for (const alias of aliases) ALIAS_LOOKUP.set(normalizeKey(alias), target);
}

function isValidTarget(target) {
  if (typeof target !== 'string') return false;
  if (TARGETS.includes(target)) return true;
  return /^custom:[A-Za-z0-9_-]{1,64}$/.test(target);
}

/** Target for one question key: explicit form mapping first, then the built-in aliases. */
function targetFor(questionKey, mapping) {
  const explicit = mapping && Object.prototype.hasOwnProperty.call(mapping, questionKey) ? mapping[questionKey] : undefined;
  if (explicit && isValidTarget(explicit)) return explicit;
  return ALIAS_LOOKUP.get(normalizeKey(questionKey)) || null;
}

function splitName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || undefined };
}

/**
 * @param {Array<{name: string, values: string[]}>} fieldData lead.field_data from Graph
 * @param {Record<string, string>} [mapping] per-form { questionKey: target }
 */
function mapFieldData(fieldData, mapping) {
  const result = { contact: {}, lead: {}, customFields: {}, utm: {}, unmappedAnswers: {} };
  const notes = [];

  for (const entry of fieldData || []) {
    if (!entry || !entry.name) continue;
    const value = Array.isArray(entry.values) ? entry.values.filter((v) => v != null && v !== '').join(', ').trim() : '';
    if (!value) continue;
    const key = normalizeKey(entry.name);
    if (key.startsWith('utm_')) {
      result.utm[key] = value;
      continue;
    }
    const target = targetFor(entry.name, mapping);
    if (!target) {
      result.unmappedAnswers[entry.name] = value;
      continue;
    }
    if (target === 'ignore') continue;
    if (target.startsWith('custom:')) {
      result.customFields[target.slice(7)] = value;
    } else if (target === 'notes') {
      notes.push(value);
    } else if (target === 'fullName') {
      const { firstName, lastName } = splitName(value);
      result.contact.fullName = value;
      if (!result.contact.firstName) result.contact.firstName = firstName;
      if (!result.contact.lastName && lastName) result.contact.lastName = lastName;
    } else if (target === 'firstName' || target === 'lastName' || target === 'jobTitle') {
      result.contact[target] = value;
    } else if (target === 'email' || target === 'phone') {
      if (!result.contact[target]) result.contact[target] = value;
      if (!result.lead[target]) result.lead[target] = value;
    } else {
      result.lead[target] = value;
    }
  }

  if (notes.length) result.lead.notes = notes.join('\n');
  if (!result.contact.fullName && (result.contact.firstName || result.contact.lastName)) {
    result.contact.fullName = [result.contact.firstName, result.contact.lastName].filter(Boolean).join(' ');
  }
  return result;
}

/** Suggested target for each question of a form (used to pre-fill the mapping UI). */
function suggestMapping(questions) {
  const out = {};
  for (const q of questions || []) {
    if (!q || !q.key) continue;
    out[q.key] = ALIAS_LOOKUP.get(normalizeKey(q.key)) || (normalizeKey(q.key).startsWith('utm_') ? 'ignore' : 'notes');
  }
  return out;
}

/** Keep only valid { questionKey: target } pairs (questionKey ≤ 200 chars). */
function sanitizeMapping(mapping) {
  const out = {};
  if (!mapping || typeof mapping !== 'object' || Array.isArray(mapping)) return out;
  for (const [k, v] of Object.entries(mapping)) {
    const key = String(k).slice(0, 200);
    if (key && isValidTarget(v)) out[key] = v;
  }
  return out;
}

module.exports = {
  TARGETS,
  CONTACT_TARGETS,
  LEAD_TARGETS,
  DEFAULT_ALIASES,
  normalizeKey,
  isValidTarget,
  mapFieldData,
  suggestMapping,
  sanitizeMapping,
  splitName,
};
