'use strict';

/** Deal health + call list + forecast engine (G19). Pure functions, no Strapi.   npm run test:deal-health */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  averageStageDays,
  dealSignals,
  buildCallList,
  stageWinRates,
  forecastMonth,
} = require('../../src/utils/deal-health');

const TODAY = '2026-11-27';
const d = (offset) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + offset * 86400000).toISOString();
const codes = (s) => s.reasons.map((r) => r.code);

test('averageStageDays: mean per stage, default when fewer than 3 samples', () => {
  const avg = averageStageDays([
    { stage: 'proposal', days: 10 },
    { stage: 'proposal', days: 20 },
    { stage: 'proposal', days: 30 },
    { stage: 'negotiation', days: 5 },
  ]);
  assert.equal(avg.proposal, 20);
  assert.equal(avg.negotiation, 14); // default, only one sample
  assert.equal(avg.discovery, 14);
});

test('healthy deal: recent activity, normal time in stage → low risk, no reasons', () => {
  const s = dealSignals(
    { id: 1, stage: 'proposal', value: 1000, lastActivityAt: d(-1), stageEnteredAt: d(-5), expectedCloseDate: d(20).slice(0, 10), overdueTasks: 0 },
    { today: TODAY, avgStageDays: { proposal: 20 } }
  );
  assert.equal(s.level, 'low');
  assert.equal(s.health, 100);
  assert.deepEqual(s.reasons, []);
});

test('gone silent: 14+ days without activity is flagged with the day count', () => {
  const s = dealSignals({ id: 1, stage: 'proposal', value: 1000, lastActivityAt: d(-16), stageEnteredAt: d(-16) }, { today: TODAY, avgStageDays: { proposal: 30 } });
  assert.ok(codes(s).includes('silent'));
  assert.match(s.reasons.find((r) => r.code === 'silent').text, /16 days/);
  assert.equal(s.daysSilent, 16);
});

test('stalled stage: time in stage over 1.5x the org average', () => {
  const s = dealSignals({ id: 1, stage: 'proposal', value: 1000, lastActivityAt: d(-1), stageEnteredAt: d(-40) }, { today: TODAY, avgStageDays: { proposal: 20 } });
  const r = s.reasons.find((x) => x.code === 'stalled');
  assert.ok(r);
  assert.match(r.text, /40 days/);
  assert.match(r.text, /20/);
});

test('competitor mention, overdue tasks and passed close date all add risk → at risk', () => {
  const s = dealSignals(
    { id: 1, stage: 'negotiation', value: 1000, lastActivityAt: d(-2), stageEnteredAt: d(-3), expectedCloseDate: d(-3).slice(0, 10), overdueTasks: 2 },
    { today: TODAY, avgStageDays: {}, mentions: { competitor: 'Zoho', sentiment: 'negative' } }
  );
  assert.deepEqual(codes(s).sort(), ['close_date_passed', 'competitor', 'overdue_tasks', 'sentiment'].sort());
  assert.match(s.reasons.find((r) => r.code === 'competitor').text, /Zoho/);
  assert.equal(s.level, 'high');
  assert.ok(s.health < 60);
});

test('closed deals have no signals', () => {
  const s = dealSignals({ id: 1, stage: 'won', value: 1000, lastActivityAt: d(-90) }, { today: TODAY });
  assert.equal(s.level, 'low');
  assert.deepEqual(s.reasons, []);
});

test('call list: at-risk and valuable deals first, healthy far-off deals left out, capped', () => {
  const ctx = { today: TODAY, avgStageDays: { proposal: 20 } };
  const deals = [
    { id: 1, name: 'Small silent', stage: 'proposal', value: 500, lastActivityAt: d(-20), stageEnteredAt: d(-20) },
    { id: 2, name: 'Big silent', stage: 'proposal', value: 50000, lastActivityAt: d(-20), stageEnteredAt: d(-20) },
    { id: 3, name: 'Healthy far', stage: 'proposal', value: 900, lastActivityAt: d(-1), stageEnteredAt: d(-2), expectedCloseDate: d(60).slice(0, 10) },
    { id: 4, name: 'Closing soon', stage: 'negotiation', value: 3000, lastActivityAt: d(-1), stageEnteredAt: d(-2), expectedCloseDate: d(3).slice(0, 10) },
  ];
  const list = buildCallList(deals, ctx, { limit: 3 });
  assert.deepEqual(list.map((i) => i.dealId), [2, 1, 4]);
  assert.ok(list[0].whatToSay.length > 10, 'deterministic talking point when AI is off');
  assert.equal(list[0].rank, 1);
  assert.ok(list[0].reasons.length >= 1);
});

test('stage win rates from history, default when too few deals reached a stage', () => {
  const closed = [
    { stage: 'won', stagesReached: ['discovery', 'proposal', 'negotiation'] },
    { stage: 'won', stagesReached: ['discovery', 'proposal'] },
    { stage: 'lost', stagesReached: ['discovery', 'proposal'] },
    { stage: 'lost', stagesReached: ['discovery'] },
  ];
  const rates = stageWinRates(closed);
  assert.equal(rates.discovery.rate, 0.5); // 2 of 4
  assert.equal(rates.discovery.source, 'history');
  assert.equal(Math.round(rates.proposal.rate * 100), 67); // 2 of 3
  assert.equal(rates.negotiation.source, 'default'); // 1 sample
  assert.equal(rates.won.rate, 1);
});

test('forecast: weighted pipeline for the month, 80% range, won so far included', () => {
  const rates = { proposal: { rate: 0.5 }, negotiation: { rate: 0.8 } };
  const fc = forecastMonth({
    month: '2026-11',
    today: TODAY,
    rates,
    openDeals: [
      { id: 1, stage: 'proposal', value: 10000, expectedCloseDate: '2026-11-30' },
      { id: 2, stage: 'negotiation', value: 5000, expectedCloseDate: '2026-11-15' }, // overdue → still this month
      { id: 3, stage: 'proposal', value: 99999, expectedCloseDate: '2026-12-10' }, // next month
    ],
    wonDeals: [{ value: 2000, closedAt: '2026-11-05T10:00:00Z' }, { value: 7000, closedAt: '2026-10-05T10:00:00Z' }],
  });
  assert.equal(fc.wonSoFar, 2000);
  assert.equal(fc.expected, 2000 + 5000 + 4000);
  assert.equal(fc.dealCount, 2);
  assert.ok(fc.low < fc.expected && fc.high > fc.expected);
  assert.ok(fc.low >= 2000, 'never below what is already won');
  assert.ok(fc.high <= 2000 + 15000, 'never above every deal closing');
  assert.equal(fc.confidence, 0.8);
});

test('forecast: deals without a close date are excluded and an empty month is zero', () => {
  const fc = forecastMonth({ month: '2026-12', today: TODAY, rates: {}, openDeals: [{ id: 1, stage: 'proposal', value: 100 }], wonDeals: [] });
  assert.equal(fc.expected, 0);
  assert.equal(fc.low, 0);
  assert.equal(fc.high, 0);
  assert.equal(fc.undatedCount, 1);
});

test('activityFacts: last activity, stage entry, stages reached, notes and stage durations from the activity log', () => {
  const { activityFacts } = require('../../src/utils/deal-health');
  const deals = [
    { id: 1, stage: 'negotiation', createdAt: d(-30) },
    { id: 2, stage: 'proposal', createdAt: d(-10) },
  ];
  const acts = [
    { subjectId: 1, action: 'update', createdAt: d(-20), meta: { changes: [{ key: 'stage', before: 'discovery', after: 'proposal' }] } },
    { subjectId: 1, action: 'comment', createdAt: d(-8), summary: 'They are also looking at Zoho' },
    { subjectId: 1, action: 'update', createdAt: d(-5), meta: { changes: [{ key: 'stage', before: 'proposal', after: 'negotiation' }] } },
  ];
  const { byDeal, durations } = activityFacts(deals, acts);
  assert.equal(byDeal[1].lastActivityAt, d(-5));
  assert.equal(byDeal[1].stageEnteredAt, d(-5));
  assert.deepEqual(byDeal[1].stagesReached, ['discovery', 'proposal', 'negotiation']);
  assert.deepEqual(byDeal[1].notes, ['They are also looking at Zoho']);
  assert.equal(byDeal[2].lastActivityAt, d(-10)); // falls back to createdAt
  assert.equal(byDeal[2].stageEnteredAt, d(-10));
  assert.deepEqual(durations, [{ stage: 'discovery', days: 10 }, { stage: 'proposal', days: 15 }]);
});
