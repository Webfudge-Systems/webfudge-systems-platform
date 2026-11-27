'use strict';

/** G10 AI auto-capture: pure helpers (no Strapi). */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const cap = require('../../src/utils/ai/auto-capture');
const { listSources } = require('../../src/utils/ai/capture-sources');
const { mockCapture } = require('../../src/utils/ai/mock-capture');

const TODAY = '2026-11-27';
const out = (o = {}) => ({
  budget: { amount: null, currency: null, evidence: null },
  timeline: { text: null, date: null, evidence: null },
  requirement: { text: null, evidence: null },
  nextStep: { title: null, dueDate: null, evidence: null },
  stage: { value: null, evidence: null },
  ...o,
});

test('normalizeCapture keeps stated facts and drops empty or invalid ones', () => {
  const f = cap.normalizeCapture(
    out({
      budget: { amount: 500000, currency: 'inr', evidence: 'Budget 5 lakh hai' },
      timeline: { text: 'March tak', date: '2020-01-01', evidence: 'March tak start' },
      nextStep: { title: '', dueDate: null, evidence: null },
      stage: { value: 'won', evidence: 'x' },
    }),
    { today: TODAY, stages: ['discovery', 'proposal'], current: { stage: 'discovery' } }
  );
  assert.deepEqual(f.budget, { amount: 500000, currency: 'INR', evidence: 'Budget 5 lakh hai' });
  assert.equal(f.timeline.text, 'March tak');
  assert.equal(f.timeline.date, null, 'past dates are dropped');
  assert.equal(f.nextStep, undefined);
  assert.equal(f.stage, undefined, 'stage outside the allowed list is dropped');
  assert.equal(f.requirement, undefined);
});

test('normalizeCapture drops non-positive budgets and the current stage', () => {
  const f = cap.normalizeCapture(out({ budget: { amount: -5, currency: null, evidence: null }, stage: { value: 'proposal', evidence: null } }), {
    today: TODAY,
    stages: ['proposal'],
    current: { stage: 'proposal' },
  });
  assert.deepEqual(f, {});
});

test('buildPatch maps fields onto a lead and a deal', () => {
  const v = { budget: { amount: 600000 }, timeline: { text: 'by March', date: '2027-03-01' }, requirement: { text: 'Website + app' }, stage: { value: 'QUALIFIED' } };
  assert.deepEqual(cap.buildPatch('lead_company', v), { dealValue: 600000, expectedTimeline: 'by March', requirementSummary: 'Website + app', status: 'QUALIFIED' });
  assert.deepEqual(cap.buildPatch('deal', { ...v, stage: { value: 'proposal' } }), { value: 600000, expectedCloseDate: '2027-03-01', requirementSummary: 'Website + app', stage: 'proposal' });
  assert.deepEqual(cap.buildPatch('deal', { timeline: { text: 'soon', date: null } }), {}, 'a deal timeline needs a date');
});

test('WhatsApp and voice notes are listed but not available yet', () => {
  const s = Object.fromEntries(listSources().map((x) => [x.key, x]));
  for (const k of ['comments', 'meetings', 'emails']) assert.equal(s[k].available, true, k);
  for (const k of ['whatsapp', 'voice_notes']) {
    assert.equal(s[k].available, false, k);
    assert.ok(s[k].reason);
  }
});

test('debounce runs once per key after the last call', async () => {
  let calls = 0;
  const d = cap.createDebouncer();
  for (let i = 0; i < 5; i++) d.schedule('org:lead:1', () => calls++, 20);
  d.schedule('org:lead:2', () => calls++, 20);
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(calls, 2);
});

test('mock responder reads Hinglish lakh budgets and next steps', () => {
  const req = {
    jsonSchema: { properties: { budget: {}, timeline: {}, nextStep: {} } },
    messages: [{ role: 'user', content: 'Allowed stages: QUALIFIED\n\n"""\n[x] (comment) Budget 5 lakh hai, March tak start karna hai. Send proposal by Friday\n"""' }],
  };
  const o = JSON.parse(mockCapture(req));
  assert.equal(o.budget.amount, 500000);
  assert.equal(o.budget.currency, 'INR');
  assert.match(o.timeline.text, /March/);
  assert.match(o.nextStep.title, /Send proposal/);
  assert.equal(mockCapture({ jsonSchema: { properties: { score: {} } } }), null);
});
