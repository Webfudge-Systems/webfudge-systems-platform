'use strict';

/**
 * Vertical packs (G22): pack data + the idempotent apply service, against an in-memory entityService.
 *   npm run test:vertical-packs   (from apps/backend)
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listPacks, getPack } = require('../src/utils/vertical-packs');
const { applyVerticalPack } = require('../src/utils/vertical-pack-apply');

const PIPELINE = 'api::crm-pipeline.crm-pipeline';
const FIELD = 'api::crm-custom-field.crm-custom-field';
const VIEW = 'api::saved-view.saved-view';
const SETTING = 'api::crm-org-setting.crm-org-setting';

/** Minimal entityService: filters on plain equality (relations stored as ids), records every delete. */
function fakeStrapi() {
  const tables = {};
  const deletes = [];
  let nextId = 1;
  const rows = (uid) => (tables[uid] ||= []);
  const matches = (row, filters = {}) =>
    Object.entries(filters).every(([k, v]) => (v && typeof v === 'object' ? true : row[k] === v));
  const entityService = {
    async findMany(uid, { filters } = {}) {
      return rows(uid).filter((r) => matches(r, filters)).map((r) => ({ ...r }));
    },
    async findOne(uid, id) {
      return rows(uid).find((r) => r.id === id) || null;
    },
    async count(uid, { filters } = {}) {
      return rows(uid).filter((r) => matches(r, filters)).length;
    },
    async create(uid, { data }) {
      const row = { id: nextId++, ...data };
      rows(uid).push(row);
      return { ...row };
    },
    async update(uid, id, { data }) {
      const row = rows(uid).find((r) => r.id === id);
      Object.assign(row, data);
      return { ...row };
    },
    async delete(uid, id) {
      deletes.push([uid, id]);
    },
  };
  return { entityService, tables, deletes, rows };
}

const ORG = 7;
const USER = 3;

test('every pack is valid data with a deal pipeline and fields', () => {
  const keys = listPacks().map((p) => p.key);
  assert.deepEqual(keys.sort(), ['clinics', 'education', 'ev', 'jewellery', 'real_estate']);
  for (const key of keys) {
    const pack = getPack(key);
    assert.ok(pack.label && pack.description, key);
    assert.ok(pack.pipelines.length >= 1, key);
    assert.ok(pack.customFields.length >= 3, key);
    assert.ok(Array.isArray(pack.cadences) && pack.cadences.length >= 1, key);
    assert.ok(Array.isArray(pack.whatsappTemplates) && pack.whatsappTemplates.length >= 1, key);
  }
  assert.equal(getPack('nope'), null);
});

test('a new org picking real estate gets a default pipeline with a site-visit stage and fields', async () => {
  const s = fakeStrapi();
  const res = await applyVerticalPack(s, { orgId: ORG, userId: USER, packKey: 'real_estate' });
  const pipelines = s.rows(PIPELINE).filter((p) => p.entity === 'deal');
  assert.equal(pipelines.length, 1);
  assert.equal(pipelines[0].isDefault, true);
  assert.ok(pipelines[0].stages.some((st) => /site.?visit/i.test(st.label)));
  const fields = s.rows(FIELD);
  assert.ok(fields.length >= 3);
  assert.ok(fields.every((f) => f.organization === ORG));
  assert.ok(res.created.customFields.length === fields.length);
  const leadList = s.rows(PIPELINE).find((p) => p.entity === 'lead');
  assert.ok(leadList.stages.some((st) => st.key === 'SITE_VISIT_SCHEDULED'));
  for (const k of ['NEW', 'QUALIFIED', 'LOST', 'CONVERTED']) assert.ok(leadList.stages.some((st) => st.key === k));
  assert.ok(s.rows(VIEW).length >= 1);
  assert.ok(s.rows(VIEW).every((v) => v.shared === true && v.user === USER));
  assert.deepEqual(res.pending.map((p) => p.type).sort(), ['cadences', 'whatsappTemplates']);
  assert.ok(res.pending.every((p) => /available when/i.test(p.note)));
  const setting = s.rows(SETTING).find((r) => r.key === 'verticalPack');
  assert.equal(setting.value.key, 'real_estate');
});

test('re-applying is idempotent: nothing is duplicated', async () => {
  const s = fakeStrapi();
  await applyVerticalPack(s, { orgId: ORG, userId: USER, packKey: 'real_estate' });
  const before = JSON.stringify([s.rows(PIPELINE), s.rows(FIELD), s.rows(VIEW)]);
  const again = await applyVerticalPack(s, { orgId: ORG, userId: USER, packKey: 'real_estate' });
  assert.equal(JSON.stringify([s.rows(PIPELINE), s.rows(FIELD), s.rows(VIEW)]), before);
  assert.equal(again.created.pipelines.length, 0);
  assert.equal(again.created.customFields.length, 0);
  assert.equal(again.created.leadStatuses.length, 0);
  assert.equal(again.created.views.length, 0);
  assert.equal(s.rows(SETTING).filter((r) => r.key === 'verticalPack').length, 1);
});

test('existing org data is kept: no deletes, existing pipeline stays default, edited statuses survive', async () => {
  const s = fakeStrapi();
  await s.entityService.create(PIPELINE, {
    data: { name: 'Sales', entity: 'deal', isDefault: true, sortOrder: 0, organization: ORG, stages: [{ key: 'a', label: 'A', kind: 'open' }] },
  });
  await s.entityService.create(PIPELINE, {
    data: {
      name: 'Lead statuses',
      entity: 'lead',
      isDefault: true,
      organization: ORG,
      stages: [
        { key: 'NEW', label: 'Fresh', color: 'blue', kind: 'open' },
        { key: 'QUALIFIED', label: 'Qualified', color: 'emerald', kind: 'won' },
        { key: 'LOST', label: 'Lost', color: 'red', kind: 'lost' },
        { key: 'CONVERTED', label: 'Converted', color: 'teal', kind: 'won' },
      ],
    },
  });
  await s.entityService.create(FIELD, {
    data: { label: 'Budget', key: 'budget', entity: 'lead', type: 'text', organization: ORG },
  });
  const res = await applyVerticalPack(s, { orgId: ORG, userId: USER, packKey: 'real_estate' });
  assert.equal(s.deletes.length, 0);
  const deals = s.rows(PIPELINE).filter((p) => p.entity === 'deal');
  assert.equal(deals.length, 2);
  assert.equal(deals.find((p) => p.name === 'Sales').isDefault, true);
  assert.equal(deals.find((p) => p.name !== 'Sales').isDefault, false);
  const lead = s.rows(PIPELINE).find((p) => p.entity === 'lead');
  assert.equal(lead.stages[0].label, 'Fresh');
  assert.equal(s.rows(FIELD).filter((f) => f.key === 'budget').length, 1);
  assert.equal(s.rows(FIELD).find((f) => f.key === 'budget').type, 'text');
  assert.ok(res.skipped.customFields.includes('budget'));
});

test('dry run previews without writing', async () => {
  const s = fakeStrapi();
  const res = await applyVerticalPack(s, { orgId: ORG, userId: USER, packKey: 'ev', dryRun: true });
  assert.equal(Object.values(s.tables).flat().length, 0);
  assert.ok(res.created.pipelines.length === 1);
  assert.ok(res.created.customFields.length >= 3);
});

test('packs never leak across orgs', async () => {
  const s = fakeStrapi();
  await applyVerticalPack(s, { orgId: 1, userId: USER, packKey: 'clinics' });
  const res = await applyVerticalPack(s, { orgId: 2, userId: USER, packKey: 'clinics' });
  assert.ok(res.created.pipelines.length === 1);
  assert.ok(res.created.customFields.length >= 3);
});

test('unknown pack throws a clear error', async () => {
  await assert.rejects(() => applyVerticalPack(fakeStrapi(), { orgId: ORG, packKey: 'x' }), /Unknown vertical pack/);
});
