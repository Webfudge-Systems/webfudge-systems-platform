'use strict';

/**
 * G11 lead scoring against a real Strapi on a throwaway SQLite DB with a mocked AI provider.
 * Covers: POST /lead-companies/:id/rescore (AI layer with credits, rules fallback without),
 * automatic debounced rescore after a new comment (lifecycle), list sort/filter by score, backfill.
 *   npm run test:ai   (from apps/backend)
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-leadscore-${process.pid}-${Date.now()}.db`;
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
  LEAD_SCORE_AUTO: 'on',
  LEAD_SCORE_DEBOUNCE_MS: '50',
});
for (const k of ['RESEND_API_KEY', 'REDIS_URL', 'ANTHROPIC_API_KEY', 'AI_EMBEDDINGS_PROVIDER', 'AI_CREDIT_USD', 'AI_MIN_CREDITS_PER_CALL']) delete process.env[k];

let app;
let base;
const ids = {};
const realLog = console.log;
console.log = (...args) => {
  if (process.env.TEST_VERBOSE) realLog(...args);
};

async function api(method, url, { token, org, body } = {}) {
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
const as = (key) => ({ token: ids[`jwt${key}`], org: ids[`org${key}`] });
const LEAD = 'api::lead-company.lead-company';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let provider;

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
  for (const [key, planCode] of [['A', 'standard'], ['B', 'free']]) {
    const org = await create('api::organization.organization', { name: `LS ${key}`, slug: `ls-org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', { organization: org.id, app: crmApp.id, status: 'active', planCode, startDate: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5), totalUsers: 5 });
    const u = await app.plugin('users-permissions').service('user').add({ username: `ls${key}${Date.now()}`, email: `ls-${key.toLowerCase()}@team.test`, password: 'Passw0rd!x', confirmed: true, provider: 'local' });
    await addMember(app, { orgId: org.id, userId: u.id, role: 'Admin' });
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  }
  const lead = async (org, data) => (await create(LEAD, { organization: org, status: 'NEW', ...data })).id;
  ids.leadA = await lead(ids.orgA, { companyName: 'Acme Steel', email: 'buy@acme.test', phone: '+91 98765 43210', city: 'Pune', industry: 'Manufacturing', source: 'REFERRAL' });
  ids.leadA2 = await lead(ids.orgA, { companyName: 'Globex' });
  ids.leadB = await lead(ids.orgB, { companyName: 'Initech', email: 'x@initech.test' });
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

test('rescore with credits uses the AI layer and stores the "why"', async () => {
  const calls = provider.calls.length;
  const res = await api('POST', `/lead-companies/${ids.leadA}/rescore`, { ...as('A'), body: {} });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.equal(d.source, 'ai');
  assert.ok(d.score >= 0 && d.score <= 100);
  assert.ok(d.reasons.length >= 1 && d.reasons.length <= 3);
  assert.ok(provider.calls.length > calls);
  const stored = await app.entityService.findOne(LEAD, ids.leadA);
  assert.equal(stored.aiScore, d.score);
  assert.equal(stored.aiScoreReasons.source, 'ai');
  assert.ok(stored.aiScoredAt);
});

test('without credits (free plan) rescore falls back to rule reasons', async () => {
  const calls = provider.calls.length;
  const res = await api('POST', `/lead-companies/${ids.leadB}/rescore`, { ...as('B'), body: {} });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.source, 'rules');
  assert.ok(res.body.data.reasons.length >= 1);
  assert.equal(provider.calls.length, calls, 'provider not called without credits');
});

test("another org's lead is not found", async () => {
  const res = await api('POST', `/lead-companies/${ids.leadB}/rescore`, { ...as('A'), body: {} });
  assert.equal(res.status, 404);
});

test('the score updates automatically after new chat activity', async () => {
  await api('POST', `/lead-companies/${ids.leadA2}/rescore`, { ...as('A'), body: { ai: false } });
  const before = await app.entityService.findOne(LEAD, ids.leadA2);
  await create('api::crm-activity.crm-activity', {
    organization: ids.orgA,
    action: 'comment',
    subjectType: 'lead_company',
    subjectId: ids.leadA2,
    leadCompany: ids.leadA2,
    summary: 'Very interested, please send the proposal and pricing',
  });
  let after = before;
  for (let i = 0; i < 60 && new Date(after.aiScoredAt) <= new Date(before.aiScoredAt); i += 1) {
    await wait(50);
    after = await app.entityService.findOne(LEAD, ids.leadA2);
  }
  assert.ok(new Date(after.aiScoredAt) > new Date(before.aiScoredAt), 'rescored after the comment');
  assert.ok(after.aiScore > before.aiScore, `${after.aiScore} > ${before.aiScore}`);
});

test('leads list sorts and filters by score', async () => {
  const res = await api('GET', '/lead-companies?sort=aiScore:desc&pageSize=50', as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const scores = res.body.data.map((l) => l.aiScore ?? -1);
  assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
  const top = Math.max(...scores);
  const f = await api('GET', `/lead-companies?filters[aiScore][$gte]=${top}`, as('A'));
  assert.equal(f.status, 200);
  assert.ok(f.body.data.length >= 1 && f.body.data.every((l) => l.aiScore >= top));
});

test('nightly backfill scores leads that have no score', async () => {
  const id = (await create(LEAD, { organization: ids.orgA, status: 'NEW', companyName: 'Unscored Co' })).id;
  await app.db.query(LEAD).update({ where: { id }, data: { aiScoredAt: null, aiScore: null } });
  const r = await require('../../src/utils/lead-scoring').backfillScores(app, { limit: 100 });
  assert.ok(r.scored >= 1);
  const l = await app.entityService.findOne(LEAD, id);
  assert.ok(Number.isInteger(l.aiScore));
  assert.ok(l.aiScoreReasons.reasons.length >= 1);
});
