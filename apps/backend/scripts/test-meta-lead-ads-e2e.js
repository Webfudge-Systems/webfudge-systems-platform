#!/usr/bin/env node
'use strict';

/**
 * End-to-end check for Meta Lead Ads capture (ticket G6) — no real Meta app needed.
 *
 * Boots this Strapi app in SaaS mode on a throwaway SQLite file, serves a mock Graph API on
 * localhost (META_GRAPH_BASE_URL), seeds two organizations with a connected Page each, then sends
 * signed webhook deliveries and checks what lands in the database.
 *
 *   node scripts/test-meta-lead-ads-e2e.js        (from apps/backend; exits non-zero on failure)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const crypto = require('crypto');

const APP_DIR = path.resolve(__dirname, '..');
fs.mkdirSync(path.join(APP_DIR, '.tmp'), { recursive: true });
const TMP_DIR = fs.mkdtempSync(path.join(APP_DIR, '.tmp', 'meta-e2e-'));
const GRAPH_PORT = 4599;
const API_PORT = 1399;
const APP_SECRET = 'e2e-app-secret';
const VERIFY_TOKEN = 'e2e-verify-token';
// --internal: boot as the Internal deployment and check every Meta route is a 404 there.
const INTERNAL = process.argv.includes('--internal');

Object.assign(process.env, {
  NODE_ENV: 'development',
  PLATFORM_MODE: INTERNAL ? 'internal' : 'saas',
  HOST: '127.0.0.1',
  PORT: String(API_PORT),
  DATABASE_CLIENT: 'sqlite',
  DATABASE_FILENAME: path.relative(APP_DIR, path.join(TMP_DIR, 'e2e.db')),
  APP_KEYS: 'e2eKey1,e2eKey2',
  API_TOKEN_SALT: 'e2e-salt',
  ADMIN_JWT_SECRET: 'e2e-admin-secret',
  TRANSFER_TOKEN_SALT: 'e2e-transfer-salt',
  JWT_SECRET: 'e2e-jwt-secret',
  ENCRYPTION_KEY: 'e2e-encryption-key',
  REDIS_ENABLED: 'false',
  REDIS_URL: '',
  META_APP_ID: '1234567890',
  META_APP_SECRET: APP_SECRET,
  META_WEBHOOK_VERIFY_TOKEN: VERIFY_TOKEN,
  META_TOKEN_ENCRYPTION_KEY: 'e2e-token-key',
  META_GRAPH_BASE_URL: `http://127.0.0.1:${GRAPH_PORT}`,
  PUBLIC_URL: `http://127.0.0.1:${API_PORT}`,
  CRM_APP_URL: 'http://localhost:3007',
});
delete process.env.DATABASE_URL;

// ─── Mock Graph API ──────────────────────────────────────────────────────────

const PAGE_A = '111000111';
const PAGE_B = '222000222';
const PAGE_TOKEN_A = 'PAGE-TOKEN-A-SECRET';
const PAGE_TOKEN_B = 'PAGE-TOKEN-B-SECRET';
const FORM_A = '7001';
const FORM_A_OFF = '7002';
const FORM_B = '8001';

const lead = (id, formId, answers, extra = {}) => ({
  id,
  created_time: '2026-11-19T10:00:00+0000',
  form_id: formId,
  ad_id: 'ad-1',
  ad_name: 'Carousel A',
  adset_id: 'adset-1',
  adset_name: 'Pune 25-45',
  campaign_id: 'camp-1',
  campaign_name: 'Diwali Leads',
  platform: 'fb',
  is_organic: false,
  field_data: Object.entries(answers).map(([name, v]) => ({ name, values: [v] })),
  ...extra,
});

const LEADS = {
  'L-1': { token: PAGE_TOKEN_A, body: lead('L-1', FORM_A, { full_name: 'Asha Rao', email: 'asha@example.com', phone_number: '+919876543210', company_name: 'Rao Steels', budget: '5L', city: 'Pune' }) },
  // Same person (phone written differently), different Meta lead id → must not create a second lead
  'L-2': { token: PAGE_TOKEN_A, body: lead('L-2', FORM_A, { full_name: 'Asha R', phone_number: '98765 43210' }) },
  // Form that is not switched on in Settings
  'L-3': { token: PAGE_TOKEN_A, body: lead('L-3', FORM_A_OFF, { full_name: 'Off Form', email: 'off@example.com' }) },
  // Org B's Page
  'L-4': { token: PAGE_TOKEN_B, body: lead('L-4', FORM_B, { full_name: 'Vikram Shah', email: 'vikram@example.com' }) },
  // Delivered twice at the same time
  'L-5': { token: PAGE_TOKEN_A, body: lead('L-5', FORM_A, { full_name: 'Neha Joshi', email: 'neha@example.com' }) },
  // Only reachable through backfill (GET /{form}/leads)
  'L-6': { token: PAGE_TOKEN_A, body: lead('L-6', FORM_A, { full_name: 'Backfill Person', email: 'backfill@example.com' }) },
};

// Backfill listing for FORM_A: one lead we already have (L-1) and one we missed (L-6)
const FORM_LEADS = { [FORM_A]: { token: PAGE_TOKEN_A, data: [LEADS['L-6'].body, LEADS['L-1'].body] } };

const graphCalls = [];
const graphServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${GRAPH_PORT}`);
  const token = url.searchParams.get('access_token');
  const proof = url.searchParams.get('appsecret_proof');
  graphCalls.push({ path: url.pathname, token, proof });
  const send = (status, body) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  const id = url.pathname.replace(/^\/v[\d.]+\//, '');
  const formMatch = id.match(/^(\d+)\/leads$/);
  if (formMatch && FORM_LEADS[formMatch[1]]) {
    const f = FORM_LEADS[formMatch[1]];
    if (token !== f.token) return send(400, { error: { message: 'Invalid OAuth access token', code: 190 } });
    return send(200, { data: f.data });
  }
  const hit = id.includes('/') ? null : LEADS[id];
  if (!hit) return send(404, { error: { message: 'Unsupported get request', code: 100 } });
  if (token !== hit.token) return send(400, { error: { message: 'Invalid OAuth access token', code: 190 } });
  const expectedProof = crypto.createHmac('sha256', APP_SECRET).update(token).digest('hex');
  if (proof !== expectedProof) return send(400, { error: { message: 'Invalid appsecret_proof', code: 100 } });
  return send(200, hit.body);
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail !== undefined ? `  → ${JSON.stringify(detail)}` : ''}`);
}

const BASE = `http://127.0.0.1:${API_PORT}/api`;
const sign = (body, secret = APP_SECRET) => 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex');
const payloadFor = (pageId, leadgenId, formId) =>
  JSON.stringify({
    object: 'page',
    entry: [{ id: pageId, time: 1763546400, changes: [{ field: 'leadgen', value: { leadgen_id: leadgenId, page_id: pageId, form_id: formId, ad_id: 'ad-1', adgroup_id: 'adset-1', created_time: 1763546400 } }] }],
  });

async function postWebhook(body, signature = sign(body)) {
  const res = await fetch(`${BASE}/crm-meta/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature },
    body,
  });
  let json = null;
  try {
    json = await res.json();
  } catch (_) {
    /* empty */
  }
  return { status: res.status, json };
}

// ─── Run ─────────────────────────────────────────────────────────────────────

async function main() {
  await new Promise((r) => graphServer.listen(GRAPH_PORT, '127.0.0.1', r));
  process.chdir(APP_DIR);
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const ctx = await compileStrapi();
  const app = createStrapi({ ...ctx, serveAdminPanel: false, autoReload: false });
  app.log.level = 'warn';
  await app.start();

  if (INTERNAL) {
    const probes = [
      ['GET', `/crm-meta/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=x`],
      ['POST', '/crm-meta/webhook'],
      ['GET', '/crm-meta/oauth/callback?code=x&state=y'],
      ['GET', '/crm-meta/connection'],
      ['POST', '/crm-meta/connect'],
      ['POST', '/crm-meta/backfill'],
    ];
    for (const [method, p] of probes) {
      const body = method === 'POST' ? payloadFor(PAGE_A, 'L-1', FORM_A) : undefined;
      const res = await fetch(`${BASE}${p}`, { method, body, redirect: 'manual', headers: body ? { 'Content-Type': 'application/json', 'X-Hub-Signature-256': sign(body) } : {} });
      check(`Internal: ${method} ${p.split('?')[0]} → 404`, res.status === 404, res.status);
    }
    await app.destroy();
    return;
  }

  const { encryptToken } = require('../src/utils/meta-lead-ads');
  const es = app.entityService;
  const LEAD = 'api::lead-company.lead-company';
  const CONTACT = 'api::contact.contact';
  const ACTIVITY = 'api::crm-activity.crm-activity';

  // Seed: user, two orgs with Grow (crm) on the Free plan, one connected Page each
  const user = await es.create('plugin::users-permissions.user', {
    data: { username: 'e2e-admin', email: 'e2e-admin@example.com', password: 'Passw0rd!e2e', confirmed: true, blocked: false, provider: 'local' },
  });
  const [crmApp] = await es.findMany('api::app.app', { filters: { slug: 'crm' }, limit: 1 });
  if (!crmApp) throw new Error('crm app missing from the SaaS catalogue');
  const [adminRole] = await es.findMany('api::organization-role.organization-role', { filters: { code: 'admin' }, limit: 1 });

  async function seedOrg(name, pageId, pageToken, forms) {
    const org = await es.create('api::organization.organization', { data: { name, slug: name.toLowerCase().replace(/\W+/g, '-'), owner: user.id } });
    await es.create('api::subscription.subscription', { data: { organization: org.id, app: crmApp.id, status: 'active', planCode: 'free' } });
    await es.create('api::organization-user.organization-user', { data: { user: user.id, organization: org.id, isActive: true, ...(adminRole && { role: adminRole.id }) } });
    await es.create('api::crm-meta-connection.crm-meta-connection', {
      data: {
        organization: org.id,
        connectedBy: user.id,
        metaUserName: 'E2E Tester',
        userTokenEnc: encryptToken('USER-TOKEN-SECRET'),
        pageId,
        pageName: `${name} Page`,
        pageTokenEnc: encryptToken(pageToken),
        status: 'active',
        forms,
      },
    });
    return org;
  }
  const orgA = await seedOrg('Org Alpha', PAGE_A, PAGE_TOKEN_A, [
    { id: FORM_A, name: 'Diwali enquiry', enabled: true, mapping: { budget: 'notes' } },
    { id: FORM_A_OFF, name: 'Old form', enabled: false, mapping: {} },
  ]);
  const orgB = await seedOrg('Org Beta', PAGE_B, PAGE_TOKEN_B, [{ id: FORM_B, name: 'Beta form', enabled: true, mapping: {} }]);
  const leadsOf = (orgId) => es.findMany(LEAD, { filters: { organization: orgId }, populate: { assignedTo: { fields: ['id'] } }, limit: 100 });

  // 1. Verify-token handshake
  const hs = await fetch(`${BASE}/crm-meta/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=CH4LL3NGE`);
  check('handshake echoes hub.challenge with the right verify token', hs.status === 200 && (await hs.text()) === 'CH4LL3NGE');
  const hsBad = await fetch(`${BASE}/crm-meta/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=x`);
  check('handshake rejects a wrong verify token (403)', hsBad.status === 403);

  // 2. Bad signature
  const body1 = payloadFor(PAGE_A, 'L-1', FORM_A);
  const bad = await postWebhook(body1, sign(body1, 'not-the-app-secret'));
  check('webhook with a bad signature is rejected (401)', bad.status === 401, bad);
  const unsigned = await fetch(`${BASE}/crm-meta/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: body1 });
  check('webhook without a signature is rejected (401)', unsigned.status === 401);
  check('…and nothing was created', (await leadsOf(orgA.id)).length === 0);

  // 3. Valid lead
  const ok = await postWebhook(body1);
  check('signed webhook is accepted (200, created: 1)', ok.status === 200 && ok.json?.created === 1, ok);
  let leadsA = await leadsOf(orgA.id);
  check('exactly one lead in Org Alpha', leadsA.length === 1, leadsA.length);
  const l1 = leadsA[0] || {};
  check('lead fields mapped (company, email, E.164 phone, city)', l1.companyName === 'Rao Steels' && l1.email === 'asha@example.com' && l1.phone === '+919876543210' && l1.city === 'Pune', l1);
  check('lead source = META_ADS, status NEW, metaLeadId stored', l1.source === 'META_ADS' && l1.status === 'NEW' && l1.metaLeadId === 'L-1', l1);
  const a = l1.metaAttribution || {};
  check('campaign / ad set / ad / form ids + names stored', a.campaignId === 'camp-1' && a.campaignName === 'Diwali Leads' && a.adsetId === 'adset-1' && a.adId === 'ad-1' && a.formId === FORM_A && a.formName === 'Diwali enquiry' && a.pageId === PAGE_A, a);
  check('mapped "budget" answer went to the description (per-form mapping)', /5L/.test(l1.description || ''), l1.description);
  const c1s = await es.findMany(CONTACT, { filters: { organization: orgA.id, leadCompany: { id: l1.id } }, limit: 10 });
  check('contact created and linked (Asha / Rao, source META_ADS)', c1s.length === 1 && c1s[0].firstName === 'Asha' && c1s[0].lastName === 'Rao' && c1s[0].email === 'asha@example.com' && c1s[0].source === 'META_ADS', c1s.length ? c1s : 'no contact');
  const acts1 = await es.findMany(ACTIVITY, { filters: { organization: orgA.id, leadCompany: l1.id }, limit: 10 });
  check('activity logged on the lead', acts1.some((x) => /Meta Lead Ads/.test(x.summary) && x.action === 'create'), acts1.map((x) => x.summary));
  check('lead assigned (falls back to the user who connected)', l1.assignedTo?.id === user.id, l1.assignedTo);
  check('Graph called with the Page token + appsecret_proof', graphCalls.some((c) => c.path.endsWith('/L-1') && c.token === PAGE_TOKEN_A && c.proof));

  // 4. Retry of the same delivery
  const again = await postWebhook(body1);
  check('same Meta lead delivered again → duplicate, no new lead', again.json?.duplicate === 1 && (await leadsOf(orgA.id)).length === 1, again.json);

  // 5. Concurrent duplicate deliveries
  const body5 = payloadFor(PAGE_A, 'L-5', FORM_A);
  const [c1, c2] = await Promise.all([postWebhook(body5), postWebhook(body5)]);
  const l5 = (await leadsOf(orgA.id)).filter((x) => x.metaLeadId === 'L-5');
  check('two simultaneous deliveries of one lead → exactly one lead', l5.length === 1, { c1: c1.json, c2: c2.json, count: l5.length });

  // 6. Same person, new Meta lead id
  const body2 = payloadFor(PAGE_A, 'L-2', FORM_A);
  const m = await postWebhook(body2);
  leadsA = await leadsOf(orgA.id);
  check('same phone from a new form fill → matched, no second lead', m.json?.matched === 1 && leadsA.length === 2, { res: m.json, count: leadsA.length });
  const acts2 = await es.findMany(ACTIVITY, { filters: { organization: orgA.id, leadCompany: l1.id }, limit: 10 });
  check('…and an activity was logged on the existing lead', acts2.some((x) => /existing lead/.test(x.summary) && /L-2/.test(x.summary)), acts2.map((x) => x.summary));
  await postWebhook(body2);
  const acts3 = await es.findMany(ACTIVITY, { filters: { organization: orgA.id, leadCompany: l1.id }, limit: 10 });
  check('…retrying that delivery does not log it twice', acts3.length === acts2.length, { before: acts2.length, after: acts3.length });

  // 7. Form not enabled
  const off = await postWebhook(payloadFor(PAGE_A, 'L-3', FORM_A_OFF));
  check('lead from a form that is switched off is skipped', off.json?.skipped === 1 && (await leadsOf(orgA.id)).length === 2, off.json);

  // 8. Unknown page
  const unknown = await postWebhook(payloadFor('999999', 'L-9', '1'));
  check('lead for a Page no org connected is skipped', unknown.status === 200 && unknown.json?.skipped === 1, unknown.json);

  // 9. Tenant routing
  const b = await postWebhook(payloadFor(PAGE_B, 'L-4', FORM_B));
  const leadsB = await leadsOf(orgB.id);
  check("Org Beta's Page creates the lead in Org Beta only", b.json?.created === 1 && leadsB.length === 1 && leadsB[0].metaLeadId === 'L-4' && (await leadsOf(orgA.id)).every((x) => x.metaLeadId !== 'L-4'), { res: b.json, b: leadsB.length });

  // 10. Settings API never exposes tokens
  const jwt = require('jsonwebtoken').sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '10m' });
  const st = await fetch(`${BASE}/crm-meta/connection`, { headers: { Authorization: `Bearer ${jwt}`, 'X-Organization-Id': String(orgA.id) } });
  const stText = await st.text();
  check('GET /crm-meta/connection works for a member', st.status === 200 && JSON.parse(stText).data?.page?.id === PAGE_A, stText.slice(0, 300));
  check('…and contains no token (encrypted or plain)', !/TOKEN|Enc"|v1:/.test(stText), stText.slice(0, 300));
  const anon = await fetch(`${BASE}/crm-meta/connection`);
  check('settings API requires sign-in', anon.status === 401);
  const rawRow = (await es.findMany('api::crm-meta-connection.crm-meta-connection', { filters: { organization: orgA.id }, limit: 1 }))[0];
  check('tokens are encrypted at rest', rawRow.pageTokenEnc && !rawRow.pageTokenEnc.includes(PAGE_TOKEN_A) && rawRow.leadsCaptured === 2, { leadsCaptured: rawRow.leadsCaptured });

  // 11. Backfill: imports the missed lead, skips the one we already have
  const bf = await fetch(`${BASE}/crm-meta/backfill`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'X-Organization-Id': String(orgA.id), 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { days: 7 } }),
  });
  const bfJson = await bf.json().catch(() => null);
  const leadsAfter = await leadsOf(orgA.id);
  check('backfill imports the missed lead and skips the duplicate', bf.status === 200 && bfJson?.data?.created === 1 && bfJson?.data?.duplicate === 1 && leadsAfter.some((x) => x.metaLeadId === 'L-6' && x.metaAttribution?.capturedVia === 'backfill'), { status: bf.status, body: bfJson });
  check('Org Alpha ends with exactly 3 leads (L-1, L-5, L-6)', leadsAfter.length === 3, leadsAfter.map((x) => x.metaLeadId));

  await app.destroy();
}

main()
  .catch((err) => {
    console.error(err);
    results.push({ name: 'run', ok: false });
  })
  .finally(() => {
    graphServer.close();
    try {
      fs.rmSync(TMP_DIR, { recursive: true, force: true });
    } catch (_) {
      /* ignore */
    }
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n${results.length - failed}/${results.length} checks passed`);
    process.exit(failed ? 1 : 0);
  });
