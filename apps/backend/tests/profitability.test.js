'use strict';

/**
 * Project profitability (W22): margin maths, revenue attribution, plan + role gating, cost-rate
 * confidentiality and the below-target alert, against a real Strapi on a throwaway SQLite database.
 *   node --test --test-concurrency=1 tests/profitability.test.js   (from apps/backend)
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-profitability-${process.pid}-${Date.now()}.db`;
const DB_PATH = path.join(__dirname, '..', DB_REL);
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
});
delete process.env.RESEND_API_KEY;
delete process.env.REDIS_URL;

const P = require('../src/utils/profitability');

// ── Pure maths ───────────────────────────────────────────────────────────────

test('margin % and status', () => {
  assert.equal(P.marginPct(1000, 600), 40);
  assert.equal(P.marginPct(0, 600), null);
  assert.equal(P.marginStatus(null, 30), 'no_revenue');
  assert.equal(P.marginStatus(20, 30), 'below');
  assert.equal(P.marginStatus(32, 30), 'near');
  assert.equal(P.marginStatus(40, 30), 'ok');
});

test('credit notes count negative; drafts are filtered by the source query', () => {
  const { netAmount } = P.revenueSource;
  assert.equal(netAmount({ documentType: 'INVOICE', subtotal: 1000, discount: 100, total: 1062 }), 900);
  assert.equal(netAmount({ documentType: 'INVOICE', subtotal: 0, total: 500 }), 500);
  assert.equal(netAmount({ documentType: 'CREDIT_NOTE', subtotal: 200 }), -200);
});

test('revenue attribution: deal invoices go to the deal project, client invoices are shared by approved hours', () => {
  const projects = [
    { id: 1, clientAccountId: 10, sourceDealId: 100 },
    { id: 2, clientAccountId: 10, sourceDealId: null },
    { id: 3, clientAccountId: 10, sourceDealId: null },
  ];
  const invoices = [
    { id: 'a', date: '2026-11-02', amount: 5000, dealId: 100, clientAccountId: 10 },
    { id: 'b', date: '2026-11-03', amount: 3000, dealId: null, clientAccountId: 10 },
  ];
  const rows = P.attributeRevenue(invoices, projects, new Map([[2, 10], [3, 20]]));
  const sum = (pid) => rows.filter((r) => r.projectId === pid).reduce((a, r) => a + r.amount, 0);
  assert.equal(sum(1), 5000);
  assert.equal(sum(2), 1000);
  assert.equal(sum(3), 2000);
  // Nobody has logged time yet → equal split.
  const eq = P.attributeRevenue([invoices[1]], projects, new Map());
  assert.deepEqual(eq.map((r) => r.amount), [1500, 1500]);
});

test('project figures: cost from rated hours, unrated hours flagged, monthly trend', () => {
  const f = P.projectFigures({
    entries: [
      { userId: 1, date: '2026-10-05', hours: 10 },
      { userId: 2, date: '2026-11-05', hours: 5 },
      { userId: 3, date: '2026-11-06', hours: 4 },
    ],
    revenue: [{ date: '2026-11-10', amount: 4000 }],
    rates: new Map([[1, 100], [2, 200]]),
    target: 30,
    months: ['2026-10', '2026-11'],
    detail: true,
  });
  assert.equal(f.cost, 2000);
  assert.equal(f.revenue, 4000);
  assert.equal(f.marginPct, 50);
  assert.equal(f.unratedHours, 4);
  assert.equal(f.unratedMembers, 1);
  assert.deepEqual(f.trend.map((t) => [t.month, t.revenue, t.cost]), [['2026-10', 0, 1000], ['2026-11', 4000, 1000]]);
  assert.equal(f.members[0].cost, 1000);
});

// ── API against a real Strapi ────────────────────────────────────────────────

let app;
let base;
const ids = {};
const realLog = console.log;
console.log = (...args) => {
  if (process.env.TEST_VERBOSE) realLog(...args);
};

async function api(method, url, { token, body } = {}) {
  const res = await fetch(`${base}/api${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
const today = new Date().toISOString().slice(0, 10);

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  app = await createStrapi(await compileStrapi()).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  const { addMember } = require('../src/utils/saas-org');
  const [pmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'pm' }, limit: 1 });
  assert.ok(pmApp, 'SaaS catalog seeded the pm app');

  const user = async (name) =>
    (
      await app.plugin('users-permissions').service('user').add({
        username: `${name}${Date.now()}`,
        email: `${name}@team.test`,
        password: 'Passw0rd!x',
        confirmed: true,
        provider: 'local',
        firstName: name,
      })
    ).id;
  const jwt = (id) => app.plugin('users-permissions').service('jwt').issue({ id });

  // Org A: Business plan. Org B: Free plan.
  ids.orgA = (await create('api::organization.organization', { name: 'Org A', slug: `org-a-${Date.now()}` })).id;
  ids.orgB = (await create('api::organization.organization', { name: 'Org B', slug: `org-b-${Date.now()}` })).id;
  await create('api::subscription.subscription', { organization: ids.orgA, app: pmApp.id, status: 'active', planCode: 'professional', startDate: new Date() });
  await create('api::subscription.subscription', { organization: ids.orgB, app: pmApp.id, status: 'active', planCode: 'free', startDate: new Date() });

  for (const [key, org, role] of [
    ['admin', ids.orgA, 'Admin'],
    ['manager', ids.orgA, 'Manager'],
    ['member', ids.orgA, 'Member'],
    ['adminB', ids.orgB, 'Admin'],
  ]) {
    ids[key] = await user(key);
    await addMember(app, { orgId: org, userId: ids[key], role });
    ids[`jwt_${key}`] = jwt(ids[key]);
  }

  ids.client = (await create('api::client-account.client-account', { companyName: 'Acme', organization: ids.orgA })).id;
  ids.deal = (await create('api::deal.deal', { name: 'Acme website', organization: ids.orgA, clientAccount: ids.client })).id;
  ids.pDeal = (await create('api::project.project', { name: 'Acme website', organization: ids.orgA, clientAccount: ids.client, sourceDeal: ids.deal, projectManager: ids.manager, status: 'IN_PROGRESS' })).id;
  ids.pRetainer = (await create('api::project.project', { name: 'Acme retainer', organization: ids.orgA, clientAccount: ids.client, projectManager: ids.manager, status: 'IN_PROGRESS' })).id;

  // Approved week for admin (10 h on website) and manager (5 h on website, 4 h retainer); a draft week is ignored.
  const sheet = async (u, status) => (await create('api::timesheet.timesheet', { organization: ids.orgA, user: u, weekStart: today, status })).id;
  const sAdmin = await sheet(ids.admin, 'approved');
  const sMgr = await sheet(ids.manager, 'approved');
  const sDraft = await sheet(ids.member, 'draft');
  const entry = (u, s, p, hours) => create('api::timesheet.time-entry', { organization: ids.orgA, user: u, timesheet: s, project: p, date: today, hours });
  await entry(ids.admin, sAdmin, ids.pDeal, 10);
  await entry(ids.manager, sMgr, ids.pDeal, 5);
  await entry(ids.manager, sMgr, ids.pRetainer, 4);
  await entry(ids.member, sDraft, ids.pDeal, 100);

  const inv = (data) => create('api::invoice.invoice', { organization: ids.orgA, invoiceNumber: `INV-${Math.random()}`, invoiceDate: today, documentType: 'INVOICE', status: 'SENT', ...data });
  await inv({ deal: ids.deal, clientAccount: ids.client, subtotal: 10000, total: 11800 });
  await inv({ clientAccount: ids.client, subtotal: 2000, total: 2360 }); // client-level → retainer (only project without a deal)
  await inv({ deal: ids.deal, clientAccount: ids.client, subtotal: 99999, status: 'DRAFT' }); // ignored
  await inv({ deal: ids.deal, clientAccount: ids.client, subtotal: 1000, documentType: 'CREDIT_NOTE' }); // −1000
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
});

test('Free plan gets 402 PLAN_FEATURE_REQUIRED', async () => {
  const res = await api('GET', '/profitability/summary', { token: ids.jwt_adminB });
  assert.equal(res.status, 402);
  assert.equal(res.body.error.details.code, 'PLAN_FEATURE_REQUIRED');
  assert.equal(res.body.error.details.feature, 'pm.profitability');
});

test('members cannot see profitability or cost rates', async () => {
  assert.equal((await api('GET', '/profitability/summary', { token: ids.jwt_member })).status, 403);
  assert.equal((await api('GET', `/profitability/projects/${ids.pDeal}`, { token: ids.jwt_member })).status, 403);
  assert.equal((await api('GET', '/profitability/settings', { token: ids.jwt_member })).status, 403);
});

test('only admins can read or set cost rates', async () => {
  assert.equal((await api('GET', '/profitability/settings', { token: ids.jwt_manager })).status, 403);
  assert.equal((await api('PUT', `/profitability/cost-rates/${ids.admin}`, { token: ids.jwt_manager, body: { hourlyCost: 1 } })).status, 403);
  assert.equal((await api('PUT', `/profitability/cost-rates/${ids.adminB}`, { token: ids.jwt_admin, body: { hourlyCost: 1 } })).status, 404, 'member of another org');
  assert.equal((await api('PUT', `/profitability/cost-rates/${ids.admin}`, { token: ids.jwt_admin, body: { hourlyCost: -5 } })).status, 400);
  assert.equal((await api('PUT', `/profitability/cost-rates/${ids.admin}`, { token: ids.jwt_admin, body: { hourlyCost: 500 } })).status, 200);
  assert.equal((await api('PUT', `/profitability/cost-rates/${ids.manager}`, { token: ids.jwt_admin, body: { hourlyCost: 800 } })).status, 200);
  const s = await api('GET', '/profitability/settings', { token: ids.jwt_admin });
  assert.equal(s.status, 200);
  const rate = (u) => s.body.data.members.find((m) => m.userId === u)?.hourlyCost;
  assert.equal(rate(ids.admin), 500);
  assert.equal(rate(ids.manager), 800);
  assert.equal(rate(ids.member), null);
  assert.equal(s.body.data.orgTarget, P.DEFAULT_TARGET);
});

test('project figures: approved hours × rate vs invoices; managers get no per-member breakdown', async () => {
  // website: revenue 10000 − 1000 credit = 9000; cost 10×500 + 5×800 = 9000 → 0%
  const mgr = await api('GET', `/profitability/projects/${ids.pDeal}`, { token: ids.jwt_manager });
  assert.equal(mgr.status, 200, JSON.stringify(mgr.body));
  const d = mgr.body.data;
  assert.equal(d.revenue, 9000);
  assert.equal(d.cost, 9000);
  assert.equal(d.marginPct, 0);
  assert.equal(d.approvedHours, 15);
  assert.equal(d.status, 'below');
  assert.equal(d.members, undefined);
  assert.equal(d.canManageRates, false);
  assert.ok(!JSON.stringify(d).includes('hourlyCost'), 'no cost rates in a manager response');

  const adm = await api('GET', `/profitability/projects/${ids.pDeal}`, { token: ids.jwt_admin });
  assert.equal(adm.body.data.members.length, 2);
  assert.equal(adm.body.data.trend.at(-1).revenue, 9000);

  // retainer: 2000 client-level revenue, 4 h × 800 = 3200 cost → −60%
  const sum = await api('GET', '/profitability/summary', { token: ids.jwt_manager });
  assert.equal(sum.status, 200);
  const r = sum.body.data.projects.find((p) => p.id === ids.pRetainer);
  assert.equal(r.revenue, 2000);
  assert.equal(r.cost, 3200);
  assert.equal(r.marginPct, -60);
  assert.equal(sum.body.data.totals.revenue, 11000);
  assert.equal(sum.body.data.totals.belowTarget, 2);
});

test('targets: project target overrides the org default', async () => {
  assert.equal((await api('PUT', '/profitability/settings/target', { token: ids.jwt_manager, body: { targetMarginPct: 10 } })).status, 403);
  assert.equal((await api('PUT', '/profitability/settings/target', { token: ids.jwt_admin, body: { targetMarginPct: 25 } })).status, 200);
  assert.equal((await api('PUT', `/profitability/projects/${ids.pDeal}/target`, { token: ids.jwt_manager, body: { targetMarginPct: 500 } })).status, 400);
  assert.equal((await api('PUT', `/profitability/projects/${ids.pDeal}/target`, { token: ids.jwt_manager, body: { targetMarginPct: -2 } })).status, 200);
  const d = (await api('GET', `/profitability/projects/${ids.pDeal}`, { token: ids.jwt_manager })).body.data;
  assert.equal(d.targetMarginPct, -2);
  assert.equal(d.projectTarget, -2);
  assert.equal(d.orgTarget, 25);
  assert.equal(d.status, 'near');
});

test('below-target alert goes to admins and the manager PM, once per month', async () => {
  const before = await app.db.query('api::notification.notification').count({ where: { title: { $startsWith: 'Margin below target' } } });
  const sent = await P.checkMarginAlerts(app);
  assert.equal(sent, 1, 'only the retainer is below target now');
  const rows = await app.entityService.findMany('api::notification.notification', {
    filters: { title: 'Margin below target: Acme retainer' },
    populate: { user: { fields: ['id'] } },
  });
  assert.deepEqual(rows.map((n) => n.user.id).sort(), [ids.admin, ids.manager].sort());
  assert.equal(rows.length + before, rows.length, 'no earlier margin alerts');
  assert.equal(await P.checkMarginAlerts(app), 0, 'not sent twice in a month');
  // Free plan org is skipped entirely.
  assert.equal(await P.checkMarginAlerts(app, { orgId: ids.orgB }), 0);
});
