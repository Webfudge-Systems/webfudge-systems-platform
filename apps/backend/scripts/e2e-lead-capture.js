'use strict';

/**
 * G7 end-to-end check: boots this Strapi in SaaS mode against a THROWAWAY SQLite file, seeds two orgs
 * (Grow trial), turns every lead source on through the settings API, posts the sample payloads from
 * tests/lead-capture/fixtures.js to the public endpoints and checks the database.
 *
 *   node scripts/e2e-lead-capture.js          (from apps/backend; deletes the SQLite file afterwards)
 *
 * Never point this at a real database: it forces DATABASE_CLIENT=sqlite and a new file under .tmp/.
 */

const path = require('path');
const fs = require('fs');
const assert = require('node:assert/strict');

const dbFile = `.tmp/e2e-lead-capture-${Date.now()}.db`;
const PORT = Number(process.env.E2E_PORT || 1399);
Object.assign(process.env, {
  DATABASE_CLIENT: 'sqlite',
  DATABASE_FILENAME: dbFile,
  DATABASE_URL: '',
  PLATFORM_MODE: 'saas',
  NODE_ENV: 'development',
  HOST: '127.0.0.1',
  PORT: String(PORT),
  REDIS_ENABLED: 'false',
  CACHE_API_ENABLED: 'false',
  JWT_SECRET: 'e2e-only-jwt-secret-not-used-anywhere-else-000000',
  APP_KEYS: 'e2eKeyA,e2eKeyB',
  API_TOKEN_SALT: 'e2e-salt',
  ADMIN_JWT_SECRET: 'e2e-admin-secret',
  TRANSFER_TOKEN_SALT: 'e2e-transfer-salt',
  ENCRYPTION_KEY: 'e2e-encryption-key',
  LEAD_CAPTURE_BASE_URL: `http://127.0.0.1:${PORT}`,
  STRAPI_TELEMETRY_DISABLED: 'true',
});

const fx = require('../tests/lead-capture/fixtures');
const LEAD = 'api::lead-company.lead-company';
const CONTACT = 'api::contact.contact';
const EVENT = 'api::lead-capture-event.lead-capture-event';
const ACTIVITY = 'api::crm-activity.crm-activity';

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const app = await createStrapi(await compileStrapi()).load();
  await app.server.listen(PORT, '127.0.0.1');
  const base = `http://127.0.0.1:${PORT}/api`;
  const jwt = require('jsonwebtoken');
  const { addMember } = require('../src/utils/saas-org');
  const es = app.entityService;
  const results = [];
  const check = async (name, fn) => {
    try {
      await fn();
      results.push(['PASS', name]);
    } catch (e) {
      results.push(['FAIL', name, e.message]);
    }
  };

  // ---- seed: two orgs, owners with Admin role, Grow trial ----
  const crmApp = (await es.findMany('api::app.app', { filters: { slug: 'crm' }, limit: 1 }))[0];
  assert.ok(crmApp, 'crm app should be seeded by bootstrap');
  async function seedOrg(n) {
    const user = await app.db.query('plugin::users-permissions.user').create({
      data: { username: `e2e-owner-${n}`, email: `owner${n}@e2e.test`, provider: 'local', confirmed: true, blocked: false, password: 'x' },
    });
    const org = await es.create('api::organization.organization', { data: { name: `E2E Org ${n}`, slug: `e2e-org-${n}-${Date.now()}`, owner: user.id } });
    await addMember(app, { orgId: org.id, userId: user.id, role: 'Admin' });
    await es.create('api::subscription.subscription', {
      data: { organization: org.id, app: crmApp.id, status: 'trial', startDate: new Date(), trialEndsAt: new Date(Date.now() + 10 * 86400000) },
    });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { org, user, token };
  }
  const A = await seedOrg(1);
  const B = await seedOrg(2);

  const api = async (who, method, p, body) => {
    const res = await fetch(base + p, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${who.token}`, 'X-Organization-Id': String(who.org.id) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const post = async (url, body, { form = false, headers = {} } = {}) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json', Accept: 'application/json', ...headers },
      body: form ? new URLSearchParams(body).toString() : JSON.stringify(body),
    });
    return { status: res.status, json: await res.json().catch(() => null), headers: res.headers };
  };
  const leadsOf = async (org) => {
    const leads = await es.findMany(LEAD, { filters: { organization: org.id }, populate: { assignedTo: { fields: ['id'] } }, limit: 500 });
    const contacts = await es.findMany(CONTACT, { filters: { organization: org.id }, populate: { leadCompany: { fields: ['id'] } }, limit: 2000 });
    for (const l of leads) l.contacts = contacts.filter((c) => c.leadCompany?.id === l.id);
    return leads;
  };

  // ---- enable every source for org A (and web form for org B) ----
  const urls = {};
  await check('settings: non-authenticated request is rejected', async () => {
    const res = await fetch(`${base}/crm-lead-capture`);
    assert.ok([401, 403].includes(res.status), `got ${res.status}`);
  });
  await check('settings: enable all six sources for org A', async () => {
    for (const slug of ['web-form', 'google-ads', 'indiamart', 'justdial', '99acres', 'magicbricks']) {
      const r = await api(A, 'PUT', `/crm-lead-capture/${slug}`, { enabled: true });
      assert.equal(r.status, 200, `${slug}: ${JSON.stringify(r.json)}`);
      assert.ok(r.json.data.endpointUrl, `${slug} endpoint`);
      urls[slug] = r.json.data;
    }
    const ov = await api(A, 'GET', '/crm-lead-capture');
    assert.equal(ov.status, 200);
    assert.equal(ov.json.data.sources.filter((s) => s.enabled).length, 6);
  });
  let urlB;
  await check('settings: enable web form for org B', async () => {
    const r = await api(B, 'PUT', '/crm-lead-capture/web-form', { enabled: true });
    assert.equal(r.status, 200);
    urlB = r.json.data.endpointUrl;
  });

  // ---- website form ----
  await check('web form: urlencoded post creates one lead + contact with UTM + activity', async () => {
    const r = await post(urls['web-form'].endpointUrl, { ...fx.webForm, _wf_ts: String(Date.now() - 10000) }, { form: true });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.status, 'created');
    assert.equal(r.headers.get('access-control-allow-origin'), '*');
    const leads = await leadsOf(A.org);
    assert.equal(leads.length, 1);
    const l = leads[0];
    assert.equal(l.companyName, 'Verma Textiles Pvt Ltd');
    assert.equal(l.source, 'WEBSITE');
    assert.equal(l.email, 'asha.verma@example.in');
    assert.equal(l.phone, '+919876543210');
    assert.equal(l.sourceDetails.utm.utm_campaign, 'diwali-sale');
    assert.equal(l.status, 'NEW');
    assert.equal(l.assignedTo?.id, A.user.id, 'falls back to org owner when no rule');
    assert.equal(l.contacts.length, 1);
    assert.equal(l.contacts[0].firstName, 'Asha');
    const acts = await es.findMany(ACTIVITY, { filters: { organization: A.org.id, leadCompany: l.id } });
    assert.ok(acts.some((a) => /captured from Website form/.test(a.summary)));
  });
  await check('web form: same person again (phone in another format) merges, no new lead', async () => {
    const r = await post(urls['web-form'].endpointUrl, { name: 'Asha V', phone: '+91 98765-43210', message: 'Following up' });
    assert.equal(r.json.status, 'merged', JSON.stringify(r.json));
    const leads = await leadsOf(A.org);
    assert.equal(leads.length, 1);
    assert.match(leads[0].notes, /Following up/);
    assert.equal(leads[0].sourceDetails.recaptures.length, 1);
  });
  await check('web form: honeypot → 200 to the bot, no lead, spam event', async () => {
    const r = await post(urls['web-form'].endpointUrl, { name: 'Bot', email: 'bot@spam.example', _wf_hp: 'x' });
    assert.equal(r.status, 200);
    assert.equal((await leadsOf(A.org)).length, 1);
    const ev = await es.findMany(EVENT, { filters: { organization: A.org.id, status: 'spam' } });
    assert.equal(ev.length, 1);
  });
  await check('web form: no email/phone → 422', async () => {
    const r = await post(urls['web-form'].endpointUrl, { name: 'Nobody', message: 'hi' });
    assert.equal(r.status, 422);
  });
  await check('web form: wrong secret → 401 and no lead', async () => {
    const bad = urls['web-form'].endpointUrl.replace(/\.[A-Za-z0-9_-]+$/, '.AAAAAAAAAAAAAAAAAAAAAAAA');
    const r = await post(bad, { name: 'X', email: 'x@example.com' });
    assert.equal(r.status, 401);
    assert.equal((await leadsOf(A.org)).length, 1);
  });
  await check("web form: org A's secret with org B's id → 401", async () => {
    const secretA = urls['web-form'].endpointUrl.split('.').pop();
    const forged = urlB.replace(/\.[A-Za-z0-9_-]+$/, `.${secretA}`);
    const r = await post(forged, { name: 'X', email: 'x2@example.com' });
    assert.equal(r.status, 401);
  });
  await check('web form: org B gets its own lead; same email in org B does not merge into org A', async () => {
    const r = await post(urlB, { name: 'Asha Verma', email: 'asha.verma@example.in' });
    assert.equal(r.json.status, 'created');
    assert.equal((await leadsOf(B.org)).length, 1);
    assert.equal((await leadsOf(A.org)).length, 1);
  });
  await check('web form: allowed domains enforced', async () => {
    await api(A, 'PUT', '/crm-lead-capture/web-form', { allowedDomains: 'verma.example.in' });
    const blocked = await post(urls['web-form'].endpointUrl, { name: 'Y', email: 'y@example.com' }, { headers: { Origin: 'https://other.example.com' } });
    assert.equal(blocked.status, 403);
    const ok = await post(urls['web-form'].endpointUrl, { name: 'Y', email: 'y@example.com' }, { headers: { Origin: 'https://www.verma.example.in' } });
    assert.equal(ok.status, 200);
    await api(A, 'PUT', '/crm-lead-capture/web-form', { allowedDomains: [] });
  });
  await check('web form: plain HTML form post gets a thank-you page / redirect', async () => {
    await api(A, 'PUT', '/crm-lead-capture/web-form', { redirectUrl: 'https://verma.example.in/thanks' });
    const res = await fetch(urls['web-form'].endpointUrl, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'text/html' },
      body: new URLSearchParams({ name: 'Z', email: 'z@example.com' }).toString(),
    });
    assert.equal(res.status, 303);
    assert.equal(res.headers.get('location'), 'https://verma.example.in/thanks');
  });

  // ---- Google Ads ----
  const gUrl = urls['google-ads'].endpointUrl;
  const gKey = urls['google-ads'].googleKey;
  await check('google ads: wrong google_key → 401', async () => {
    const r = await post(gUrl, { ...fx.googleAds, google_key: 'nope' });
    assert.equal(r.status, 401);
  });
  await check('google ads: test lead acknowledged, no lead created', async () => {
    const before = (await leadsOf(A.org)).length;
    const r = await post(gUrl, { ...fx.googleAds, google_key: gKey, is_test: true });
    assert.equal(r.status, 200);
    assert.equal((await leadsOf(A.org)).length, before);
  });
  await check('google ads: real lead creates one lead; redelivery is ignored', async () => {
    const before = (await leadsOf(A.org)).length;
    const r1 = await post(gUrl, { ...fx.googleAds, google_key: gKey });
    assert.equal(r1.status, 200);
    const r2 = await post(gUrl, { ...fx.googleAds, google_key: gKey });
    assert.equal(r2.status, 200);
    const leads = await leadsOf(A.org);
    assert.equal(leads.length, before + 1);
    const g = leads.find((l) => l.source === 'GOOGLE_ADS');
    assert.equal(g.companyName, 'Rohan Mehta');
    assert.equal(g.zipCode, '411001');
    const dup = await es.findMany(EVENT, { filters: { organization: A.org.id, source: 'google_ads', status: 'duplicate_delivery' } });
    assert.equal(dup.length, 1);
  });

  // ---- IndiaMART ----
  await check('indiamart push: creates lead with company, product details', async () => {
    const r = await post(urls.indiamart.endpointUrl, fx.indiamartPush);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.CODE, 200);
    const l = (await leadsOf(A.org)).find((x) => x.source === 'INDIAMART');
    assert.equal(l.companyName, 'Patel Agro Industries');
    assert.equal(l.phone, '+919898012345');
    assert.equal(l.sourceDetails.product, 'Industrial Water Pump');
    assert.equal(l.contacts[0].firstName, 'Suresh');
  });
  await check('indiamart pull: off until configured; pull with a mock IndiaMART server ingests and dedupes', async () => {
    const off = await api(A, 'POST', '/crm-lead-capture/indiamart/pull');
    assert.match(off.json.data.skipped, /not configured/);
    const http = require('http');
    const mock = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(req.url.includes('glusr_crm_key=MOCKKEY1234') ? fx.indiamartPull : { CODE: 401, STATUS: 'FAILURE', MESSAGE: 'Invalid key' }));
    });
    await new Promise((r) => mock.listen(0, '127.0.0.1', r));
    process.env.INDIAMART_PULL_URL = `http://127.0.0.1:${mock.address().port}/wservce/crm/crmListing/v2/`;
    const put = await api(A, 'PUT', '/crm-lead-capture/indiamart', { pull: { enabled: true, crmKey: 'MOCKKEY1234' } });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    assert.equal(put.json.data.pull.hasCrmKey, true);
    assert.equal(JSON.stringify(put.json).includes('MOCKKEY1234'), false, 'CRM key must never be returned');
    const before = (await leadsOf(A.org)).length;
    const r = await api(A, 'POST', '/crm-lead-capture/indiamart/pull');
    assert.deepEqual({ fetched: r.json.data.fetched, created: r.json.data.created }, { fetched: 2, created: 2 }, JSON.stringify(r.json));
    assert.equal((await leadsOf(A.org)).length, before + 2);
    const again = await api(A, 'POST', '/crm-lead-capture/indiamart/pull');
    assert.match(again.json.data.skipped, /5 minutes/);
    mock.close();
  });

  // ---- JustDial (GET push + email) ----
  await check('justdial: GET push creates lead', async () => {
    const res = await fetch(`${urls.justdial.endpointUrl}?${new URLSearchParams(fx.justdialPush)}`);
    assert.equal(res.status, 200, await res.text());
    const l = (await leadsOf(A.org)).find((x) => x.source === 'JUSTDIAL');
    assert.equal(l.companyName, 'Vikram Singh');
    assert.equal(l.industry, 'Interior Designers');
  });
  await check('justdial: lead email parsed into a lead', async () => {
    const r = await post(urls.justdial.emailEndpointUrl, fx.justdialEmail);
    assert.equal(r.json.status, 'created', JSON.stringify(r.json));
    assert.ok((await leadsOf(A.org)).some((x) => x.email === 'neha.kapoor@example.com' && x.source === 'JUSTDIAL'));
  });

  // ---- 99acres / MagicBricks ----
  await check('99acres: webhook + email each create a lead', async () => {
    assert.equal((await post(urls['99acres'].endpointUrl, fx.ninetyNineAcresPush)).json.status, 'created');
    assert.equal((await post(urls['99acres'].emailEndpointUrl, fx.ninetyNineAcresEmail)).json.status, 'created');
    assert.equal((await leadsOf(A.org)).filter((x) => x.source === '99ACRES').length, 2);
  });
  await check('magicbricks: webhook + email each create a lead', async () => {
    assert.equal((await post(urls.magicbricks.endpointUrl, fx.magicbricksPush)).json.status, 'created');
    assert.equal((await post(urls.magicbricks.emailEndpointUrl, fx.magicbricksEmail)).json.status, 'created');
    assert.equal((await leadsOf(A.org)).filter((x) => x.source === 'MAGICBRICKS').length, 2);
  });
  await check('magicbricks: same buyer from IndiaMART-style other source merges by email', async () => {
    const before = (await leadsOf(A.org)).length;
    const r = await post(urls.indiamart.endpointUrl, { RESPONSE: { ...fx.indiamartPush.RESPONSE, UNIQUE_QUERY_ID: '2659999999', SENDER_MOBILE: '', SENDER_EMAIL: 'ARJUN.RAO@example.com' } });
    assert.equal(r.json.status, 'merged');
    assert.equal((await leadsOf(A.org)).length, before);
  });

  // ---- disable / rotate ----
  await check('disabled source → 403, rotated secret → old URL 401', async () => {
    await api(A, 'PUT', '/crm-lead-capture/justdial', { enabled: false });
    assert.equal((await post(urls.justdial.endpointUrl, fx.justdialPush)).status, 403);
    const rot = await api(A, 'POST', '/crm-lead-capture/99acres/rotate');
    assert.notEqual(rot.json.data.endpointUrl, urls['99acres'].endpointUrl);
    assert.equal((await post(urls['99acres'].endpointUrl, fx.ninetyNineAcresPush)).status, 401);
  });
  await check('event log lists recent events with counts', async () => {
    const ov = await api(A, 'GET', '/crm-lead-capture');
    assert.ok(ov.json.data.events.length >= 10);
    const wf = ov.json.data.sources.find((s) => s.key === 'web_form');
    assert.ok(wf.stats.created >= 1 && wf.stats.spam === 1);
  });
  await check('one contact per new lead, no orphan contacts', async () => {
    const leads = await leadsOf(A.org);
    for (const l of leads) assert.ok(l.contacts.length >= 1, `lead ${l.companyName} has a contact`);
    const contacts = await es.findMany(CONTACT, { filters: { organization: A.org.id }, populate: { leadCompany: { fields: ['id'] } } });
    assert.ok(contacts.every((c) => c.leadCompany));
  });

  for (const r of results) console.log(r.join('  '));
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  console.log('Leads in org A:', (await leadsOf(A.org)).map((l) => `${l.id}:${l.source}:${l.companyName}`).join(' | '));
  await app.destroy();
  for (const f of [dbFile, `${dbFile}-shm`, `${dbFile}-wal`]) fs.rmSync(path.join(__dirname, '..', f), { force: true });
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
