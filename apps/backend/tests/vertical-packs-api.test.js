'use strict';

/**
 * Vertical packs (G22) end to end, against a real Strapi on a throwaway SQLite database:
 * sign-up with a pack, the Settings preview / apply routes, idempotency and RBAC.
 *   npm run test:vertical-packs   (from apps/backend)
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-vpacks-${process.pid}-${Date.now()}.db`;
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

let app;
let base;
const ids = {};
const realLog = console.log;
if (!process.env.TEST_VERBOSE) console.log = () => {};

async function api(method, url, { token, body, org } = {}) {
  const res = await fetch(`${base}/api${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(org ? { 'X-Organization-Id': String(org) } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, body: json };
}

const PIPELINE = 'api::crm-pipeline.crm-pipeline';
const FIELD = 'api::crm-custom-field.crm-custom-field';
const snapshot = async (orgId) =>
  JSON.stringify([
    await app.entityService.findMany(PIPELINE, { filters: { organization: orgId }, sort: { id: 'asc' } }),
    await app.entityService.findMany(FIELD, { filters: { organization: orgId }, sort: { id: 'asc' } }),
    await app.entityService.findMany('api::saved-view.saved-view', { filters: { organization: orgId }, sort: { id: 'asc' } }),
  ]);

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const ctx = await compileStrapi();
  app = await createStrapi(ctx).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  const { addMember } = require('../src/utils/saas-org');
  const user = async (name) =>
    app.plugin('users-permissions').service('user').add({
      username: `${name}${Date.now()}`,
      email: `${name.toLowerCase()}@vpacks.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
  const jwt = (id) => app.plugin('users-permissions').service('jwt').issue({ id });
  const owner = await user('Owner');
  ids.owner = owner.id;
  ids.jwt = jwt(owner.id);
  ids.member = await user('Member');
  ids.jwtMember = jwt(ids.member.id);
  ids.addMember = addMember;
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
});

test('sign-up picking real estate gets a ready pipeline with a site-visit stage and fields', async () => {
  const res = await api('POST', '/saas/organizations', {
    token: ids.jwt,
    body: { name: 'Skyline Homes', industry: 'other', verticalPack: 'real_estate' },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  ids.org = res.body.organization.id;
  assert.equal(res.body.verticalPack.pack.key, 'real_estate');

  const deals = await app.entityService.findMany(PIPELINE, { filters: { organization: ids.org, entity: 'deal' } });
  assert.equal(deals.length, 1);
  assert.equal(deals[0].name, 'Property sales');
  assert.equal(deals[0].isDefault, true);
  assert.ok(deals[0].stages.some((s) => s.key === 'site_visit_scheduled'));
  const fields = await app.entityService.findMany(FIELD, { filters: { organization: ids.org } });
  assert.ok(fields.some((f) => f.key === 'site_visit_date' && f.entity === 'lead'));
});

test('catalog lists the packs for the sign-up picker', async () => {
  const res = await api('GET', '/saas/catalog', { token: ids.jwt });
  assert.equal(res.status, 200);
  assert.equal(res.body.verticalPacks.length, 5);
});

test('Settings: preview writes nothing, re-apply duplicates nothing, other packs add on top', async () => {
  // Grow access for the routes (the sign-up hook runs before any app trial starts).
  const [crm] = await app.entityService.findMany('api::app.app', { filters: { slug: 'crm' }, limit: 1 });
  await app.entityService.create('api::subscription.subscription', {
    data: { organization: ids.org, app: crm.id, status: 'active', planCode: 'free', startDate: new Date() },
  });
  const as = { token: ids.jwt, org: ids.org };

  const list = await api('GET', '/crm-vertical-packs', as);
  assert.equal(list.status, 200, JSON.stringify(list.body));
  assert.deepEqual(list.body.applied.history, ['real_estate']);

  const before = await snapshot(ids.org);
  const preview = await api('GET', '/crm-vertical-packs/real_estate/preview', as);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.data.created.customFields.length, 0);
  const again = await api('POST', '/crm-vertical-packs/real_estate/apply', as);
  assert.equal(again.status, 200);
  assert.equal(await snapshot(ids.org), before);

  const ev = await api('POST', '/crm-vertical-packs/ev/apply', as);
  assert.equal(ev.status, 200);
  const deals = await app.entityService.findMany(PIPELINE, { filters: { organization: ids.org, entity: 'deal' } });
  assert.equal(deals.length, 2);
  assert.equal(deals.find((p) => p.name === 'Property sales').isDefault, true);
});

test('members without settings access cannot apply; unknown packs 404', async () => {
  await ids.addMember(app, { orgId: ids.org, userId: ids.member.id, role: 'Member' });
  const denied = await api('POST', '/crm-vertical-packs/clinics/apply', { token: ids.jwtMember, org: ids.org });
  assert.equal(denied.status, 403);
  const missing = await api('GET', '/crm-vertical-packs/nope/preview', { token: ids.jwt, org: ids.org });
  assert.equal(missing.status, 404);
});
