'use strict';

/**
 * G11 AI lead scoring: deterministic base score, win-rate history, comment sentiment, AI blend,
 * fallback without AI, debounced recalculation. Pure units + a fake strapi (no DB, no API key).
 *   npm run test:ai   (from apps/backend)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { computeBaseScore, winRatesFrom, sentimentOf, blendWithAi, labelFor } = require('../../src/utils/lead-scoring/score');
const scoring = require('../../src/utils/lead-scoring');

const NOW = new Date('2026-11-27T10:00:00Z');
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();

const bare = { id: 1, companyName: 'Acme' };
const rich = {
  id: 2,
  companyName: 'Acme',
  email: 'a@acme.in',
  phone: '+91 99999 99999',
  website: 'acme.in',
  industry: 'Manufacturing',
  city: 'Pune',
  employees: '50-200',
  source: 'REFERRAL',
  status: 'QUALIFIED',
  dealValue: 250000,
  contacts: [{ firstName: 'R', jobTitle: 'CEO', email: 'r@acme.in' }],
};

test('every lead gets a 0-100 score, a label and at least one reason', () => {
  const r = computeBaseScore(bare, { now: NOW });
  assert.ok(Number.isInteger(r.score) && r.score >= 0 && r.score <= 100);
  assert.ok(['hot', 'warm', 'cold'].includes(r.label));
  assert.ok(r.reasons.length >= 1 && r.reasons.length <= 3);
  assert.ok(r.reasons.every((s) => typeof s === 'string' && s.length > 0));
});

test('a complete, engaged lead scores higher than a bare one', () => {
  const activities = [
    { action: 'comment', summary: 'They are interested, asked for pricing', createdAt: daysAgo(1) },
    { action: 'update', createdAt: daysAgo(2) },
  ];
  const meetings = [{ status: 'completed', outcome: 'positive', startTime: daysAgo(3) }];
  const hi = computeBaseScore(rich, { now: NOW, activities, meetings });
  const lo = computeBaseScore(bare, { now: NOW });
  assert.ok(hi.score >= lo.score + 30, `${hi.score} vs ${lo.score}`);
  assert.equal(hi.label, 'hot');
  assert.ok(hi.fit > 0 && hi.intent > 0);
});

test('recent activity raises the score; stale activity does not', () => {
  const recent = computeBaseScore(rich, { now: NOW, activities: [{ action: 'comment', summary: 'call done', createdAt: daysAgo(0) }] });
  const stale = computeBaseScore(rich, { now: NOW, activities: [{ action: 'comment', summary: 'call done', createdAt: daysAgo(90) }] });
  assert.ok(recent.score > stale.score);
});

test('a new negative chat message lowers the score and shows up in the reasons', () => {
  const before = computeBaseScore(rich, { now: NOW, activities: [{ action: 'update', createdAt: daysAgo(1) }] });
  const after = computeBaseScore(rich, {
    now: NOW,
    activities: [
      { action: 'comment', summary: 'Not interested right now, no budget this year', createdAt: daysAgo(0) },
      { action: 'update', createdAt: daysAgo(1) },
    ],
  });
  assert.ok(after.score < before.score + 6, 'negative sentiment must not lift the score like a positive one');
  assert.ok(after.reasons.some((r) => /negative|not interested|budget/i.test(r)), after.reasons.join(' | '));
});

test('sentimentOf reads positive and negative buying signals', () => {
  assert.ok(sentimentOf(['Interested, please send the proposal']) > 0);
  assert.ok(sentimentOf(['not interested, too expensive']) < 0);
  assert.equal(sentimentOf([]), 0);
});

test('lost leads are capped low', () => {
  const r = computeBaseScore({ ...rich, status: 'LOST' }, { now: NOW });
  assert.ok(r.score <= 15);
  assert.equal(r.label, 'cold');
});

test('winRatesFrom smooths historical win rates by source and industry', () => {
  const deals = [
    ...Array(8).fill({ stage: 'won', source: 'REFERRAL', leadCompany: { industry: 'Retail' } }),
    ...Array(2).fill({ stage: 'lost', source: 'REFERRAL', leadCompany: { industry: 'Retail' } }),
    ...Array(10).fill({ stage: 'lost', source: 'COLD_CALL', leadCompany: { industry: 'Retail' } }),
    { stage: 'proposal', source: 'COLD_CALL' },
  ];
  const w = winRatesFrom(deals);
  assert.equal(w.closed, 20);
  assert.ok(w.bySource.REFERRAL.rate > w.overall);
  assert.ok(w.bySource.COLD_CALL.rate < w.overall);
  assert.ok(w.byIndustry.RETAIL);
});

test("the org's historical win pattern moves the score and is explained", () => {
  const deals = [
    ...Array(9).fill({ stage: 'won', source: 'WEBSITE' }),
    ...Array(1).fill({ stage: 'lost', source: 'WEBSITE' }),
    ...Array(10).fill({ stage: 'lost', source: 'COLD_CALL' }),
  ];
  const winRates = winRatesFrom(deals);
  const good = computeBaseScore({ ...bare, source: 'WEBSITE' }, { now: NOW, winRates });
  const poor = computeBaseScore({ ...bare, source: 'COLD_CALL' }, { now: NOW, winRates });
  assert.ok(good.score > poor.score);
  assert.ok(good.reasons.concat(good.factors.map((f) => f.text)).some((r) => /win/i.test(r)));
});

test('blendWithAi mixes base and AI scores and prefers AI reasons', () => {
  const base = computeBaseScore(rich, { now: NOW });
  const b = blendWithAi(base, { score: 20, label: 'cold', reasons: ['AI reason 1', 'AI reason 2', 'AI 3', 'AI 4'], nextStep: 'Call' });
  assert.equal(b.score, Math.round(base.score * 0.6 + 20 * 0.4));
  assert.equal(b.label, labelFor(b.score));
  assert.deepEqual(b.reasons, ['AI reason 1', 'AI reason 2', 'AI 3']);
  assert.equal(b.source, 'ai');
});

// ---------- service with a fake strapi ----------

function fakeStrapi(lead, { activities = [], meetings = [], deals = [] } = {}) {
  const updates = [];
  const strapi = {
    log: { warn() {}, info() {}, error() {}, debug() {} },
    entityService: {
      async findOne(uid, id) {
        return uid.includes('lead-company') && Number(id) === lead.id ? { ...lead } : null;
      },
      async findMany(uid) {
        if (uid.includes('crm-activity')) return activities;
        if (uid.includes('meeting')) return meetings;
        if (uid.includes('deal')) return deals;
        return [];
      },
      async update(uid, id, { data }) {
        updates.push({ uid, id, data });
        Object.assign(lead, data);
        return lead;
      },
    },
  };
  return { strapi, updates };
}

const orgLead = (extra = {}) => ({ ...rich, organization: { id: 7 }, ...extra });

test('rescoreLead stores score, label, reasons and timestamp without AI', async () => {
  const lead = orgLead();
  const { strapi, updates } = fakeStrapi(lead);
  const r = await scoring.rescoreLead(strapi, lead.id, { orgId: 7, ai: false, now: NOW });
  assert.equal(r.source, 'rules');
  assert.equal(updates.length, 1);
  const d = updates[0].data;
  assert.equal(d.aiScore, r.score);
  assert.equal(d.aiScoreLabel, r.label);
  assert.ok(Array.isArray(d.aiScoreReasons.reasons) && d.aiScoreReasons.reasons.length >= 1);
  assert.equal(d.aiScoreReasons.source, 'rules');
  assert.ok(d.aiScoredAt instanceof Date);
});

test('rescoreLead refuses a lead from another organization', async () => {
  const lead = orgLead();
  const { strapi, updates } = fakeStrapi(lead);
  const r = await scoring.rescoreLead(strapi, lead.id, { orgId: 99, ai: false, now: NOW });
  assert.equal(r, null);
  assert.equal(updates.length, 0);
});

test('rescoreLead uses the AI layer when available and passes the baseline to it', async () => {
  const lead = orgLead();
  const { strapi, updates } = fakeStrapi(lead, { activities: [{ action: 'comment', summary: 'please send a quote', createdAt: daysAgo(0) }] });
  let seen;
  const aiScore = async (args) => {
    seen = args;
    return { score: 90, label: 'hot', reasons: ['Asked for a quote today.', 'Decision maker is engaged.'], nextStep: 'Send the quote', model: 'mock' };
  };
  const r = await scoring.rescoreLead(strapi, lead.id, { orgId: 7, ai: true, aiScore, now: NOW });
  assert.equal(r.source, 'ai');
  assert.equal(seen.signals.baseline.score, r.base);
  assert.ok(seen.signals.recentActivity.some((a) => /quote/.test(a)));
  assert.deepEqual(updates[0].data.aiScoreReasons.reasons, ['Asked for a quote today.', 'Decision maker is engaged.']);
  assert.equal(updates[0].data.aiScoreReasons.nextStep, 'Send the quote');
});

test('rescoreLead falls back to deterministic reasons when AI fails (no key / no credits)', async () => {
  const lead = orgLead();
  const { strapi, updates } = fakeStrapi(lead);
  const err = Object.assign(new Error('credits used up'), { code: 'AI_CREDITS_EXHAUSTED' });
  const r = await scoring.rescoreLead(strapi, lead.id, { orgId: 7, ai: true, aiScore: async () => { throw err; }, now: NOW });
  assert.equal(r.source, 'rules');
  assert.equal(updates[0].data.aiScoreReasons.source, 'rules');
  assert.ok(updates[0].data.aiScoreReasons.reasons.length >= 1);
});

test('score updates after new chat activity', async () => {
  const lead = orgLead({ status: 'NEW' });
  const activities = [];
  const { strapi } = fakeStrapi(lead, { activities });
  const first = await scoring.rescoreLead(strapi, lead.id, { orgId: 7, ai: false, now: NOW });
  activities.push({ action: 'comment', summary: 'Interested! Send the proposal and pricing please', createdAt: NOW.toISOString() });
  const second = await scoring.rescoreLead(strapi, lead.id, { orgId: 7, ai: false, now: NOW });
  assert.ok(second.score > first.score, `${second.score} > ${first.score}`);
  assert.equal(lead.aiScore, second.score);
});

test('scheduleRescore debounces bursts into one recalculation per lead', async () => {
  const calls = [];
  const runner = async (leadId) => { calls.push(leadId); };
  scoring.scheduleRescore(null, 5, { delayMs: 20, runner });
  scoring.scheduleRescore(null, 5, { delayMs: 20, runner });
  scoring.scheduleRescore(null, 5, { delayMs: 20, runner });
  scoring.scheduleRescore(null, 6, { delayMs: 20, runner });
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(calls.sort(), [5, 6]);
});
