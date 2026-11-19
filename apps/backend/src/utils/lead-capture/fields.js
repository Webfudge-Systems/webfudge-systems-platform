'use strict';

/**
 * Small, dependency-free helpers shared by the lead-capture mappers and email parsers (ticket G7).
 * Every mapper returns the same normalised shape:
 *   { lead: { fullName, firstName, lastName, email, phone, companyName, city, state, country, zipCode,
 *             address, website, jobTitle, message, industry },
 *     sourceDetails: { ... },  externalId?: string,  isTest?: boolean }
 */

const MAX_VALUE = 2000;

/** Trim, collapse whitespace, cap length. Non-strings are stringified; null/undefined → ''. */
function clean(v, max = MAX_VALUE) {
  if (v == null) return '';
  if (Array.isArray(v)) return clean(v.filter((x) => x != null && x !== '').join(', '), max);
  if (typeof v === 'object') return '';
  return String(v).replace(/\s+/g, ' ').trim().slice(0, max);
}

/** Like clean() but keeps line breaks (messages, addresses). */
function cleanMultiline(v, max = MAX_VALUE) {
  if (v == null || typeof v === 'object') return '';
  return String(v)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

const keyNorm = (k) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');

/** Case/punctuation-insensitive lookup: pick(obj, ['full_name', 'name']) matches "Full-Name", "FULLNAME", … */
function pick(obj, keys) {
  if (!obj || typeof obj !== 'object') return '';
  const index = new Map();
  for (const k of Object.keys(obj)) {
    const n = keyNorm(k);
    if (!index.has(n)) index.set(n, obj[k]);
  }
  for (const k of keys) {
    const v = index.get(keyNorm(k));
    const s = clean(v);
    if (s) return s;
  }
  return '';
}

/** Keys pick() would match for a synonym list (used to find the "extra" fields left over). */
function normKeys(keys) {
  return new Set(keys.map(keyNorm));
}

function splitName(full) {
  const parts = clean(full).split(' ').filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

/** Fill fullName/firstName/lastName from whichever was given. Mutates and returns lead. */
function completeName(lead) {
  if (!lead.fullName && (lead.firstName || lead.lastName)) {
    lead.fullName = [lead.firstName, lead.lastName].filter(Boolean).join(' ');
  }
  if (lead.fullName && !lead.firstName && !lead.lastName) Object.assign(lead, splitName(lead.fullName));
  return lead;
}

/** Drop empty strings / null / undefined so callers can spread safely. */
function compact(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v == null || v === '') continue;
    if (Array.isArray(v) && !v.length) continue;
    if (typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length) continue;
    out[k] = v;
  }
  return out;
}

const EMAIL_IN_TEXT = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
// Indian mobiles (+91 / 0 prefixes, spaces or dashes) and generic +CC numbers.
const PHONE_IN_TEXT = /(?:\+?91[\s-]?|0)?(?:[6-9]\d{4}[\s-]?\d{5}|[6-9]\d{2}[\s-]?\d{3}[\s-]?\d{4})\b|\+\d{1,3}[\s-]?\d{6,12}\b/g;

module.exports = {
  clean,
  cleanMultiline,
  pick,
  normKeys,
  keyNorm,
  splitName,
  completeName,
  compact,
  EMAIL_IN_TEXT,
  PHONE_IN_TEXT,
};
