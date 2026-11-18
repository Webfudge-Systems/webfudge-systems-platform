'use strict';

/**
 * Duplicate detection for CRM records (ticket G4): phone (E.164), email, company name (fuzzy).
 * Used by imports (index built once per job) and by GET /crm-duplicates on create forms.
 */

const LEAD_UID = 'api::lead-company.lead-company';
const CONTACT_UID = 'api::contact.contact';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function normalizeEmail(v) {
  const s = String(v || '').trim().toLowerCase();
  return EMAIL_RE.test(s) ? s : null;
}

/**
 * E.164 phone. 10-digit Indian mobiles (and 0-prefixed / 91-prefixed forms) get +91.
 * Returns null when it doesn't look like a phone number.
 */
function normalizePhone(v, defaultCountry = '91') {
  const raw = String(v || '').trim();
  if (!raw) return null;
  const plus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (plus) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.startsWith('00')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) return `+${defaultCountry}${digits}`;
  if (digits.length === 12 && digits.startsWith(defaultCountry)) return `+${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

const COMPANY_NOISE = /\b(private|pvt|limited|ltd|llp|inc|incorporated|corp|corporation|co|company|the|and|india|technologies|technology|tech|solutions|services|enterprises|group)\b/g;

/** Company name key for fuzzy matching: lowercase, no punctuation, common suffixes removed. */
function companyKey(v) {
  const s = String(v || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(COMPANY_NOISE, ' ')
    .split(/\s+/)
    .filter(Boolean)
    // "Steels" and "Steel" match: drop a plural s on longer words.
    .map((w) => {
      if (w.length <= 4) return w;
      if (/(ss|x|ch|sh)es$/.test(w)) return w.slice(0, -2);
      if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
      return w;
    })
    .join('');
  return s.length >= 3 ? s : null;
}

function contactName(c) {
  return [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || c.email || `Contact #${c.id}`;
}

/** Build lookup maps for an org's existing records. */
async function buildIndex(strapi, orgId, entity) {
  const uid = entity === 'contact' ? CONTACT_UID : LEAD_UID;
  const fields = entity === 'contact' ? ['id', 'firstName', 'lastName', 'email', 'phone'] : ['id', 'companyName', 'email', 'phone'];
  const rows = await strapi.entityService.findMany(uid, { filters: { organization: orgId }, fields, limit: 50000 });
  const index = { email: new Map(), phone: new Map(), company: new Map() };
  for (const r of rows) addToIndex(index, entity, r);
  return index;
}

function labelOf(entity, r) {
  return entity === 'contact' ? contactName(r) : r.companyName || `Lead #${r.id}`;
}

function addToIndex(index, entity, r) {
  const ref = { id: r.id, label: labelOf(entity, r) };
  const e = normalizeEmail(r.email);
  const p = normalizePhone(r.phone);
  const c = entity === 'lead' ? companyKey(r.companyName) : null;
  if (e && !index.email.has(e)) index.email.set(e, ref);
  if (p && !index.phone.has(p)) index.phone.set(p, ref);
  if (c && !index.company.has(c)) index.company.set(c, ref);
}

/** First match for a candidate record: { id, label, matchedOn } or null. */
function matchIn(index, entity, candidate) {
  const e = normalizeEmail(candidate.email);
  if (e && index.email.has(e)) return { ...index.email.get(e), matchedOn: 'email' };
  const p = normalizePhone(candidate.phone);
  if (p && index.phone.has(p)) return { ...index.phone.get(p), matchedOn: 'phone' };
  if (entity === 'lead') {
    const c = companyKey(candidate.companyName);
    if (c && index.company.has(c)) return { ...index.company.get(c), matchedOn: 'company name' };
  }
  return null;
}

/** All possible duplicates of one candidate (for create forms). */
async function findDuplicates(strapi, orgId, entity, candidate) {
  const index = await buildIndex(strapi, orgId, entity);
  const out = [];
  const seen = new Set();
  const push = (m, on) => {
    if (m && !seen.has(m.id)) {
      seen.add(m.id);
      out.push({ ...m, matchedOn: on });
    }
  };
  const e = normalizeEmail(candidate.email);
  if (e) push(index.email.get(e), 'email');
  const p = normalizePhone(candidate.phone);
  if (p) push(index.phone.get(p), 'phone');
  if (entity === 'lead') {
    const c = companyKey(candidate.companyName);
    if (c) push(index.company.get(c), 'company name');
  }
  return out;
}

module.exports = {
  LEAD_UID,
  CONTACT_UID,
  normalizeEmail,
  normalizePhone,
  companyKey,
  buildIndex,
  addToIndex,
  matchIn,
  findDuplicates,
};
