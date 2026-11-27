'use strict';

/**
 * G10 AI auto-capture over HTTP: real Strapi on a throwaway SQLite database, mocked model provider.
 * Covers: a new comment triggers a (debounced) capture, suggestions + sources, accept with edit,
 * dismiss, auto-apply per org setting (fields + next-step task), undo, deals, org isolation, AI gate.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-capture-${process.pid}-${Date.now()}.db`;
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
  AI_CAPTURE_DEBOUNCE_MS: '30',
});
for (const k of ['RESEND_API_KEY', 'REDIS_URL', 'ANTHROPIC_API_KEY', 'AI_EMBEDDINGS_PROVIDER', 'AI_CREDIT_USD', 'AI_MIN_CREDITS_PER_CALL']) delete process.env[k];

let app;
let base;
const ids = {};
const realLog = console.log;
console.log = (...args) => (process.env.TEST_VERBOSE ? realLog(...args) : undefined);

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
const LEAD = 'api::lead-company.lead-company';
const comment = (leadId, text, extra = {}) =>
  create('api::crm-activity.crm-activity', { organization: ids.orgA, actor: ids.userA, action: 'comment', subjectType: 'lead_company', subjectId: leadId, leadCompany: leadId, summary: 'commented', meta: { comment: text }, ...extra });

async function waitFor(fn, ms = 4000) {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn();
    if (v) return v;
    if (Date.now() > end) return v;
    await new Promise((r) => setTimeout(r, 50));
  }
}

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
  assert.ok(crmApp, 'SaaS catalog seeded the crm app');
  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org ${key}`, slug: `capture-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', {
      organization: org.id,
      app: crmApp.id,
      status: 'active',
      planCode: 'standard',
      startDate: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
      totalUsers: 5,
    });
  }
  for (const [key, orgKey] of [['A', 'A'], ['B', 'B']]) {
    const u = await app.plugin('users-permissions').service('user').add({
      username: `cap${key}${Date.now()}`,
      email: `cap-${key.toLowerCase()}@team.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
    await addMember(app, { orgId: ids[`org${orgKey}`], userId: u.id, role: 'Admin' });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  }
  ids.lead = (await create(LEAD, { companyName: 'Sharma Traders', status: 'NEW', organization: ids.orgA, assignedTo: ids.userA })).id;
  ids.lead2 = (await create(LEAD, { companyName: 'Gupta Exports', status: 'NEW', organization: ids.orgA, assignedTo: ids.userA })).id;
  ids.deal = (await create('api::deal.deal', { name: 'Gupta website', stage: 'discovery', organization: ids.orgA, leadCompany: ids.lead2 })).id;
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const s of ['', '-wal', '-shm', '-journal']) {
    try {
      fs.unlinkSync(DB_PATH + s);
    } catch {
      /* not created */
    }
  }
});

test('a new comment triggers a capture: suggestions + sources (WhatsApp / voice not available)', async () => {
  const empty = await api('GET', `/ai-capture/lead_company/${ids.lead}`, as('A'));
  assert.equal(empty.status, 200, JSON.stringify(empty.body));
  assert.equal(empty.body.data.capture, null);
  const wa = empty.body.data.sources.find((s) => s.key === 'whatsapp');
  assert.equal(wa.available, false);

  await comment(ids.lead, 'Client ne bola budget 5 lakh hai, March tak start karna hai. Need a website with payments. Send proposal by Friday');
  const res = await waitFor(async () => {
    const r = await api('GET', `/ai-capture/lead_company/${ids.lead}`, as('A'));
    return r.body?.data?.capture ? r : null;
  });
  assert.ok(res, 'capture ran after the comment');
  const f = res.body.data.capture.fields;
  assert.equal(f.budget.amount, 500000);
  assert.equal(f.budget.status, 'pending');
  assert.match(f.timeline.text, /March/);
  assert.match(f.nextStep.title, /Send proposal/);
  const lead = await app.entityService.findOne(LEAD, ids.lead);
  assert.ok(!Number(lead.dealValue), 'suggestions only: nothing applied without auto-apply');
});

test('accept with an edit applies, logs and is undoable; dismiss hides a field', async () => {
  const res = await api('POST', `/ai-capture/lead_company/${ids.lead}/apply`, { ...as('A'), body: { fields: { budget: { amount: 600000 }, nextStep: {} } } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  let lead = await app.entityService.findOne(LEAD, ids.lead);
  assert.equal(Number(lead.dealValue), 600000);
  const tasks = await app.entityService.findMany('api::task.task', { filters: { leadCompany: ids.lead } });
  assert.equal(tasks.length, 1);
  assert.match(tasks[0].name, /Send proposal/);
  assert.equal(lead.aiCapture.fields.budget.status, 'applied');

  const logs = await app.entityService.findMany('api::crm-activity.crm-activity', { filters: { leadCompany: ids.lead, action: 'update' } });
  assert.ok(logs.some((l) => l.meta?.aiActionId === res.body.data.actionId), 'applied change is in the activity log');

  const dismissed = await api('POST', `/ai-capture/lead_company/${ids.lead}/dismiss`, { ...as('A'), body: { field: 'requirement' } });
  assert.equal(dismissed.status, 200, JSON.stringify(dismissed.body));
  assert.equal(dismissed.body.data.capture.fields.requirement.status, 'dismissed');

  const undo = await api('POST', `/ai/actions/${res.body.data.actionId}/undo`, as('A'));
  assert.equal(undo.status, 200, JSON.stringify(undo.body));
  lead = await app.entityService.findOne(LEAD, ids.lead);
  assert.ok(!Number(lead.dealValue), 'undo restored the budget');
  assert.equal(lead.aiCapture.fields.budget.status, 'pending', 'undo puts the suggestion back');
  assert.equal((await app.entityService.findMany('api::task.task', { filters: { leadCompany: ids.lead } })).length, 0);
});

test('auto-apply org setting: the lead gets budget, timeline and a next-step task without manual entry', async () => {
  const s = await api('PUT', '/ai-capture/settings', { ...as('A'), body: { autoApply: true } });
  assert.equal(s.status, 200, JSON.stringify(s.body));
  assert.equal((await api('GET', '/ai-capture/settings', as('A'))).body.data.autoApply, true);

  await create('api::meeting.meeting', { title: 'Discovery call', startTime: new Date(), organization: ids.orgA, organizer: ids.userA, leadCompany: ids.lead, notes: 'Budget around 2 lakh. Want to go live next month. Call back on Monday' });
  const lead = await waitFor(async () => {
    const l = await app.entityService.findOne(LEAD, ids.lead);
    return l.expectedTimeline && Number(l.dealValue) === 200000 ? l : null;
  });
  assert.ok(lead, 'fields applied automatically');
  const tasks = await app.entityService.findMany('api::task.task', { filters: { leadCompany: ids.lead } });
  assert.ok(tasks.some((t) => /Call back/i.test(t.name)), 'next step task created');
  await api('PUT', '/ai-capture/settings', { ...as('A'), body: { autoApply: false } });
});

test('deals: run on demand proposes a stage change and applies it', async () => {
  await create('api::crm-activity.crm-activity', { organization: ids.orgA, actor: ids.userA, action: 'comment', subjectType: 'deal', subjectId: ids.deal, leadCompany: ids.lead2, summary: 'c', meta: { comment: 'They want the proposal now, budget 50k' } });
  const res = await api('POST', `/ai-capture/deal/${ids.deal}/run`, { ...as('A'), body: {} });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.capture.fields.stage.value, 'proposal');
  const ap = await api('POST', `/ai-capture/deal/${ids.deal}/apply`, { ...as('A'), body: { fields: { stage: {}, budget: {} } } });
  assert.equal(ap.status, 200, JSON.stringify(ap.body));
  const deal = await app.entityService.findOne('api::deal.deal', ids.deal);
  assert.equal(deal.stage, 'proposal');
  assert.equal(Number(deal.value), 50000);
});

test('other organizations cannot read or apply; AI off answers 403', async () => {
  assert.equal((await api('GET', `/ai-capture/lead_company/${ids.lead}`, as('B'))).status, 404);
  assert.equal((await api('POST', `/ai-capture/lead_company/${ids.lead}/apply`, { ...as('B'), body: { fields: { budget: {} } } })).status, 404);
  process.env.AI_ENABLED = 'false';
  try {
    const res = await api('POST', `/ai-capture/lead_company/${ids.lead}/run`, { ...as('A'), body: {} });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.details.code, 'AI_DISABLED');
  } finally {
    process.env.AI_ENABLED = 'true';
  }
});
