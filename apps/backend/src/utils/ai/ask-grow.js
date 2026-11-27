'use strict';

/**
 * G20 Ask Grow + Draft anything (Fudge Grow, SaaS).
 *
 * Ask Grow follows W21 Ask Work: the model only returns a structured lead filter
 * (grow.ask_filter). The backend keeps whitelisted fields with typed values, compiles them to Strapi
 * filters pinned to the asking user's org, checks crm.leads read access (same rule as GET
 * /lead-companies) and runs the read itself. The model never writes queries.
 *
 * Draft anything: a lead / deal / contact the user may read + the org brand tone → subject + body,
 * returned to the user for the email composer (nothing is sent). Metered through clientFor().
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const PERIODS = ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month', 'last_7_days', 'last_30_days'];
const MAX_IDS = 300;

const SOURCE_ALIASES = {
  META: 'META_ADS', FACEBOOK: 'META_ADS', FB: 'META_ADS', INSTAGRAM: 'META_ADS', IG: 'META_ADS', META_LEAD_ADS: 'META_ADS',
  GOOGLE: 'GOOGLE_ADS', ADWORDS: 'GOOGLE_ADS', WEB: 'WEBSITE', SITE: 'WEBSITE', SOCIAL: 'SOCIAL_MEDIA',
  EMAIL: 'EMAIL_CAMPAIGN', CALL: 'COLD_CALL', JUST_DIAL: 'JUSTDIAL', INDIA_MART: 'INDIAMART',
};
const SOURCE_LABELS = { META_ADS: 'Meta Lead Ads', GOOGLE_ADS: 'Google Ads', INDIAMART: 'IndiaMART', JUSTDIAL: 'JustDial' };

const textRule = (max) => (v) => {
  const s = String(v).replace(/[\u0000-\u001f]/g, '').trim().slice(0, max);
  return s || undefined;
};
const codeRule = (v) => {
  const s = String(v).trim().toUpperCase().replace(/[\s-]+/g, '_');
  return /^[A-Z0-9_]{2,40}$/.test(s) ? s : undefined;
};
const intRule = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, n)) : undefined;
};

/** Whitelisted filter fields → value sanitizer. Order = output order. */
const FIELDS = {
  city: textRule(60),
  source: (v) => {
    const c = codeRule(v);
    return c ? SOURCE_ALIASES[c] || c : undefined;
  },
  status: codeRule,
  owner: textRule(80),
  industry: textRule(60),
  text: textRule(80),
  period: (v) => (PERIODS.includes(v) ? v : undefined),
  createdFrom: (v) => (typeof v === 'string' && DATE_RE.test(v) ? v : undefined),
  createdTo: (v) => (typeof v === 'string' && DATE_RE.test(v) ? v : undefined),
  scoreMin: intRule,
  scoreMax: intRule,
  notContacted: (v) => (v === true ? true : undefined),
};

function sanitizeFilter(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  for (const [key, rule] of Object.entries(FIELDS)) {
    const v = raw[key];
    if (v == null || v === '' || typeof v === 'object') continue;
    const clean = rule(v);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 864e5);

/** Relative period → { from, to } (YYYY-MM-DD, inclusive). Weeks start on Monday. */
function resolvePeriod(period, today) {
  const t = new Date(`${today}T00:00:00.000Z`);
  const monday = addDays(t, -((t.getUTCDay() + 6) % 7));
  const firstOfMonth = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
  switch (period) {
    case 'today': return { from: today, to: today };
    case 'yesterday': return { from: iso(addDays(t, -1)), to: iso(addDays(t, -1)) };
    case 'this_week': return { from: iso(monday), to: today };
    case 'last_week': return { from: iso(addDays(monday, -7)), to: iso(addDays(monday, -1)) };
    case 'this_month': return { from: iso(firstOfMonth), to: today };
    case 'last_month': return { from: iso(new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1))), to: iso(addDays(firstOfMonth, -1)) };
    case 'last_7_days': return { from: iso(addDays(t, -6)), to: today };
    case 'last_30_days': return { from: iso(addDays(t, -29)), to: today };
    default: return null;
  }
}

/**
 * @param {object} f        sanitized filter
 * @param {object} scope    { orgId, today, scoreField, statuses }
 * @param {object} resolved { ownerLeadIds?, contactedIds? } (looked up by executeLeadQuery)
 * @returns {{ filters, ignored: string[] }}
 */
function buildLeadFilters(f, scope, resolved = {}) {
  const and = [{ organization: scope.orgId }];
  const ignored = [];
  if (f.city) and.push({ $or: [{ city: { $containsi: f.city } }, { address: { $containsi: f.city } }, { state: { $containsi: f.city } }] });
  if (f.source) and.push({ source: { $eq: f.source } });
  if (f.status) {
    if (scope.statuses?.length && !scope.statuses.includes(f.status)) ignored.push('status');
    else and.push({ status: f.status === 'QUALIFIED' ? { $in: ['QUALIFIED', 'CLIENT'] } : { $eq: f.status } });
  }
  if (f.owner) {
    const ids = (resolved.ownerLeadIds || []).slice(0, MAX_IDS);
    and.push({ id: { $in: ids.length ? ids : [-1] } });
  }
  if (f.industry) and.push({ industry: { $containsi: f.industry } });
  if (f.text) and.push({ companyName: { $containsi: f.text } });
  const range = f.period ? resolvePeriod(f.period, scope.today) : { from: f.createdFrom, to: f.createdTo };
  if (range && (range.from || range.to)) {
    const c = {};
    if (range.from) c.$gte = `${range.from}T00:00:00.000Z`;
    if (range.to) c.$lte = `${range.to}T23:59:59.999Z`;
    and.push({ createdAt: c });
  }
  if (f.scoreMin != null || f.scoreMax != null) {
    if (!scope.scoreField) ignored.push('score');
    else {
      const c = {};
      if (f.scoreMin != null) c.$gte = f.scoreMin;
      if (f.scoreMax != null) c.$lte = f.scoreMax;
      and.push({ [scope.scoreField]: c });
    }
  }
  if (f.notContacted) {
    and.push({ firstContactedAt: { $null: true } });
    const ids = resolved.contactedIds || [];
    if (ids.length) and.push({ id: { $notIn: ids } });
  }
  return { filters: { $and: and }, ignored };
}

const personName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || `User #${u.id}` : null);

async function resolveOwnerIds(text, scope, deps) {
  if (/^(me|myself|i|mine)$/i.test(text)) return [scope.userId];
  const q = text.toLowerCase();
  return (await deps.findMembers())
    .filter((u) => [personName(u), u.username, u.email].filter(Boolean).some((s) => String(s).toLowerCase().includes(q)))
    .map((u) => u.id);
}

const leadRow = (l, scoreField) => ({
  id: l.id,
  companyName: l.companyName,
  city: l.city || null,
  source: l.source || null,
  status: l.status || null,
  score: scoreField ? l[scoreField] ?? null : null,
  createdAt: l.createdAt || null,
});

/**
 * Runs a sanitized filter. deps: { findLeads(filters, limit), countLeads(filters), findMembers(),
 * leadIdsForOwners(userIds), contactedLeadIds() }.
 */
async function executeLeadQuery(filter, scope, deps, { limit = 25 } = {}) {
  if (!scope.can?.leads) return { error: 'not_allowed', rows: [], total: 0, ids: [], ignored: [] };
  const resolved = {};
  if (filter.owner) {
    const userIds = await resolveOwnerIds(filter.owner, scope, deps);
    resolved.ownerLeadIds = userIds.length ? await deps.leadIdsForOwners(userIds) : [];
  }
  if (filter.notContacted) resolved.contactedIds = await deps.contactedLeadIds();
  const { filters, ignored } = buildLeadFilters(filter, scope, resolved);
  const [rows, total, idRows] = await Promise.all([deps.findLeads(filters, limit), deps.countLeads(filters), deps.findLeadIds ? deps.findLeadIds(filters, MAX_IDS) : null]);
  return {
    rows: rows.map((l) => leadRow(l, scope.scoreField)),
    total,
    ids: (idRows || rows).map((r) => r.id),
    ignored,
  };
}

const PERIOD_LABELS = Object.fromEntries(PERIODS.map((p) => [p, p.replace(/_/g, ' ')]));
const humanCode = (c) => SOURCE_LABELS[c] || String(c).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase());

function describeFilter(f) {
  const chips = [];
  if (f.city) chips.push(`City: ${f.city}`);
  if (f.source) chips.push(`Source: ${humanCode(f.source)}`);
  if (f.status) chips.push(`Status: ${humanCode(f.status)}`);
  if (f.owner) chips.push(`Owner: ${f.owner}`);
  if (f.industry) chips.push(`Industry: ${f.industry}`);
  if (f.text) chips.push(`Name contains: ${f.text}`);
  if (f.period) chips.push(`Created: ${PERIOD_LABELS[f.period]}`);
  else if (f.createdFrom || f.createdTo) chips.push(`Created: ${f.createdFrom || '…'} – ${f.createdTo || '…'}`);
  if (f.scoreMin != null && f.scoreMax != null) chips.push(`Score ${f.scoreMin}–${f.scoreMax}`);
  else if (f.scoreMin != null) chips.push(`Score ≥ ${f.scoreMin}`);
  else if (f.scoreMax != null) chips.push(`Score ≤ ${f.scoreMax}`);
  if (f.notContacted) chips.push('Not contacted yet');
  return chips;
}

/**
 * Keyword parser used by the mock provider (AI_PROVIDER=mock) so the flow runs locally without a key.
 * Not a fallback for real AI: the controller always asks the model when one is configured.
 */
function parseQuestion(q) {
  const s = String(q || '');
  const f = {};
  const notCity = /^(Meta|Facebook|Instagram|Google|IndiaMART|JustDial|Website|Referral|Show|Find|List|My|All)$/i;
  const city = [...s.matchAll(/\b(?:in|from)\s+([A-Z][a-zA-Z]+)\b/g), ...s.matchAll(/(?:^|\s)([A-Z][a-zA-Z]+)\s+leads\b/g)].map((m) => m[1]).find((c) => !notCity.test(c));
  if (city) f.city = city;
  const src = s.match(/\b(meta|facebook|instagram|google|indiamart|justdial|website|referral)\b/i);
  if (src) f.source = src[1];
  const period = s.toLowerCase().match(/\b(today|yesterday|this week|last week|this month|last month|last 7 days|last 30 days)\b/);
  if (period) f.period = period[1].replace(/ /g, '_');
  const gt = s.match(/score\s*(>=|>|above|over)\s*(\d+)/i);
  if (gt) f.scoreMin = Number(gt[2]) + (gt[1] === '>=' ? 0 : 1);
  const lt = s.match(/score\s*(<=|<|below|under)\s*(\d+)/i);
  if (lt) f.scoreMax = Number(lt[2]) - (lt[1] === '<=' ? 0 : 1);
  if (/nobody (called|contacted)|not (yet )?(called|contacted)|uncontacted|no one (called|contacted)/i.test(s)) f.notContacted = true;
  if (/\bmy leads\b|\bmine\b/i.test(s)) f.owner = 'me';
  return f;
}

// ---------- Strapi wiring ----------

const LEAD_UID = 'api::lead-company.lead-company';
const MEETING_UID = 'api::meeting.meeting';
const MEMBER_UID = 'api::organization-user.organization-user';

async function buildScope(strapi, ctx) {
  const { canAccess } = require('../rbac');
  const attrs = strapi.contentType(LEAD_UID)?.attributes || {};
  let statuses = [];
  try {
    const { leadStatusKeys } = require('../crm-pipeline');
    statuses = ((await leadStatusKeys(strapi, ctx.state.orgId)) || []).map((s) => String(s).toUpperCase());
  } catch {
    statuses = [];
  }
  return {
    orgId: ctx.state.orgId,
    userId: ctx.state.user.id,
    can: { leads: Boolean(canAccess(ctx, 'crm', 'leads', 'read')) },
    // G11 AI score when present (capability check), else the manual score.
    scoreField: attrs.aiScore ? 'aiScore' : attrs.score ? 'score' : null,
    statuses,
    today: new Date().toISOString().slice(0, 10),
  };
}

function strapiDeps(strapi, scope) {
  const userFields = ['id', 'username', 'firstName', 'lastName', 'email'];
  return {
    findLeads: (filters, limit) =>
      strapi.entityService.findMany(LEAD_UID, {
        filters,
        fields: ['id', 'companyName', 'city', 'source', 'status', 'createdAt', ...(scope.scoreField ? [scope.scoreField] : [])],
        sort: { createdAt: 'desc' },
        limit,
      }),
    findLeadIds: (filters, limit) => strapi.entityService.findMany(LEAD_UID, { filters, fields: ['id'], sort: { createdAt: 'desc' }, limit }),
    countLeads: (filters) => strapi.entityService.count(LEAD_UID, { filters }),
    async findMembers() {
      const rows = await strapi.entityService.findMany(MEMBER_UID, {
        filters: { organization: scope.orgId, isActive: true },
        populate: { user: { fields: userFields } },
        limit: 500,
      });
      return rows.map((r) => r.user).filter(Boolean);
    },
    async leadIdsForOwners(userIds) {
      const { leadCompanyIdsForAssignedUser } = require('../crm-relation-attach');
      const linked = (await Promise.all(userIds.map((u) => leadCompanyIdsForAssignedUser(strapi, u).catch(() => [])))).flat();
      const direct = await strapi.entityService
        .findMany(LEAD_UID, { filters: { organization: scope.orgId, assignedTo: { id: { $in: userIds } } }, fields: ['id'], limit: 5000 })
        .catch(() => []);
      return [...new Set([...linked, ...direct.map((r) => r.id)])];
    },
    async contactedLeadIds() {
      const rows = await strapi.entityService.findMany(MEETING_UID, {
        filters: { organization: scope.orgId, leadCompany: { id: { $notNull: true } }, status: { $ne: 'cancelled' } },
        fields: ['id'],
        populate: { leadCompany: { fields: ['id'] } },
        limit: 5000,
      });
      return [...new Set(rows.map((m) => m.leadCompany?.id).filter(Boolean))];
    },
  };
}

/** Question → filter → rows. Throws AI errors for the caller's sendAiError. */
async function askGrow(strapi, ctx, { question, language }) {
  const ai = require('./index');
  const { renderTemplate, generateObject } = require('@webfudge/ai');
  const scope = await buildScope(strapi, ctx);
  if (!scope.can.leads) return { error: 'not_allowed' };
  const plan = await generateObject(ai.clientFor(strapi, ctx), {
    ...renderTemplate('grow.ask_filter', { question, today: scope.today, statuses: scope.statuses }, { language }),
    feature: 'grow.ask',
  });
  const filter = sanitizeFilter(plan.object?.filter);
  const result = await executeLeadQuery(filter, scope, strapiDeps(strapi, scope));
  return { filter, chips: describeFilter(filter), explanation: plan.object?.explanation || '', ...result, credits: plan.credits || 0 };
}

/** Re-runs a filter (no AI, no credits) — used by the leads list to apply an Ask Grow result. */
async function runFilter(strapi, ctx, rawFilter) {
  const scope = await buildScope(strapi, ctx);
  const filter = sanitizeFilter(rawFilter);
  const result = await executeLeadQuery(filter, scope, strapiDeps(strapi, scope));
  return { filter, chips: describeFilter(filter), ...result };
}

// ---------- Draft anything ----------

const BRAND_TONE_KEY = 'brand_tone';
const DRAFT_KINDS = ['email', 'followup', 'proposal_intro'];
const RECORDS = {
  lead: { uid: LEAD_UID, module: 'leads', label: 'Lead', fields: ['companyName', 'industry', 'city', 'website', 'status', 'source', 'description', 'notes', 'email', 'dealValue'] },
  deal: { uid: 'api::deal.deal', module: 'deals', label: 'Deal', fields: null },
  contact: { uid: 'api::contact.contact', module: 'contacts', label: 'Contact', fields: null },
};
const DROP = new Set(['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'locale', 'organization', 'customFields', 'metaAttribution', 'sourceDetails', 'aiScoreReasons', 'createdBy', 'updatedBy']);

/** Small, prompt-safe fact object: scalar fields only, long text trimmed. */
function recordFacts(entry, fields) {
  const out = {};
  for (const [k, v] of Object.entries(entry || {})) {
    if (DROP.has(k) || v == null || v === '' || typeof v === 'object') continue;
    if (fields && !fields.includes(k)) continue;
    out[k] = typeof v === 'string' ? v.slice(0, 600) : v;
  }
  return out;
}

function sanitizeBrandTone(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  return { tone: String(r.tone || '').trim().slice(0, 500), signature: String(r.signature || '').trim().slice(0, 300) };
}

async function getBrandTone(strapi, orgId) {
  const { getSetting } = require('../crm-org-settings');
  return sanitizeBrandTone(await getSetting(strapi, orgId, BRAND_TONE_KEY));
}

async function setBrandTone(strapi, orgId, raw) {
  const { setSetting } = require('../crm-org-settings');
  const value = sanitizeBrandTone(raw);
  await setSetting(strapi, orgId, BRAND_TONE_KEY, value);
  return value;
}

function draftError(message, code, status) {
  const { AiError } = require('@webfudge/ai');
  return new AiError(message, { code, status });
}

/** Loads a record the user may read in their org, then drafts. Returns { subject, body, to, kind }. */
async function draftMessage(strapi, ctx, { recordType, recordId, kind, instructions, language }) {
  const { canAccess } = require('../rbac');
  const { orgIdFromRelation } = require('../content-api-helpers');
  const rec = RECORDS[recordType];
  if (!rec) throw draftError('Unknown record type.', 'AI_BAD_REQUEST', 400);
  if (!canAccess(ctx, 'crm', rec.module, 'read')) throw draftError(`You need read access to CRM.${rec.module}`, 'AI_FORBIDDEN', 403);
  const id = parseInt(recordId, 10);
  const entry = Number.isFinite(id) ? await strapi.entityService.findOne(rec.uid, id, { populate: { organization: { fields: ['id'] } } }) : null;
  if (!entry || orgIdFromRelation(entry.organization) !== ctx.state.orgId) throw draftError(`${rec.label} not found.`, 'AI_SUBJECT_NOT_FOUND', 404);

  const ai = require('./index');
  const { renderTemplate, generateObject } = require('@webfudge/ai');
  const tone = await getBrandTone(strapi, ctx.state.orgId);
  const u = ctx.state.user || {};
  const k = DRAFT_KINDS.includes(kind) ? kind : 'email';
  const out = await generateObject(ai.clientFor(strapi, ctx), {
    ...renderTemplate(
      'grow.draft_message',
      { kind: k, recordType: rec.label, facts: recordFacts(entry, rec.fields), brandTone: tone.tone, senderName: personName(u), instructions: String(instructions || '').slice(0, 400) },
      { language }
    ),
    feature: 'grow.draft',
    metadata: { subjectType: recordType, subjectId: id },
  });
  let body = String(out.object?.body || '');
  if (tone.signature && !body.includes(tone.signature)) body = `${body.trimEnd()}\n\n${tone.signature}`;
  return { kind: k, subject: String(out.object?.subject || ''), body, to: entry.email || null, credits: out.credits || 0 };
}

module.exports = {
  FIELDS,
  sanitizeFilter,
  resolvePeriod,
  buildLeadFilters,
  executeLeadQuery,
  describeFilter,
  parseQuestion,
  recordFacts,
  sanitizeBrandTone,
  buildScope,
  askGrow,
  runFilter,
  getBrandTone,
  setBrandTone,
  draftMessage,
  DRAFT_KINDS,
};
