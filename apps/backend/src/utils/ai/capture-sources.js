'use strict';

/**
 * Conversation sources for AI auto-capture (G10). Every source has the same shape:
 *
 *   { key, label, available, reason?, collect(strapi, { orgId, subjectType, subjectId, leadId }) → [{ source, at, text }] }
 *
 * Add a source by appending to SOURCES. WhatsApp and voice notes are listed but not available:
 * they need Fudge Connect (WhatsApp inbox) and speech-to-text, which do not exist yet. Their
 * collect() returns nothing; do not fake them.
 */

const ACTIVITY_UID = 'api::crm-activity.crm-activity';
const MEETING_UID = 'api::meeting.meeting';
const ACTION_UID = 'api::ai.ai-action';

const MAX_ITEM = 2000;
const clean = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_ITEM);
const iso = (d) => (d ? new Date(d).toISOString() : null);
const metaOf = (m) => {
  if (m && typeof m === 'string') {
    try {
      return JSON.parse(m);
    } catch {
      return {};
    }
  }
  return m || {};
};

const SOURCES = [
  {
    key: 'comments',
    label: 'CRM comments and notes',
    available: true,
    async collect(strapi, { orgId, subjectType, subjectId }) {
      const filters = { organization: orgId, action: 'comment' };
      if (subjectType === 'deal') Object.assign(filters, { subjectType: 'deal', subjectId });
      else filters.leadCompany = subjectId;
      const rows = await strapi.entityService.findMany(ACTIVITY_UID, { filters, fields: ['meta', 'createdAt'], sort: { createdAt: 'desc' }, limit: 20 });
      return rows.map((r) => ({ source: 'comment', at: iso(r.createdAt), text: clean(metaOf(r.meta).comment) })).filter((r) => r.text);
    },
  },
  {
    key: 'meetings',
    label: 'Call and meeting notes',
    available: true,
    async collect(strapi, { orgId, subjectType, subjectId }) {
      const filters = { organization: orgId };
      if (subjectType === 'deal') filters.deal = subjectId;
      else filters.$or = [{ leadCompany: subjectId }, { deal: { leadCompany: subjectId } }];
      const rows = await strapi.entityService.findMany(MEETING_UID, {
        filters,
        fields: ['title', 'notes', 'aiSummary', 'outcome', 'startTime', 'updatedAt'],
        sort: { startTime: 'desc' },
        limit: 10,
      });
      return rows
        .filter((m) => m.notes || m.aiSummary)
        .map((m) => ({ source: 'meeting', at: iso(m.startTime || m.updatedAt), text: clean([m.title, m.notes, m.aiSummary].filter(Boolean).join('. ')) }));
    },
  },
  {
    key: 'emails',
    label: 'Emails sent from Fudge Grow',
    available: true,
    async collect(strapi, { orgId, leadId }) {
      if (!leadId) return [];
      const rows = await strapi.entityService.findMany(ACTION_UID, {
        filters: { orgKey: Number(orgId), actionKey: 'grow.lead.send_email', status: 'executed', subjectType: 'lead_company', subjectId: String(leadId) },
        fields: ['input', 'executedAt'],
        sort: { executedAt: 'desc' },
        limit: 5,
      });
      return rows.map((r) => ({ source: 'email', at: iso(r.executedAt), text: clean(`Email "${r.input?.subject || ''}": ${r.input?.body || ''}`) }));
    },
  },
  { key: 'whatsapp', label: 'WhatsApp chats', available: false, reason: 'Needs the Fudge Connect WhatsApp inbox, which is not built yet.', collect: async () => [] },
  { key: 'voice_notes', label: 'Voice notes', available: false, reason: 'Needs speech-to-text transcription, which is not built yet.', collect: async () => [] },
];

function listSources() {
  return SOURCES.map(({ key, label, available, reason }) => ({ key, label, available, reason: reason || null }));
}

/** All available sources, oldest first, capped at maxChars (newest kept). */
async function collectConversations(strapi, scope, { maxChars = 12000 } = {}) {
  const counts = {};
  const all = [];
  for (const s of SOURCES.filter((x) => x.available)) {
    try {
      const rows = await s.collect(strapi, scope);
      counts[s.key] = rows.length;
      all.push(...rows);
    } catch (err) {
      counts[s.key] = 0;
      strapi.log.warn(`[ai-capture] source ${s.key} failed: ${err.message}`);
    }
  }
  all.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
  const kept = [];
  let used = 0;
  for (const r of all) {
    if (used + r.text.length > maxChars) break;
    used += r.text.length;
    kept.push(r);
  }
  return { conversations: kept.reverse(), counts };
}

module.exports = { SOURCES, listSources, collectConversations };
