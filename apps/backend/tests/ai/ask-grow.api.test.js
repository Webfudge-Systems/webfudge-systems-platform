'use strict';

/**
 * G20 Ask Grow + Draft anything end to end: in-process Strapi on SQLite, AI_PROVIDER=mock.
 * The ticket question returns exactly the matching leads of the asker's org; users without
 * crm.leads read get 403; drafts use the org brand tone and are metered.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-ask-grow-${process.pid}-${Date.now()}.db`;
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
});
for (const k of ['RESEND_API_KEY', 'REDIS_URL', 'ANTHROPIC_API_KEY', 'AI_EMBEDDINGS_PROVIDER']) delete process.env[k];

let app;
let base;
const ids = {};
const realLog = console.log;
console.log = (...args) => {
  if (process.env.TEST_VERBOSE) realLog(...args);
};


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
const as = (key) => ({ token: ids[`jwt${key}`], org: ids[key === 'B' ? 'orgB' : 'orgA'] });

// Wednesday of last week (UTC noon) and two months ago.
const now = new Date();
const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - ((now.getUTCDay() + 6) % 7) * 864e5);
const LAST_WEEK = new Date(monday.getTime() - 5 * 864e5 + 12 * 36e5).toISOString();
const OLD = new Date(Date.now() - 60 * 864e5).toISOString();

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  app = await createStrapi(await compileStrapi()).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  const { createMockProvider } = require('@webfudge/ai');
  const { mockRespond } = require('../../src/utils/ai/mock-responder');
  require('../../src/utils/ai').setProvider(createMockProvider({ respond: mockRespond }));

  const { addMember } = require('../../src/utils/saas-org');
  const [crmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'crm' }, limit: 1 });
  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org G20 ${key}`, slug: `g20-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', { organization: org.id, app: crmApp.id, status: 'active', planCode: 'standard', startDate: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5), totalUsers: 5 });
  }
  const user = async (key, orgKey, role, customPermissions, firstName) => {
    const u = await app.plugin('users-permissions').service('user').add({ username: `g20${key}${Date.now()}`, email: `g20-${key.toLowerCase()}@team.test`, password: 'Passw0rd!x', confirmed: true, provider: 'local', firstName });
    const m = await addMember(app, { orgId: ids[`org${orgKey}`], userId: u.id, role });
    if (customPermissions) await app.entityService.update('api::organization-user.organization-user', m.id, { data: { customPermissions } });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  };
  await user('A', 'A', 'Admin', null, 'Asha');
  await user('M', 'A', 'Member', null, 'Riya');
  await user('N', 'A', 'Member', { crm: { modules: { leads: { access: 'none' } } } }, 'Neel');
  await user('B', 'B', 'Admin', null, 'Bob');

  const lead = async (org, data, createdAt = LAST_WEEK) => {
    const row = await create('api::lead-company.lead-company', { organization: org, status: 'NEW', ...data });
    await app.db.query('api::lead-company.lead-company').update({ where: { id: row.id }, data: { createdAt } });
    return row.id;
  };
  const A = ids.orgA;
  ids.hit = await lead(A, { companyName: 'Pune Hit', city: 'Pune', source: 'META_ADS', aiScore: 82, email: 'hit@x.test' });
  ids.lowScore = await lead(A, { companyName: 'Pune Low', city: 'Pune', source: 'META_ADS', aiScore: 50 });
  ids.called = await lead(A, { companyName: 'Pune Called', city: 'Pune', source: 'META_ADS', aiScore: 90, firstContactedAt: new Date(LAST_WEEK) });
  ids.met = await lead(A, { companyName: 'Pune Met', city: 'Pune', source: 'META_ADS', aiScore: 90 });
  await create('api::meeting.meeting', { title: 'Intro call', organization: A, leadCompany: ids.met, startTime: new Date(LAST_WEEK), status: 'completed' });
  ids.mumbai = await lead(A, { companyName: 'Mumbai Co', city: 'Mumbai', source: 'META_ADS', aiScore: 90 });
  ids.google = await lead(A, { companyName: 'Pune Google', city: 'Pune', source: 'GOOGLE_ADS', aiScore: 90 });
  ids.old = await lead(A, { companyName: 'Pune Old', city: 'Pune', source: 'META_ADS', aiScore: 90 }, OLD);
  ids.otherOrg = await lead(ids.orgB, { companyName: 'Pune Other Org', city: 'Pune', source: 'META_ADS', aiScore: 95 });
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

const QUESTION = 'Pune leads from Meta last week with score > 70 that nobody called';

test('the ticket question returns exactly the matching leads of my org', async () => {
  const res = await api('POST', '/ask-grow/query', { ...as('M'), body: { question: QUESTION } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.deepEqual(d.filter, { city: 'Pune', source: 'META_ADS', period: 'last_week', scoreMin: 71, notContacted: true });
  assert.deepEqual(d.rows.map((r) => r.id), [ids.hit]);
  assert.equal(d.total, 1);
  assert.deepEqual(d.ids, [ids.hit]);
  assert.ok(d.chips.includes('Not contacted yet'));
});

test('/ask-grow/run re-applies a filter without AI and stays org-scoped', async () => {
  const res = await api('POST', '/ask-grow/run', { ...as('B'), body: { filter: { city: 'Pune', organization: ids.orgA } } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.ids, [ids.otherOrg]);
});

test('a user without crm.leads read access is refused', async () => {
  const q = await api('POST', '/ask-grow/query', { ...as('N'), body: { question: QUESTION } });
  assert.equal(q.status, 403);
  const r = await api('POST', '/ask-grow/run', { ...as('N'), body: { filter: { city: 'Pune' } } });
  assert.equal(r.status, 403);
});

test('draft uses the org brand tone + signature and is metered; other orgs cannot draft my leads', async () => {
  const denied = await api('PUT', '/ask-grow/brand-tone', { ...as('M'), body: { tone: 'Shouty' } });
  assert.equal(denied.status, 403);
  const put = await api('PUT', '/ask-grow/brand-tone', { ...as('A'), body: { tone: 'Warm, plain English, no jargon', signature: '— Team Acme' } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  const res = await api('POST', '/ask-grow/draft', { ...as('M'), body: { recordType: 'lead', recordId: ids.hit, kind: 'followup' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.data.subject);
  assert.ok(res.body.data.body.endsWith('— Team Acme'));
  assert.equal(res.body.data.to, 'hit@x.test');
  const usage = await app.entityService.findMany('api::ai.ai-usage', { filters: { organization: ids.orgA }, limit: 50 });
  assert.ok(usage.some((u) => u.feature === 'grow.draft'));
  const cross = await api('POST', '/ask-grow/draft', { ...as('B'), body: { recordType: 'lead', recordId: ids.hit, kind: 'email' } });
  assert.equal(cross.status, 404);
});
