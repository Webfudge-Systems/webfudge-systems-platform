'use strict';

/**
 * G19 loader: reads deals, the CRM activity log and tasks for one org, runs the pure engine in
 * ./deal-health.js, asks Fudge AI (when on) for competitor/tone mentions + "what to say", and stores
 * each rep's daily call list in api::crm-call-list. Used by the API and the morning cron.
 */

const { renderTemplate, generateObject } = require('@webfudge/ai');
const engine = require('./deal-health');
const ai = require('./ai');
const { hasFeature } = require('./saas-plans');

const DEAL_UID = 'api::deal.deal';
const ACT_UID = 'api::crm-activity.crm-activity';
const TASK_UID = 'api::task.task';
const LIST_UID = 'api::crm-call-list.crm-call-list';
const FEATURE = 'crm.deal_health';
const OPEN_TASK_EXCLUDE = ['COMPLETED', 'CANCELLED'];
const AI_BATCH = 20;
const AI_FRESH_HOURS = 20;

const todayIso = (now = new Date()) => {
  // Calendar day in IST (the cron runs on Asia/Kolkata time).
  return new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);
};
const relId = (r) => (r == null ? null : typeof r === 'object' ? r.id ?? null : Number(r));
const personName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || null : null);

/** Everything the engine needs for one org. */
async function loadOrg(strapi, orgId, today = todayIso()) {
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - 365 * 86400000).toISOString();
  const deals = await strapi.entityService.findMany(DEAL_UID, {
    filters: { organization: orgId, $or: [{ stage: { $notIn: ['won', 'lost'] } }, { closedAt: { $gte: since } }, { updatedAt: { $gte: since } }] },
    fields: ['id', 'name', 'value', 'stage', 'probability', 'expectedCloseDate', 'closedAt', 'createdAt', 'updatedAt', 'aiHealth', 'notes', 'description'],
    populate: { assignedTo: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] }, contact: { fields: ['id', 'firstName', 'lastName'] } },
    limit: 5000,
  });
  const ids = deals.map((d) => d.id);
  const activities = ids.length
    ? await strapi.db.query(ACT_UID).findMany({
        where: { organization: orgId, subjectType: 'deal', subjectId: { $in: ids }, createdAt: { $gte: since } },
        select: ['id', 'subjectId', 'action', 'summary', 'meta', 'createdAt'],
        limit: 50000,
      })
    : [];
  const overdueRows = ids.length
    ? await strapi.entityService.findMany(TASK_UID, {
        filters: { organization: orgId, deal: { id: { $in: ids } }, status: { $notIn: OPEN_TASK_EXCLUDE }, scheduledDate: { $lt: `${today}T00:00:00.000Z` } },
        fields: ['id'],
        populate: { deal: { fields: ['id'] } },
        limit: 5000,
      })
    : [];
  const overdue = {};
  for (const t of overdueRows) {
    const id = relId(t.deal);
    if (id) overdue[id] = (overdue[id] || 0) + 1;
  }

  const { byDeal, durations } = engine.activityFacts(deals, activities);
  const enriched = deals.map((d) => {
    const f = byDeal[d.id] || {};
    const contact = d.contact ? [d.contact.firstName, d.contact.lastName].filter(Boolean).join(' ') : null;
    return {
      ...d,
      value: Number(d.value) || 0,
      ownerId: relId(d.assignedTo),
      ownerName: personName(d.assignedTo),
      contactName: contact || null,
      lastActivityAt: f.lastActivityAt,
      stageEnteredAt: f.stageEnteredAt,
      stagesReached: f.stagesReached || [],
      notes: [...(f.notes || []), ...[d.notes, d.description].filter(Boolean).map((s) => String(s).slice(0, 400))].slice(0, 6),
      overdueTasks: overdue[d.id] || 0,
    };
  });
  const open = enriched.filter((d) => !['won', 'lost'].includes(d.stage));
  const closed = enriched.filter((d) => ['won', 'lost'].includes(d.stage));
  return {
    today,
    open,
    closed,
    won: closed.filter((d) => d.stage === 'won').map((d) => ({ value: d.value, closedAt: d.closedAt || d.updatedAt })),
    avgStageDays: engine.averageStageDays(durations),
    rates: engine.stageWinRates(closed),
  };
}

/** Mentions + talking points already stored on deals by an earlier AI run. */
function cachedAi(deals) {
  const mentionsByDeal = {};
  const talkingPoints = {};
  for (const d of deals) {
    const h = d.aiHealth;
    if (!h || typeof h !== 'object') continue;
    mentionsByDeal[d.id] = { competitor: h.competitor || '', sentiment: h.sentiment || 'neutral', evidence: h.evidence || '' };
    if (h.whatToSay) talkingPoints[d.id] = h.whatToSay;
  }
  return { mentionsByDeal, talkingPoints };
}

/**
 * Fudge AI pass over the given deals (metered to the org). Stores the result on deal.aiHealth.
 * Returns the number of deals analysed; 0 when AI is off. Errors (credits exhausted, provider down)
 * are swallowed by the cron caller so the deterministic list is still built.
 */
async function analyseDeals(strapi, orgId, ctxData, deals, { force = false, language } = {}) {
  if (!ai.aiEnabled() || !deals.length) return 0;
  const fresh = (d) => d.aiHealth?.checkedAt && Date.now() - Date.parse(d.aiHealth.checkedAt) < AI_FRESH_HOURS * 3600000;
  const todo = deals.filter((d) => force || !fresh(d));
  if (!todo.length) return 0;
  const client = ai.clientFor(strapi, null, { orgId, userId: null });
  let n = 0;
  for (let i = 0; i < todo.length; i += AI_BATCH) {
    const batch = todo.slice(i, i + AI_BATCH);
    const input = batch.map((d) => {
      const s = engine.dealSignals(d, { today: ctxData.today, avgStageDays: ctxData.avgStageDays });
      return { dealId: d.id, name: d.name, stage: d.stage, value: d.value, contact: d.contactName, reasons: s.reasons.map((r) => r.text), notes: d.notes };
    });
    const t = renderTemplate('grow.deal_signals', { deals: input, today: ctxData.today }, { language });
    const out = await generateObject(client, { ...t, feature: 'grow.deal_signals', metadata: { subjectType: 'deal_batch', subjectId: batch[0].id } });
    const checkedAt = new Date().toISOString();
    for (const item of out.object?.deals || []) {
      const deal = batch.find((d) => d.id === Number(item.dealId));
      if (!deal) continue;
      const aiHealth = { competitor: item.competitor || '', sentiment: item.sentiment || 'neutral', evidence: item.evidence || '', whatToSay: item.whatToSay || '', checkedAt, model: out.model };
      deal.aiHealth = aiHealth;
      await strapi.db.query(DEAL_UID).update({ where: { id: deal.id }, data: { aiHealth } });
      n += 1;
    }
  }
  return n;
}

/** Health for one deal (deterministic + cached AI mentions). */
function healthFor(ctxData, deal) {
  const { mentionsByDeal, talkingPoints } = cachedAi([deal]);
  const signals = engine.dealSignals(deal, { today: ctxData.today, avgStageDays: ctxData.avgStageDays, mentions: mentionsByDeal[deal.id] });
  return {
    ...signals,
    whatToSay: talkingPoints[deal.id] || engine.defaultTalkingPoint(deal, signals),
    aiCheckedAt: deal.aiHealth?.checkedAt || null,
    lastActivityAt: deal.lastActivityAt,
    stageEnteredAt: deal.stageEnteredAt,
    avgStageDays: ctxData.avgStageDays[deal.stage] || null,
    overdueTasks: deal.overdueTasks,
  };
}

/** Call list for one rep from loaded org data. */
function callListFor(ctxData, userId, opts = {}) {
  const mine = ctxData.open.filter((d) => Number(d.ownerId) === Number(userId));
  return engine.buildCallList(mine, { today: ctxData.today, avgStageDays: ctxData.avgStageDays, ...cachedAi(mine) }, opts);
}

/** Forecast for the next three months, optionally limited to one rep's deals. */
function forecastFor(ctxData, { ownerId = null } = {}) {
  const mine = (d) => ownerId == null || Number(d.ownerId) === Number(ownerId);
  const openDeals = ctxData.open.filter(mine);
  const wonDeals = ctxData.closed.filter((d) => d.stage === 'won' && mine(d)).map((d) => ({ value: d.value, closedAt: d.closedAt || d.updatedAt }));
  return {
    months: engine.nextMonths(ctxData.today, 3).map((month) => engine.forecastMonth({ month, today: ctxData.today, rates: ctxData.rates, openDeals, wonDeals })),
    rates: Object.fromEntries(Object.entries(ctxData.rates).map(([k, v]) => [k, { rate: Math.round(v.rate * 100) / 100, samples: v.samples, source: v.source }])),
    closedDealsUsed: ctxData.closed.length,
  };
}

async function saveList(strapi, orgId, userId, date, items, aiUsed) {
  const existing = await strapi.db.query(LIST_UID).findOne({ where: { organization: orgId, user: userId, date } });
  const data = { items, aiUsed: !!aiUsed, generatedAt: new Date().toISOString() };
  if (existing) return strapi.db.query(LIST_UID).update({ where: { id: existing.id }, data });
  return strapi.db.query(LIST_UID).create({ data: { ...data, date, organization: orgId, user: userId } });
}

/**
 * Builds and stores today's list for every rep with open deals in one org.
 * @returns {{ reps: number, ai: number }}
 */
async function buildOrgLists(strapi, orgId, { today = todayIso(), notify = true } = {}) {
  const data = await loadOrg(strapi, orgId, today);
  let aiCount = 0;
  try {
    const risky = data.open.filter((d) => d.ownerId && (engine.dealSignals(d, { today, avgStageDays: data.avgStageDays }).risk > 0 || d.notes.length));
    aiCount = await analyseDeals(strapi, orgId, data, risky);
  } catch (e) {
    strapi.log.warn(`[deal-health] AI pass skipped for org ${orgId}: ${e?.code || ''} ${e?.message || e}`);
  }
  const reps = [...new Set(data.open.map((d) => d.ownerId).filter(Boolean))];
  for (const userId of reps) {
    const items = callListFor(data, userId);
    await saveList(strapi, orgId, userId, today, items, aiCount > 0);
    if (notify && items.length) {
      const atRisk = items.filter((i) => i.level === 'high').length;
      try {
        await strapi.service('api::notification.notification')?.notify?.({
          userIds: [userId],
          organizationId: orgId,
          type: 'info',
          title: `Today's call list: ${items.length} deal${items.length === 1 ? '' : 's'}`,
          message: atRisk ? `${atRisk} at risk. Start with ${items[0].name}: ${items[0].reasons[0]?.text || ''}`.trim() : `Start with ${items[0].name}.`,
          data: { href: '/', kind: 'deal_call_list', date: today },
        });
      } catch (_) {
        /* best-effort */
      }
    }
  }
  return { reps: reps.length, ai: aiCount };
}

/** Morning cron: every SaaS org whose plan has crm.deal_health. */
async function runDailyCallLists(strapi, { today = todayIso() } = {}) {
  const orgs = await strapi.db.query('api::organization.organization').findMany({ select: ['id'], limit: 10000 });
  const out = { orgs: 0, reps: 0, ai: 0, failed: 0 };
  for (const { id } of orgs) {
    try {
      if (!(await hasFeature(strapi, id, FEATURE))) continue;
      const r = await buildOrgLists(strapi, id, { today });
      out.orgs += 1;
      out.reps += r.reps;
      out.ai += r.ai;
    } catch (e) {
      out.failed += 1;
      strapi.log.error(`[deal-health] org ${id}: ${e?.message || e}`);
    }
  }
  return out;
}

module.exports = { FEATURE, LIST_UID, todayIso, loadOrg, analyseDeals, healthFor, callListFor, forecastFor, saveList, buildOrgLists, runDailyCallLists };
