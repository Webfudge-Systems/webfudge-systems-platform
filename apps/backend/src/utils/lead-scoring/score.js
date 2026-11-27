'use strict';

/**
 * G11 deterministic lead score (0-100) = fit (0-50) + intent (0-50). Pure functions, no I/O, so it
 * is cheap, always available (no AI key or credits needed) and easy to test.
 *
 *   fit    — field completeness, source quality, the org's historical win rates by source/industry, deal value
 *   intent — engagement recency and volume, meetings, lead status, sentiment of recent comments
 */

const DAY = 86400000;

/** Prior source quality (0-15) when the org has too little history of its own. */
const SOURCE_PRIOR = {
  REFERRAL: 12, PARTNER: 11, FROM_ACCOUNT: 11, WEBSITE: 10, INBOUND: 10, WEBSITE_FORM: 10,
  META_LEAD_ADS: 8, LINKEDIN: 8, SOCIAL_MEDIA: 7, EMAIL_CAMPAIGN: 7, INDIAMART: 6, JUSTDIAL: 6,
  IMPORT: 4, COLD_CALL: 4, OTHER: 5,
};
const SOURCE_UNKNOWN = 5;
const MIN_HISTORY = 5; // closed deals needed before a source/industry's own win rate counts
const SMOOTHING = 5;

const POSITIVE = [
  'interested', 'proposal', 'quote', 'quotation', 'pricing', 'price list', 'demo', 'budget approved', 'ready to',
  'go ahead', 'confirm', 'agreed', 'sign', 'contract', 'purchase order', 'po ', 'urgent', 'asap', 'next week', 'meeting booked',
  'happy', 'great', 'looks good', 'shortlisted', 'trial',
];
const NEGATIVE = [
  'not interested', 'no budget', 'no requirement', 'too expensive', 'costly', 'later', 'next year', 'not now', 'unsubscribe',
  'stop', 'cancel', 'competitor', 'went with', 'no response', 'not responding', 'unreachable', 'wrong number', 'spam', 'reject',
  'not a fit', 'declined', 'on hold',
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const key = (v) => String(v || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
const present = (v) => v !== null && v !== undefined && String(v).trim() !== '';

function labelFor(score) {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

/** -1 (negative) … 1 (positive) from free-text comments/notes. */
function sentimentOf(texts = []) {
  let pos = 0;
  let neg = 0;
  for (const raw of texts) {
    let t = ` ${String(raw || '').toLowerCase()} `;
    for (const w of NEGATIVE) {
      if (t.includes(w)) {
        neg += 1;
        t = t.split(w).join(' ');
      }
    }
    for (const w of POSITIVE) if (t.includes(w)) pos += 1;
  }
  if (!pos && !neg) return 0;
  return clamp((pos - neg) / (pos + neg), -1, 1);
}

/** Smoothed win rates from closed deals: { overall, closed, bySource, byIndustry }. */
function winRatesFrom(deals = []) {
  const closed = deals.filter((d) => d && (d.stage === 'won' || d.stage === 'lost'));
  const won = closed.filter((d) => d.stage === 'won').length;
  const overall = closed.length ? won / closed.length : 0;
  const group = (pick) => {
    const acc = {};
    for (const d of closed) {
      const k = key(pick(d));
      if (!k) continue;
      acc[k] = acc[k] || { won: 0, total: 0 };
      acc[k].total += 1;
      if (d.stage === 'won') acc[k].won += 1;
    }
    for (const g of Object.values(acc)) g.rate = (g.won + overall * SMOOTHING) / (g.total + SMOOTHING);
    return acc;
  };
  return {
    overall,
    closed: closed.length,
    bySource: group((d) => d.source || d.leadCompany?.source),
    byIndustry: group((d) => d.leadCompany?.industry),
  };
}

const pct = (r) => `${Math.round(r * 100)}%`;
const ts = (v) => (v ? new Date(v).getTime() : NaN);

/**
 * @param {object} lead          lead-company (contacts populated if available)
 * @param {object} [o]
 * @param {Array}  [o.activities] crm-activity rows for the lead ({ action, summary, createdAt })
 * @param {Array}  [o.meetings]   meetings for the lead ({ status, outcome, startTime, notes })
 * @param {object} [o.winRates]   winRatesFrom(org's deals)
 * @param {Date}   [o.now]
 */
function computeBaseScore(lead = {}, { activities = [], meetings = [], winRates = null, now = new Date() } = {}) {
  const factors = [];
  const add = (k, impact, text) => {
    if (impact) factors.push({ key: k, impact: Math.round(impact), text });
  };
  const nowMs = new Date(now).getTime();

  // ---------- fit ----------
  const contacts = Array.isArray(lead.contacts) ? lead.contacts : [];
  const checks = [
    ['email', 4, present(lead.email) || contacts.some((c) => present(c.email))],
    ['phone', 4, present(lead.phone) || contacts.some((c) => present(c.phone))],
    ['website', 2, present(lead.website)],
    ['industry', 2, present(lead.industry)],
    ['location', 2, present(lead.city) || present(lead.country)],
    ['size', 2, present(lead.employees)],
    ['contact', 2, contacts.length > 0],
    ['role', 2, contacts.some((c) => present(c.jobTitle))],
  ];
  const completeness = checks.reduce((s, [, p, ok]) => s + (ok ? p : 0), 0);
  const missing = checks.filter(([, , ok]) => !ok).map(([k]) => k);
  if (completeness >= 14) add('completeness', completeness, `Profile is complete (${missing.length ? `missing ${missing.slice(0, 2).join(', ')}` : 'contact details, company and decision maker'}).`);
  else add('completeness', completeness || -1, `Profile is thin: missing ${missing.slice(0, 3).join(', ')}.`);

  const src = key(lead.source);
  const srcHist = src && winRates?.bySource?.[src];
  let sourcePts;
  if (srcHist && srcHist.total >= MIN_HISTORY) {
    sourcePts = clamp(7.5 + (srcHist.rate - winRates.overall) * 30, 0, 15);
    add('source', sourcePts - 7.5 || 0.5, `${lead.source} leads win ${pct(srcHist.rate)} of the time for you (overall ${pct(winRates.overall)}).`);
  } else {
    sourcePts = src ? SOURCE_PRIOR[src] ?? SOURCE_UNKNOWN : SOURCE_UNKNOWN;
    if (src) add('source', sourcePts - SOURCE_UNKNOWN, sourcePts >= 10 ? `${lead.source} is a high-quality source.` : sourcePts < SOURCE_UNKNOWN ? `${lead.source} leads usually convert less.` : `Source: ${lead.source}.`);
  }

  let industryPts = 0;
  const ind = key(lead.industry);
  const indHist = ind && winRates?.byIndustry?.[ind];
  if (indHist && indHist.total >= MIN_HISTORY) {
    industryPts = clamp((indHist.rate - winRates.overall) * 20, -5, 5);
    add('industry', industryPts, `${lead.industry} deals win ${pct(indHist.rate)} of the time for you.`);
  }

  const dealPts = Number(lead.dealValue) > 0 ? 5 : 0;
  add('dealValue', dealPts, 'A deal value is already estimated.');

  const fit = clamp(completeness + sourcePts + industryPts + dealPts, 0, 50);

  // ---------- intent ----------
  const times = [
    ...activities.map((a) => ts(a.createdAt)),
    ...meetings.filter((m) => m.status === 'completed').map((m) => ts(m.startTime)),
  ].filter((t) => Number.isFinite(t) && t <= nowMs + DAY);
  const last = times.length ? Math.max(...times) : NaN;
  const days = Number.isFinite(last) ? Math.max(0, Math.floor((nowMs - last) / DAY)) : null;
  let recency = 0;
  if (days !== null) recency = days < 3 ? 15 : days < 7 ? 12 : days < 14 ? 8 : days < 30 ? 4 : 0;
  if (days === null) add('recency', -2, 'No engagement recorded yet.');
  else if (recency) add('recency', recency, days === 0 ? 'Engaged today.' : `Last engagement ${days} day${days === 1 ? '' : 's'} ago.`);
  else add('recency', -4, `No engagement for ${days} days.`);

  const recentCount = times.filter((t) => nowMs - t <= 30 * DAY).length;
  const volume = Math.min(10, recentCount * 2);
  if (recentCount >= 3) add('volume', volume, `${recentCount} touchpoints in the last 30 days.`);

  let meetingPts = 0;
  for (const m of meetings) {
    if (m.status === 'completed') meetingPts += 6;
    if (m.outcome === 'positive') meetingPts += 6;
    if (m.outcome === 'negative') meetingPts -= 8;
    if (m.status === 'scheduled' && ts(m.startTime) >= nowMs) meetingPts += 5;
  }
  meetingPts = clamp(meetingPts, -8, 12);
  if (meetingPts > 0) add('meetings', meetingPts, meetings.some((m) => m.outcome === 'positive') ? 'Had a positive meeting.' : 'A meeting is on the calendar or done.');
  if (meetingPts < 0) add('meetings', meetingPts, 'Last meeting outcome was negative.');

  const status = key(lead.status);
  const statusPts = { QUALIFIED: 8, CONTACTED: 4, ACTIVE: 4, PROPOSAL: 8, NEGOTIATION: 10, CONVERTED: 10, CLIENT: 10 }[status] || 0;
  if (statusPts) add('status', statusPts, `Status is ${lead.status}.`);

  const recentTexts = [
    ...activities.filter((a) => a.action === 'comment' && nowMs - ts(a.createdAt) <= 30 * DAY).map((a) => a.summary),
    ...meetings.filter((m) => nowMs - ts(m.startTime) <= 30 * DAY).map((m) => m.notes),
  ].filter(present);
  const sentiment = sentimentOf(recentTexts);
  const sentimentPts = Math.round(sentiment * 8);
  if (sentimentPts > 0) add('sentiment', sentimentPts, 'Recent conversation shows buying signals.');
  if (sentimentPts < 0) add('sentiment', sentimentPts, 'Recent conversation is negative (objections like "not interested" or budget).');

  const intent = clamp(recency + volume + meetingPts + statusPts + sentimentPts, 0, 50);

  let score = Math.round(clamp(fit + intent, 0, 100));
  if (status === 'LOST' || status === 'DISQUALIFIED') {
    score = Math.min(score, 10);
    add('status', -50, `Marked ${lead.status}.`);
  }

  // Top 3 reasons: the strongest negative (if any) always surfaces, then the strongest positives.
  const sorted = [...factors].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  const neg = sorted.find((f) => f.impact <= -3);
  const picked = [...(neg ? [neg] : []), ...sorted.filter((f) => f !== neg && f.impact > 0)].slice(0, 3);
  if (!picked.length && sorted.length) picked.push(sorted[0]);
  const reasons = picked.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).map((f) => f.text);

  let nextStep;
  if (status === 'LOST') nextStep = 'Revisit in a quarter or archive.';
  else if (missing.includes('email') && missing.includes('phone')) nextStep = 'Find an email or phone number for this lead.';
  else if (days === null || days >= 14) nextStep = 'Follow up: no recent contact.';
  else if (sentiment < 0) nextStep = 'Address the objections raised in the last conversation.';
  else if (!statusPts) nextStep = 'Qualify: confirm need, budget and timeline.';
  else nextStep = 'Book a meeting or send a proposal.';

  return { score, label: labelFor(score), fit: Math.round(fit), intent: Math.round(intent), sentiment, reasons, factors: sorted, nextStep };
}

/** Blends the deterministic base with the AI's view (60/40) and prefers the AI's reasons. */
function blendWithAi(base, ai) {
  const aiScore = clamp(Math.round(Number(ai.score) || 0), 0, 100);
  const score = Math.round(base.score * 0.6 + aiScore * 0.4);
  const reasons = (Array.isArray(ai.reasons) && ai.reasons.length ? ai.reasons : base.reasons).slice(0, 3);
  return { ...base, score, label: labelFor(score), reasons, nextStep: ai.nextStep || base.nextStep, source: 'ai', base: base.score, ai: { score: aiScore, model: ai.model || null } };
}

module.exports = { computeBaseScore, winRatesFrom, sentimentOf, blendWithAi, labelFor };
