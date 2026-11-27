'use strict';

/**
 * G19 deal health, call list and forecast against a real Strapi on a throwaway SQLite database with
 * a mocked model provider (no API key).   npm run test:deal-health   (from apps/backend)
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-deal-health-${process.pid}-${Date.now()}.db`;
const DB_PATH = path.join(__dirname, '..', '..', DB_REL);
const rand = () => crypto.randomBytes(16).toString('base64');
Object.assign(process.env, {
  NODE_ENV: 'test',
  PLATFORM_MODE: 'saas',
  DATABASE_CLIENT: 'sqlite',
  DATABASE_FILENAME: DB_REL,
  JWT_SECRET: rand(),
  ADMIN_JWT_SECRET: rand(),
  API_TOKEN_SALT: rand(),
  TRANSFER_TOKEN_SALT: rand(),
  ENCRYPTION_KEY: rand(),
  APP_KEYS: [rand(), rand()].join(','),
  CACHE_API_ENABLED: 'false',
  AI_ENABLED: 'true',
  AI_PROVIDER: 'mock',
  DEAL_CALL_LIST_CRON: 'off',
  WEEKLY_STATUS_CRON: 'off',
});
for (const k of ['RESEND_API_KEY', 'REDIS_URL', 'ANTHROPIC_API_KEY', 'AI_EMBEDDINGS_PROVIDER', 'AI_CREDIT_USD', 'AI_MIN_CREDITS_PER_CALL']) delete process.env[k];

let app;
let base;
let provider;
const ids = {};
const realLog = console.log;
console.log = (...args) => {
  if (process.env.TEST_VERBOSE) realLog(...args);
};
const DAY = 864e5;
const ago = (days) => new Date(Date.now() - days * DAY).toISOString();
const dateIn = (days) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

async function api(method, url, { token, body, org } = {}) {
  const res = await fetch(`${base}/api${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(org ? { 'X-Organization-Id': String(org) } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, body: json };
}

const create = (uid, data) => app.entityService.create(uid, { data });
const as = (key) => ({ token: ids[`jwt${key}`], org: ids[`org${key[0]}`] });
/** Sets created_at directly (Strapi stamps it on create). */
const backdate = (uid, id, iso) => app.db.connection(app.db.metadata.get(uid).tableName).where({ id }).update({ created_at: new Date(iso) });

async function deal(data, createdDaysAgo) {
  const d = await create('api::deal.deal', { organization: ids.orgA, ...data });
  await backdate('api::deal.deal', d.id, ago(createdDaysAgo));
  return d.id;
}
async function activity(dealId, data, daysAgo) {
  const a = await create('api::crm-activity.crm-activity', { organization: ids.orgA, subjectType: 'deal', subjectId: dealId, action: 'update', summary: 'Updated deal', ...data });
  await backdate('api::crm-activity.crm-activity', a.id, ago(daysAgo));
}
const stageChange = (before, after) => ({ meta: { changedFields: ['stage'], changes: [{ key: 'stage', before, after }] } });

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  app = await createStrapi(await compileStrapi()).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  const { createMockProvider } = require('@webfudge/ai');
  const { mockRespond } = require('../../src/utils/ai/mock-responder');
  provider = createMockProvider({ respond: mockRespond });
  require('../../src/utils/ai').setProvider(provider);

  const { addMember } = require('../../src/utils/saas-org');
  const [crmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'crm' }, limit: 1 });
  assert.ok(crmApp, 'SaaS catalog seeded the crm app');
  const plans = { A: 'professional', B: 'standard' }; // Grow Business (forecast) vs Pro (call list only)
  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Sales ${key}`, slug: `dh-org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', {
      organization: org.id,
      app: crmApp.id,
      status: 'active',
      planCode: plans[key],
      startDate: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * DAY),
      totalUsers: 5,
    });
  }
  const user = async (key, orgKey, role, customPermissions) => {
    const u = await app.plugin('users-permissions').service('user').add({
      username: `dh${key}${Date.now()}`,
      email: `dh-${key.toLowerCase()}@sales.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
      firstName: `Rep${key}`,
    });
    const m = await addMember(app, { orgId: ids[`org${orgKey}`], userId: u.id, role });
    if (customPermissions) await app.entityService.update('api::organization-user.organization-user', m.id, { data: { customPermissions } });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  };
  await user('A', 'A', 'Admin');
  await user('Am', 'A', 'Member', { crm: { modules: { deals: { access: 'read' } } } });
  await user('B', 'B', 'Admin');

  // History: 3 won + 1 lost, all passed through proposal (proposal win rate 75%), 10 days in proposal each.
  for (const [i, stage] of ['won', 'won', 'won', 'lost'].entries()) {
    const id = await deal({ name: `Closed ${i}`, value: 10000, stage, assignedTo: ids.userA, closedAt: ago(40 + i) }, 80);
    await activity(id, stageChange('discovery', 'proposal'), 60);
    await activity(id, stageChange('proposal', stage), 50);
  }
  // Rep Am: one deal silent for 20 days with a competitor in the notes, one healthy closing in 3 days.
  ids.silent = await deal({ name: 'Acme silent', value: 50000, stage: 'proposal', assignedTo: ids.userAm, expectedCloseDate: dateIn(10) }, 30);
  await activity(ids.silent, stageChange('discovery', 'proposal'), 25);
  await activity(ids.silent, { action: 'comment', summary: 'Call went ok but they are also looking at Zoho, price is a concern' }, 20);
  ids.soon = await deal({ name: 'Beta closing', value: 8000, stage: 'negotiation', assignedTo: ids.userAm, expectedCloseDate: dateIn(3) }, 5);
  await activity(ids.soon, { action: 'comment', summary: 'Ready to sign, waiting on PO' }, 1);
  ids.far = await deal({ name: 'Gamma healthy', value: 1000, stage: 'discovery', assignedTo: ids.userAm, expectedCloseDate: dateIn(80) }, 2);
  // Rep A (admin) owns one deal with an overdue task.
  ids.adminDeal = await deal({ name: 'Delta overdue', value: 20000, stage: 'negotiation', assignedTo: ids.userA, expectedCloseDate: dateIn(20) }, 3);
  await create('api::task.task', { organization: ids.orgA, name: 'Send revised quote', status: 'SCHEDULED', scheduledDate: ago(2), deal: ids.adminDeal, priority: 'medium' });
  ids.bDeal = (await create('api::deal.deal', { organization: ids.orgB, name: 'B deal', value: 100, stage: 'proposal', assignedTo: ids.userB })).id;
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try {
      fs.unlinkSync(DB_PATH + suffix);
    } catch {
      /* not created */
    }
  }
});

test('morning run builds each rep a prioritised list with reasons, reads notes with AI and notifies', async () => {
  const { runDailyCallLists } = require('../../src/utils/deal-health-loader');
  const before = provider.calls.length;
  const out = await runDailyCallLists(app);
  assert.ok(out.orgs >= 2, JSON.stringify(out)); // A (Business) and B (Pro) both have crm.deal_health
  assert.ok(provider.calls.length > before, 'AI read the notes');

  const res = await api('GET', '/deal-health/call-list', as('Am'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const items = res.body.data.items;
  assert.deepEqual(items.map((i) => i.dealId), [ids.silent, ids.soon], 'silent big deal first, healthy far deal left out');
  const top = items[0];
  assert.equal(top.level, 'high');
  const codes = top.reasons.map((r) => r.code);
  assert.ok(codes.includes('silent'), JSON.stringify(top.reasons));
  assert.ok(codes.includes('competitor'), 'competitor found in notes by AI');
  assert.match(top.reasons.find((r) => r.code === 'competitor').text, /Zoho/);
  assert.match(top.whatToSay, /Zoho/);
  assert.equal(items[1].reasons[0].code, 'closing_soon');
  assert.equal(res.body.data.aiUsed, true);

  const notes = await app.entityService.findMany('api::notification.notification', { filters: { user: ids.userAm }, limit: 10 });
  assert.ok(notes.some((n) => /call list/i.test(n.title)), 'rep notified');
});

test('a member cannot open another rep\'s list; a manager can', async () => {
  const denied = await api('GET', `/deal-health/call-list?userId=${ids.userA}`, as('Am'));
  assert.equal(denied.status, 403);
  const ok = await api('GET', `/deal-health/call-list?userId=${ids.userAm}`, as('A'));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.items[0].dealId, ids.silent);
});

test('deal health: overdue task and org-average stage time feed the reasons', async () => {
  const res = await api('GET', `/deal-health/deals/${ids.adminDeal}`, as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.data.reasons.some((r) => r.code === 'overdue_tasks'));
  assert.equal(res.body.data.overdueTasks, 1);
  const silent = await api('GET', `/deal-health/deals/${ids.silent}`, as('A'));
  assert.equal(silent.body.data.level, 'high');
  assert.ok(silent.body.data.health < 60);
  const other = await api('GET', `/deal-health/deals/${ids.bDeal}`, as('A'));
  assert.equal(other.status, 404, 'other org deal is not visible');
});

test('with AI off, refresh still gives reasons and a deterministic talking point', async () => {
  process.env.AI_ENABLED = 'false';
  try {
    const before = provider.calls.length;
    const res = await api('POST', '/deal-health/call-list/refresh', as('A'));
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(provider.calls.length, before, 'no AI call');
    const item = res.body.data.items.find((i) => i.dealId === ids.adminDeal);
    assert.ok(item);
    assert.ok(item.whatToSay.length > 10);
    const analyse = await api('POST', `/deal-health/deals/${ids.adminDeal}/analyse`, as('A'));
    assert.equal(analyse.status, 403);
  } finally {
    process.env.AI_ENABLED = 'true';
  }
});

test('forecast: weighted by historical stage win rates with an 80% range; manager sees org, member sees own', async () => {
  const res = await api('GET', '/deal-health/forecast', as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const fc = res.body.data;
  assert.equal(fc.scope, 'org');
  assert.equal(fc.months.length, 3);
  assert.equal(fc.rates.proposal.source, 'history');
  assert.equal(fc.rates.proposal.rate, 0.75);
  for (const m of fc.months) assert.ok(m.low <= m.expected && m.expected <= m.high, JSON.stringify(m));
  const total = fc.months.reduce((a, m) => a + m.dealCount, 0);
  assert.equal(total, 3, 'dated open deals in the next three months (Gamma closes in month four)');

  const mine = await api('GET', '/deal-health/forecast', as('Am'));
  assert.equal(mine.status, 200);
  assert.equal(mine.body.data.scope, 'mine');
  assert.equal(mine.body.data.months.reduce((a, m) => a + m.dealCount, 0), 2);
});

test('forecast explanation uses AI and credits; Pro plan has the call list but not the forecast', async () => {
  const res = await api('POST', '/deal-health/forecast/explain', { ...as('A'), body: {} });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.data.headline);
  assert.ok(res.body.data.creditsUsed > 0);

  const b = await api('GET', '/deal-health/forecast', as('B'));
  assert.ok([402, 403].includes(b.status), String(b.status));
  const bList = await api('GET', '/deal-health/call-list', as('B'));
  assert.equal(bList.status, 200);
});
