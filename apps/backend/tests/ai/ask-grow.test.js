'use strict';

/**
 * G20 Ask Grow (pure parts): the model's lead filter is sanitized against a whitelist and compiled to
 * org-scoped Strapi filters; RBAC (crm.leads read) is checked before any read. No Strapi, no AI.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  sanitizeFilter,
  resolvePeriod,
  buildLeadFilters,
  executeLeadQuery,
  describeFilter,
  parseQuestion,
} = require('../../src/utils/ai/ask-grow');

const TODAY = '2026-11-27'; // a Friday

test('sanitizeFilter keeps whitelisted fields and drops unknown keys / raw operators', () => {
  const f = sanitizeFilter({
    city: '  Pune ',
    source: 'Meta',
    scoreMin: '71',
    notContacted: true,
    period: 'last_week',
    $where: '1=1',
    organization: 99,
    status: 'qualified',
    owner: 'me',
    createdFrom: 'yesterday',
    scoreMax: 900,
  });
  assert.deepEqual(f, { city: 'Pune', source: 'META_ADS', status: 'QUALIFIED', owner: 'me', period: 'last_week', scoreMin: 71, scoreMax: 100, notContacted: true });
});

test('sanitizeFilter rejects non-objects and junk values', () => {
  assert.deepEqual(sanitizeFilter(null), {});
  assert.deepEqual(sanitizeFilter(['x']), {});
  assert.deepEqual(sanitizeFilter({ period: 'forever', source: 'drop table;', notContacted: 'yes' }), {});
});

test('resolvePeriod turns last_week into Monday..Sunday of the previous week', () => {
  assert.deepEqual(resolvePeriod('last_week', TODAY), { from: '2026-11-16', to: '2026-11-22' });
  assert.deepEqual(resolvePeriod('last_7_days', TODAY), { from: '2026-11-21', to: '2026-11-27' });
  assert.deepEqual(resolvePeriod('this_month', TODAY), { from: '2026-11-01', to: '2026-11-27' });
});

const scope = (over = {}) => ({ orgId: 7, userId: 3, today: TODAY, can: { leads: true }, scoreField: 'aiScore', statuses: ['NEW', 'CONTACTED', 'QUALIFIED'], ...over });

test('buildLeadFilters always pins the org and compiles every field', () => {
  const f = sanitizeFilter({ city: 'Pune', source: 'META_ADS', period: 'last_week', scoreMin: 71, notContacted: true });
  const { filters, ignored } = buildLeadFilters(f, scope(), { contactedIds: [5, 6] });
  assert.deepEqual(ignored, []);
  assert.deepEqual(filters.$and[0], { organization: 7 });
  const flat = JSON.stringify(filters);
  assert.match(flat, /"city":\{"\$containsi":"Pune"\}/);
  assert.match(flat, /"source":\{"\$eq":"META_ADS"\}/);
  assert.match(flat, /"createdAt":\{"\$gte":"2026-11-16T00:00:00.000Z","\$lte":"2026-11-22T23:59:59.999Z"\}/);
  assert.match(flat, /"aiScore":\{"\$gte":71\}/);
  assert.match(flat, /"firstContactedAt":\{"\$null":true\}/);
  assert.match(flat, /"id":\{"\$notIn":\[5,6\]\}/);
});

test('score filters are ignored when the org has no score field (capability check)', () => {
  const { filters, ignored } = buildLeadFilters({ scoreMin: 71 }, scope({ scoreField: null }), {});
  assert.deepEqual(ignored, ['score']);
  assert.doesNotMatch(JSON.stringify(filters), /core/);
});

test('unknown pipeline status is ignored, QUALIFIED includes legacy CLIENT', () => {
  assert.deepEqual(buildLeadFilters({ status: 'WON' }, scope(), {}).ignored, ['status']);
  assert.match(JSON.stringify(buildLeadFilters({ status: 'QUALIFIED' }, scope(), {}).filters), /"\$in":\["QUALIFIED","CLIENT"\]/);
});

test('owner resolves to lead ids the owner holds', () => {
  const { filters } = buildLeadFilters({ owner: 'me' }, scope(), { ownerLeadIds: [11] });
  assert.match(JSON.stringify(filters), /"id":\{"\$in":\[11\]\}/);
  const none = buildLeadFilters({ owner: 'nobody' }, scope(), { ownerLeadIds: [] });
  assert.match(JSON.stringify(none.filters), /"id":\{"\$in":\[-1\]\}/);
});

function fakeDeps(rows = [{ id: 1, companyName: 'Acme', city: 'Pune' }]) {
  const seen = {};
  return {
    seen,
    findLeads: async (filters, limit) => {
      seen.filters = filters;
      seen.limit = limit;
      return rows;
    },
    countLeads: async () => rows.length,
    findMembers: async () => [{ id: 3, firstName: 'Asha' }, { id: 4, firstName: 'Riya', lastName: 'Shah' }],
    leadIdsForOwners: async (ids) => {
      seen.ownerIds = ids;
      return [21];
    },
    contactedLeadIds: async () => [9],
  };
}

test('executeLeadQuery refuses without crm.leads read access and never reads', async () => {
  const deps = fakeDeps();
  const out = await executeLeadQuery({ city: 'Pune' }, scope({ can: { leads: false } }), deps);
  assert.equal(out.error, 'not_allowed');
  assert.equal(deps.seen.filters, undefined);
});

test('executeLeadQuery resolves owner names to member ids and returns rows + total', async () => {
  const deps = fakeDeps();
  const out = await executeLeadQuery({ owner: 'riya', notContacted: true }, scope(), deps);
  assert.deepEqual(deps.seen.ownerIds, [4]);
  assert.equal(out.total, 1);
  assert.equal(out.rows[0].companyName, 'Acme');
  assert.match(JSON.stringify(deps.seen.filters), /"\$notIn":\[9\]/);
  assert.deepEqual(deps.seen.filters.$and[0], { organization: 7 });
});

test('describeFilter gives readable chips', () => {
  const chips = describeFilter({ city: 'Pune', source: 'META_ADS', period: 'last_week', scoreMin: 71, notContacted: true });
  assert.deepEqual(chips, ['City: Pune', 'Source: Meta Lead Ads', 'Created: last week', 'Score ≥ 71', 'Not contacted yet']);
});

test('parseQuestion (offline / mock parser) handles the ticket example', () => {
  const f = sanitizeFilter(parseQuestion('Pune leads from Meta last week with score > 70 that nobody called'));
  assert.deepEqual(f, { city: 'Pune', source: 'META_ADS', period: 'last_week', scoreMin: 71, notContacted: true });
});

test('ask templates are registered with a whitelisted filter schema', () => {
  require('../../src/utils/ai/ask-grow');
  const { getTemplate } = require('@webfudge/ai');
  const t = getTemplate('grow.ask_filter');
  assert.equal(t.schema.properties.filter.additionalProperties, false);
  assert.ok(getTemplate('grow.draft_message').schema.properties.body);
});
