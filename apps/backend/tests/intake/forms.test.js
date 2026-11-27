'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeFields, validateSubmission, looksLikeBot, buildFormTaskDraft } = require('../../src/utils/intake/forms');

test('normalizeFields drops unknown types, dedupes keys and caps options', () => {
  const fields = normalizeFields([
    { label: 'Your request', type: 'textarea', required: true },
    { label: 'Your request', type: 'text' },
    { label: 'Hack', type: 'script' },
    { label: 'Team', type: 'select', options: ['A', 'B', '', 'A'] },
  ]);
  assert.deepEqual(fields.map((f) => [f.key, f.type]), [
    ['your_request', 'textarea'],
    ['your_request_2', 'text'],
    ['team', 'select'],
  ]);
  assert.equal(fields[0].required, true);
  assert.deepEqual(fields[2].options, ['A', 'B']);
});

test('normalizeFields falls back to a default request field when empty', () => {
  const fields = normalizeFields([]);
  assert.equal(fields.length, 1);
  assert.equal(fields[0].required, true);
});

test('validateSubmission requires name, a valid email and required fields', () => {
  const fields = normalizeFields([{ label: 'Details', type: 'textarea', required: true }]);
  const bad = validateSubmission(fields, { name: '', email: 'nope', values: {} });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.name && bad.errors.email && bad.errors.details);

  const good = validateSubmission(fields, { name: ' Ada ', email: 'ada@example.com', values: { details: 'x'.repeat(6000) } });
  assert.equal(good.ok, true);
  assert.equal(good.submitter.name, 'Ada');
  assert.equal(good.values.details.length, 5000);
});

test('validateSubmission rejects select values that are not options', () => {
  const fields = normalizeFields([{ label: 'Team', type: 'select', options: ['A'], required: true }]);
  const r = validateSubmission(fields, { name: 'A', email: 'a@b.co', values: { team: 'Z' } });
  assert.equal(r.ok, false);
  assert.ok(r.errors.team);
});

test('looksLikeBot catches the honeypot and too-fast submissions', () => {
  const now = 100000;
  assert.equal(looksLikeBot({ website: 'http://spam' , startedAt: now - 10000 }, now), true);
  assert.equal(looksLikeBot({ startedAt: now - 500 }, now), true);
  assert.equal(looksLikeBot({ startedAt: now - 5000 }, now), false);
  assert.equal(looksLikeBot({}, now), false);
});

test('buildFormTaskDraft puts submitter and answers in the description', () => {
  const fields = normalizeFields([{ label: 'Details', type: 'textarea', required: true }, { label: 'Title hint', type: 'text' }]);
  const v = validateSubmission(fields, { name: 'Ada', email: 'ada@example.com', values: { details: 'Fix the logo\nplease' } });
  const draft = buildFormTaskDraft({ name: 'Requests' }, fields, v);
  assert.equal(draft.name, 'Fix the logo');
  assert.match(draft.description, /Submitted by: Ada <ada@example.com>/);
  assert.match(draft.description, /Details:\nFix the logo\nplease/);
  assert.deepEqual(draft.tags, ['intake', 'intake:form']);
});
