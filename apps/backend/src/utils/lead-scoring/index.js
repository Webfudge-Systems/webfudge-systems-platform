'use strict';

/**
 * G11 AI lead scoring service.
 *
 *   rescoreLead      — deterministic base score, plus the Fudge AI layer (sentiment/intent + top reasons) when
 *                      AI is enabled, a provider is configured and the org has credits; falls back to the
 *                      deterministic reasons otherwise. Stores aiScore / aiScoreLabel / aiScoreReasons / aiScoredAt.
 *   scheduleRescore  — debounced per lead; called from crm-activity and meeting lifecycles.
 *   backfillScores   — nightly: leads without a score (and stale rule scores, since recency decays).
 *
 * Extends P5 (`grow.lead_score` template + the aiScore fields); the manual `score` field is left alone.
 */

const { computeBaseScore, winRatesFrom, blendWithAi } = require('./score');

const LEAD_UID = 'api::lead-company.lead-company';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';
const MEETING_UID = 'api::meeting.meeting';
const DEAL_UID = 'api::deal.deal';

const HOUR = 3600000;
const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);

// ---------- org win-rate history (cached) ----------

const winCache = new Map();
async function orgWinRates(strapi, orgId, now = Date.now()) {
  if (!orgId) return null;
  const hit = winCache.get(String(orgId));
  if (hit && now - hit.at < HOUR) return hit.value;
  let value = null;
  try {
    const deals = await strapi.entityService.findMany(DEAL_UID, {
      filters: { organization: { id: orgId }, stage: { $in: ['won', 'lost'] } },
      fields: ['stage', 'source'],
      populate: { leadCompany: { fields: ['source', 'industry'] } },
      limit: 2000,
    });
    value = winRatesFrom(deals || []);
  } catch (err) {
    strapi.log.warn(`[lead-score] win rates failed for org ${orgId}: ${err.message}`);
  }
  winCache.set(String(orgId), { at: now, value });
  return value;
}

// ---------- AI layer ----------

function aiAvailable() {
  const ai = require('../ai');
  return ai.aiEnabled() && ai.providerConfigured();
}

/** Default AI scorer: P5 `grow.lead_score` template with the deterministic baseline + recent activity, metered to the org. */
async function defaultAiScore({ strapi, orgId, userId = null, lead, signals }) {
  const { renderTemplate, generateObject } = require('@webfudge/ai');
  const ai = require('../ai');
  const t = renderTemplate('grow.lead_score', { lead, signals });
  const out = await generateObject(ai.clientFor(strapi, null, { orgId, userId }), {
    ...t,
    feature: 'grow.lead_score',
    metadata: { subjectType: 'lead_company', subjectId: lead.id, auto: true },
  });
  return { ...out.object, model: out.model };
}

// ---------- rescore ----------

/**
 * @param {object}  strapi
 * @param {number}  leadId
 * @param {object}  [o]
 * @param {number}  [o.orgId]    when given, the lead must belong to this org
 * @param {boolean} [o.ai]       true: try the AI layer; false: rules only; undefined: AI if available
 * @param {function}[o.aiScore]  AI scorer override (tests)
 * @param {number}  [o.userId]   who to attribute AI usage to
 * @param {string}  [o.trigger]  'manual' | 'comment' | 'meeting' | 'activity' | 'backfill'
 * @returns {Promise<null|{ leadId, score, label, base, fit, intent, reasons, nextStep, source, scoredAt }>}
 */
async function rescoreLead(strapi, leadId, { orgId, ai, aiScore, userId = null, trigger = 'manual', now = new Date() } = {}) {
  const lead = await strapi.entityService.findOne(LEAD_UID, Number(leadId), {
    populate: { organization: { fields: ['id'] }, contacts: { fields: ['firstName', 'lastName', 'email', 'phone', 'jobTitle'] } },
  });
  if (!lead) return null;
  const leadOrg = relId(lead.organization);
  if (orgId != null && String(leadOrg) !== String(orgId)) return null;

  const [activities, meetings, winRates] = await Promise.all([
    strapi.entityService.findMany(ACTIVITY_UID, { filters: { leadCompany: { id: lead.id } }, fields: ['action', 'summary', 'createdAt'], sort: { createdAt: 'desc' }, limit: 50 }).catch(() => []),
    strapi.entityService.findMany(MEETING_UID, { filters: { leadCompany: { id: lead.id } }, fields: ['status', 'outcome', 'startTime', 'notes'], sort: { startTime: 'desc' }, limit: 20 }).catch(() => []),
    orgWinRates(strapi, leadOrg, new Date(now).getTime()),
  ]);

  const base = computeBaseScore(lead, { activities: activities || [], meetings: meetings || [], winRates, now });
  let result = { ...base, source: 'rules', base: base.score };

  const useAi = ai === undefined ? aiAvailable() : ai;
  if (useAi) {
    const signals = {
      baseline: { score: base.score, fit: base.fit, intent: base.intent, factors: base.factors.slice(0, 6).map((f) => f.text) },
      recentActivity: (activities || []).filter((a) => a.summary).slice(0, 10).map((a) => `${String(a.createdAt).slice(0, 10)} ${a.action}: ${String(a.summary).slice(0, 300)}`),
      meetings: (meetings || []).slice(0, 5).map((m) => ({ status: m.status, outcome: m.outcome, when: m.startTime })),
    };
    try {
      const out = await (aiScore || defaultAiScore)({ strapi, orgId: leadOrg, userId, lead, signals });
      result = blendWithAi(base, out);
    } catch (err) {
      // No key, no credits, plan without AI, or a provider error: keep the deterministic score and reasons.
      strapi.log.debug?.(`[lead-score] AI layer skipped for lead ${lead.id}: ${err.code || ''} ${err.message}`);
    }
  }

  const scoredAt = new Date(now);
  await strapi.entityService.update(LEAD_UID, lead.id, {
    data: {
      aiScore: result.score,
      aiScoreLabel: result.label,
      aiScoreReasons: {
        reasons: result.reasons,
        nextStep: result.nextStep,
        source: result.source,
        base: result.base,
        fit: result.fit,
        intent: result.intent,
        sentiment: Math.round((result.sentiment || 0) * 100) / 100,
        model: result.ai?.model || null,
        aiScore: result.ai?.score ?? null,
        trigger,
      },
      aiScoredAt: scoredAt,
    },
  });
  // Background rescores don't pass through the HTTP cache middleware, so drop the org's cached lists.
  if (trigger !== 'manual' && leadOrg) {
    try {
      await require('../cache').invalidateOrg(leadOrg);
    } catch {
      /* cache off */
    }
  }

  return {
    leadId: lead.id,
    score: result.score,
    label: result.label,
    base: result.base,
    fit: result.fit,
    intent: result.intent,
    reasons: result.reasons,
    nextStep: result.nextStep,
    source: result.source,
    scoredAt: scoredAt.toISOString(),
  };
}

// ---------- debounced recalculation ----------

const pending = new Map();
const TRIGGER_RANK = { activity: 1, comment: 2, meeting: 2 };

/** AI on automatic rescoring only for conversation triggers, and at most once per lead per interval. */
async function autoRescore(strapi, leadId, trigger) {
  let ai = false;
  if (TRIGGER_RANK[trigger] === 2 && aiAvailable()) {
    const minMs = (Number(process.env.LEAD_SCORE_AI_MIN_INTERVAL_MIN) || 360) * 60000;
    const lead = await strapi.entityService.findOne(LEAD_UID, Number(leadId), { fields: ['aiScoredAt', 'aiScoreReasons'] });
    const lastAi = lead?.aiScoreReasons?.source === 'ai' && lead.aiScoredAt ? new Date(lead.aiScoredAt).getTime() : 0;
    ai = Date.now() - lastAi >= minMs;
  }
  return rescoreLead(strapi, leadId, { ai, trigger });
}

/** Coalesces bursts of activity on one lead into a single rescore after `delayMs` of quiet. */
function scheduleRescore(strapi, leadId, { delayMs, runner, trigger = 'activity' } = {}) {
  const id = Number(leadId);
  if (!id) return;
  const wait = delayMs ?? (Number(process.env.LEAD_SCORE_DEBOUNCE_MS) || 30000);
  const prev = pending.get(id);
  if (prev) clearTimeout(prev.timer);
  const t = prev && (TRIGGER_RANK[prev.trigger] || 0) > (TRIGGER_RANK[trigger] || 0) ? prev.trigger : trigger;
  const timer = setTimeout(async () => {
    pending.delete(id);
    try {
      await (runner ? runner(id, t) : autoRescore(strapi, id, t));
    } catch (err) {
      strapi?.log?.warn(`[lead-score] rescore failed for lead ${id}: ${err.message}`);
    }
  }, wait);
  timer.unref?.();
  pending.set(id, { timer, trigger: t });
}

/** Lifecycle entry point: off in tests unless LEAD_SCORE_AUTO=on, and switchable off with LEAD_SCORE_AUTO=off. */
function onLeadActivity(strapi, leadId, trigger) {
  const flag = String(process.env.LEAD_SCORE_AUTO || '').toLowerCase();
  if (flag === 'off' || (process.env.NODE_ENV === 'test' && flag !== 'on')) return;
  if (leadId) scheduleRescore(strapi, leadId, { trigger });
}

// ---------- nightly backfill ----------

/** Rules-only (no credits): leads with no score first, then rule scores older than 7 days. */
async function backfillScores(strapi, { limit = 1000, now = new Date() } = {}) {
  const q = strapi.db.query(LEAD_UID);
  const unscored = await q.findMany({ where: { aiScoredAt: { $null: true } }, select: ['id'], limit });
  const staleBefore = new Date(new Date(now).getTime() - 7 * 24 * HOUR);
  const stale = unscored.length < limit
    ? await q.findMany({ where: { aiScoredAt: { $lt: staleBefore } }, select: ['id'], orderBy: { aiScoredAt: 'asc' }, limit: limit - unscored.length })
    : [];
  let scored = 0;
  let failed = 0;
  for (const { id } of [...unscored, ...stale]) {
    try {
      if (await rescoreLead(strapi, id, { ai: false, trigger: 'backfill', now })) scored += 1;
    } catch (err) {
      failed += 1;
      strapi.log.warn(`[lead-score] backfill failed for lead ${id}: ${err.message}`);
    }
  }
  return { scored, failed, unscored: unscored.length, stale: stale.length };
}

module.exports = { rescoreLead, scheduleRescore, onLeadActivity, backfillScores, orgWinRates };
