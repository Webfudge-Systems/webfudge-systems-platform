'use strict';

/**
 * Deal health, daily call list and revenue forecast (ticket G19). Pure functions, no Strapi.
 *
 * Health replaces the old probability-only "deal health" chip: risk points come from deterministic
 * signals (days silent, time in stage vs the org's average, overdue tasks, close date passed) plus
 * the competitor / sentiment mentions that Fudge AI finds in recent notes (passed in as `mentions`).
 * The forecast is a weighted pipeline using stage win rates from the org's own closed deals, with an
 * 80% range from the variance of each deal's win/lose outcome. AI never touches the numbers.
 */

const DAY = 86400000;
const CLOSED = new Set(['won', 'lost']);
const MIN_SAMPLES = 3;
const DEFAULT_STAGE_DAYS = 14;
const DEFAULT_RATES = { discovery: 0.1, prospect: 0.2, proposal: 0.4, negotiation: 0.6, won: 1, lost: 0 };
const DEFAULT_RATE = 0.3;
const Z80 = 1.2816; // two-sided 80% interval

const POINTS = { silent: 30, quiet: 15, stalled: 25, overdueTask: 10, overdueMax: 20, closePassed: 15, competitor: 20, sentiment: 10 };

const dayStart = (v) => {
  const t = Date.parse(String(v).length === 10 ? `${v}T00:00:00Z` : v);
  return Number.isFinite(t) ? Math.floor(t / DAY) : null;
};
const daysBetween = (from, today) => {
  const a = dayStart(from);
  const b = dayStart(today);
  return a == null || b == null ? null : b - a;
};
const round = (n) => Math.round(n);

/** Mean days spent per stage from [{ stage, days }]; DEFAULT_STAGE_DAYS when a stage has < 3 samples. */
function averageStageDays(durations = []) {
  const acc = {};
  for (const { stage, days } of durations) {
    if (!stage || !Number.isFinite(days) || days < 0) continue;
    (acc[stage] = acc[stage] || []).push(days);
  }
  const out = {};
  for (const stage of [...Object.keys(DEFAULT_RATES), ...Object.keys(acc)]) {
    const xs = acc[stage] || [];
    out[stage] = xs.length >= MIN_SAMPLES ? round(xs.reduce((a, b) => a + b, 0) / xs.length) : DEFAULT_STAGE_DAYS;
  }
  return out;
}

/**
 * @param deal { id, stage, value, lastActivityAt, stageEnteredAt, expectedCloseDate, overdueTasks }
 * @param ctx  { today, avgStageDays, mentions?: { competitor?: string, sentiment?: 'positive'|'neutral'|'negative', evidence?: string } }
 * @returns { health 0-100, risk, level 'high'|'medium'|'low', reasons [{ code, text }], daysSilent, daysInStage, daysToClose }
 */
function dealSignals(deal, ctx = {}) {
  const today = ctx.today || new Date().toISOString().slice(0, 10);
  const daysSilent = daysBetween(deal.lastActivityAt, today);
  const daysInStage = daysBetween(deal.stageEnteredAt, today);
  const daysToClose = deal.expectedCloseDate ? -daysBetween(deal.expectedCloseDate, today) : null;
  const base = { daysSilent, daysInStage, daysToClose };
  if (CLOSED.has(String(deal.stage))) return { health: 100, risk: 0, level: 'low', reasons: [], ...base };

  const reasons = [];
  let risk = 0;
  const add = (code, points, text) => {
    risk += points;
    reasons.push({ code, text });
  };

  if (daysSilent != null && daysSilent >= 14) add('silent', POINTS.silent, `Gone silent: no activity for ${daysSilent} days`);
  else if (daysSilent != null && daysSilent >= 7) add('quiet', POINTS.quiet, `Quiet: no activity for ${daysSilent} days`);

  const avg = (ctx.avgStageDays || {})[deal.stage] || DEFAULT_STAGE_DAYS;
  if (daysInStage != null && daysInStage > avg * 1.5) add('stalled', POINTS.stalled, `Stalled: in ${deal.stage} for ${daysInStage} days (usually ${avg})`);

  const overdue = Number(deal.overdueTasks) || 0;
  if (overdue > 0) add('overdue_tasks', Math.min(POINTS.overdueMax, overdue * POINTS.overdueTask), `${overdue} overdue task${overdue === 1 ? '' : 's'}`);

  if (daysToClose != null && daysToClose < 0) add('close_date_passed', POINTS.closePassed, `Expected close date passed ${-daysToClose} days ago`);

  const m = ctx.mentions || {};
  if (m.competitor) add('competitor', POINTS.competitor, `Competitor mentioned: ${m.competitor}`);
  if (m.sentiment === 'negative') add('sentiment', POINTS.sentiment, m.evidence ? `Negative tone in notes: ${m.evidence}` : 'Negative tone in recent notes');

  const health = Math.max(0, 100 - risk);
  const level = risk >= 40 ? 'high' : risk >= 20 ? 'medium' : 'low';
  return { health, risk, level, reasons, ...base };
}

/** A plain "what to say" line from the top reason, used when AI is off or fails. */
function defaultTalkingPoint(deal, signals) {
  const name = deal.name || 'this deal';
  const top = signals.reasons[0]?.code;
  switch (top) {
    case 'competitor':
      return `Ask what they like about the other option for ${name} and restate where you are stronger.`;
    case 'silent':
    case 'quiet':
      return `Check in on ${name}: ask if priorities changed and offer a short call to agree next steps.`;
    case 'stalled':
      return `Ask what is blocking a decision on ${name} and who else needs to sign off.`;
    case 'close_date_passed':
      return `Confirm a new decision date for ${name} and what they need from you to get there.`;
    case 'overdue_tasks':
      return `Deliver the overdue follow-ups for ${name} and confirm the next step on the call.`;
    case 'sentiment':
      return `Ask openly about their concerns on ${name} and offer a way to address them.`;
    default:
      return `Confirm the decision date for ${name} and any last questions before close.`;
  }
}

/**
 * Prioritised list for one rep. Deals with risk, or closing within 7 days, are included; ranked by
 * risk + a value bonus (up to 20, relative to the biggest deal) + a closing-soon bonus.
 * @param ctx  { today, avgStageDays, mentionsByDeal?: { [dealId]: mentions }, talkingPoints?: { [dealId]: string } }
 */
function buildCallList(deals, ctx = {}, { limit = 10 } = {}) {
  const open = deals.filter((d) => !CLOSED.has(String(d.stage)));
  const maxValue = Math.max(1, ...open.map((d) => Number(d.value) || 0));
  return open
    .map((deal) => {
      const signals = dealSignals(deal, { ...ctx, mentions: ctx.mentionsByDeal?.[deal.id] });
      const closingSoon = signals.daysToClose != null && signals.daysToClose >= 0 && signals.daysToClose <= 7;
      const priority = signals.risk + 20 * Math.sqrt(Math.max(0, Number(deal.value) || 0) / maxValue) + (closingSoon ? 15 : 0);
      const reasons = signals.reasons.length ? signals.reasons : closingSoon ? [{ code: 'closing_soon', text: `Closes in ${signals.daysToClose} days` }] : [];
      return { deal, signals, priority, closingSoon, reasons };
    })
    .filter((x) => x.signals.risk > 0 || x.closingSoon)
    .sort((a, b) => b.priority - a.priority || (Number(b.deal.value) || 0) - (Number(a.deal.value) || 0) || a.deal.id - b.deal.id)
    .slice(0, limit)
    .map((x, i) => ({
      rank: i + 1,
      dealId: x.deal.id,
      name: x.deal.name || `Deal #${x.deal.id}`,
      value: Number(x.deal.value) || 0,
      stage: x.deal.stage,
      health: x.signals.health,
      level: x.signals.level,
      priority: round(x.priority),
      reasons: x.reasons,
      contact: x.deal.contactName || null,
      whatToSay: ctx.talkingPoints?.[x.deal.id] || defaultTalkingPoint(x.deal, { reasons: x.reasons }),
    }));
}

/**
 * Win rate per stage = share of closed deals that reached the stage and were won.
 * @param closedDeals [{ stage: 'won'|'lost', stagesReached: string[] }]
 */
function stageWinRates(closedDeals = []) {
  const reached = {};
  const won = {};
  for (const d of closedDeals) {
    const isWon = d.stage === 'won';
    for (const s of new Set(d.stagesReached || [])) {
      if (CLOSED.has(s)) continue;
      reached[s] = (reached[s] || 0) + 1;
      if (isWon) won[s] = (won[s] || 0) + 1;
    }
  }
  const out = { won: { rate: 1, samples: 0, source: 'fixed' }, lost: { rate: 0, samples: 0, source: 'fixed' } };
  for (const s of new Set([...Object.keys(DEFAULT_RATES), ...Object.keys(reached)])) {
    if (CLOSED.has(s)) continue;
    const n = reached[s] || 0;
    out[s] = n >= MIN_SAMPLES ? { rate: (won[s] || 0) / n, samples: n, source: 'history' } : { rate: DEFAULT_RATES[s] ?? DEFAULT_RATE, samples: n, source: 'default' };
  }
  return out;
}

const monthOf = (v) => (v ? String(v).slice(0, 7) : null);

/**
 * Revenue forecast for one month (YYYY-MM).
 * Open deals count in the month of their expected close date; overdue ones count in the current month.
 * expected = won so far + Σ value × stage win rate. Range = expected ± 1.28·σ with σ² = Σ value²·p(1−p),
 * clamped to [won so far, won so far + every deal closing].
 */
function forecastMonth({ month, today, rates = {}, openDeals = [], wonDeals = [] }) {
  const currentMonth = monthOf(today);
  const wonSoFar = wonDeals.filter((d) => monthOf(d.closedAt) === month).reduce((a, d) => a + (Number(d.value) || 0), 0);
  let weighted = 0;
  let variance = 0;
  let pipeline = 0;
  let undatedCount = 0;
  const byStage = {};
  const deals = [];
  for (const d of openDeals) {
    if (CLOSED.has(String(d.stage))) continue;
    if (!d.expectedCloseDate) {
      undatedCount += 1;
      continue;
    }
    let m = monthOf(d.expectedCloseDate);
    if (m < currentMonth) m = currentMonth;
    if (m !== month) continue;
    const v = Math.max(0, Number(d.value) || 0);
    const p = rates[d.stage]?.rate ?? DEFAULT_RATES[d.stage] ?? DEFAULT_RATE;
    weighted += v * p;
    variance += v * v * p * (1 - p);
    pipeline += v;
    const b = (byStage[d.stage] = byStage[d.stage] || { stage: d.stage, count: 0, value: 0, weighted: 0, rate: p });
    b.count += 1;
    b.value += v;
    b.weighted += v * p;
    deals.push({ id: d.id, name: d.name, stage: d.stage, value: v, probability: round(p * 100) });
  }
  const sd = Math.sqrt(variance);
  const expected = round(wonSoFar + weighted);
  return {
    month,
    expected,
    low: round(Math.max(wonSoFar, wonSoFar + weighted - Z80 * sd)),
    high: round(Math.min(wonSoFar + pipeline, wonSoFar + weighted + Z80 * sd)),
    confidence: 0.8,
    wonSoFar: round(wonSoFar),
    pipeline: round(pipeline),
    dealCount: deals.length,
    undatedCount,
    byStage: Object.values(byStage).map((b) => ({ ...b, value: round(b.value), weighted: round(b.weighted), rate: Math.round(b.rate * 100) / 100 })),
    topDeals: deals.sort((a, b) => b.value * b.probability - a.value * a.probability).slice(0, 5),
  };
}

const stageKey = (v) => (v == null || v === '(empty)' ? null : String(v).trim().toLowerCase());

/**
 * Facts per deal from the CRM activity log (subjectType "deal"): last activity, when the current stage
 * was entered, stages reached, recent note/comment texts (newest first, max 5), plus the days spent in
 * each completed stage across all deals (for averageStageDays).
 */
function activityFacts(deals, activities = []) {
  const rows = [...activities].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const byDeal = {};
  const durations = [];
  for (const deal of deals) {
    const mine = rows.filter((r) => Number(r.subjectId) === Number(deal.id));
    const stageChanges = mine
      .map((r) => ({ at: r.createdAt, change: (r.meta?.changes || []).find((c) => c.key === 'stage') }))
      .filter((x) => x.change);
    const stagesReached = [];
    const push = (s) => s && !stagesReached.includes(s) && stagesReached.push(s);
    let enteredAt = deal.createdAt;
    for (const { at, change } of stageChanges) {
      const from = stageKey(change.before);
      push(from);
      if (from && enteredAt) durations.push({ stage: from, days: Math.max(0, Math.round((Date.parse(at) - Date.parse(enteredAt)) / DAY)) });
      push(stageKey(change.after));
      enteredAt = at;
    }
    push(stageKey(deal.stage));
    const last = mine.length ? mine[mine.length - 1].createdAt : null;
    byDeal[deal.id] = {
      lastActivityAt: last || deal.createdAt || null,
      stageEnteredAt: enteredAt || null,
      stagesReached,
      notes: mine
        .filter((r) => r.action === 'comment')
        .map((r) => String(r.summary || r.meta?.text || '').trim())
        .filter(Boolean)
        .reverse()
        .slice(0, 5),
    };
  }
  return { byDeal, durations };
}

/** Next `count` months starting at today's month, as YYYY-MM. */
function nextMonths(today, count = 3) {
  const [y, m] = String(today).slice(0, 7).split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const t = new Date(Date.UTC(y, m - 1 + i, 1));
    return t.toISOString().slice(0, 7);
  });
}

module.exports = { activityFacts, averageStageDays, dealSignals, defaultTalkingPoint, buildCallList, stageWinRates, forecastMonth, nextMonths, DEFAULT_RATES };
