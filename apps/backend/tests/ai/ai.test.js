'use strict';

/**
 * Fudge AI foundation (P5) against a real Strapi on a throwaway SQLite database, with a mocked
 * model provider (no API key needed).   npm run test:ai   (from apps/backend)
 *
 * Covers: lead scoring through the package with credit metering, stored score + reasons, audit row
 * with the AI as actor, undo, permission checks as the acting user, credits exhausted (402 + upgrade
 * link) before the provider is called, the outbound approval queue (approve / reject / double
 * approve), usage for Apps & billing, business memory search and the AI_ENABLED gate.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-ai-${process.pid}-${Date.now()}.db`;
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
for (const k of ['RESEND_API_KEY', 'REDIS_URL', 'ANTHROPIC_API_KEY', 'AI_EMBEDDINGS_PROVIDER', 'AI_CREDIT_USD', 'AI_MIN_CREDITS_PER_CALL']) delete process.env[k];

let app;
let base;
const ids = {};

const mailLog = [];
const realLog = console.log;
console.log = (...args) => {
  const line = args.join(' ');
  if (line.includes('mail not sent')) mailLog.push(line);
  else if (process.env.TEST_VERBOSE) realLog(...args);
};

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
    /* empty */
  }
  return { status: res.status, body: json };
}

const create = (uid, data) => app.entityService.create(uid, { data });
const as = (key) => ({ token: ids[`jwt${key}`], org: ids[`org${key[0]}`] });

let provider;
let usageRows;

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const ctx = await compileStrapi();
  app = await createStrapi(ctx).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  // Same module instance Strapi uses: swap in a mock we can inspect.
  const { createMockProvider } = require('@webfudge/ai');
  const { mockRespond } = require('../../src/utils/ai/mock-responder');
  provider = createMockProvider({ respond: mockRespond });
  require('../../src/utils/ai').setProvider(provider);

  const { addMember } = require('../../src/utils/saas-org');
  const [crmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'crm' }, limit: 1 });
  assert.ok(crmApp, 'SaaS catalog seeded the crm app');

  const plans = { A: 'standard', B: 'free' }; // Grow Pro (100 AI credits by default) vs Free (0)
  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org ${key}`, slug: `ai-org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', {
      organization: org.id,
      app: crmApp.id,
      status: 'active',
      planCode: plans[key],
      startDate: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
      totalUsers: 5,
    });
  }
  const user = async (key, orgKey, role, customPermissions) => {
    const u = await app.plugin('users-permissions').service('user').add({
      username: `ai${key}${Date.now()}`,
      email: `ai-${key.toLowerCase()}@team.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
    const m = await addMember(app, { orgId: ids[`org${orgKey}`], userId: u.id, role });
    if (customPermissions) await app.entityService.update('api::organization-user.organization-user', m.id, { data: { customPermissions } });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  };
  await user('A', 'A', 'Admin');
  await user('Ar', 'A', 'Member', { crm: { modules: { leads: { access: 'read' } } } }); // read-only on leads
  await user('B', 'B', 'Admin');

  const lead = async (org, data) => (await create('api::lead-company.lead-company', { organization: org, status: 'NEW', ...data })).id;
  ids.leadA = await lead(ids.orgA, { companyName: 'Acme Steel', industry: 'Manufacturing', email: 'buy@acme.test', phone: '+91 98765 43210', city: 'Pune', notes: 'Asked for GST invoices and bulk pricing.' });
  ids.leadA2 = await lead(ids.orgA, { companyName: 'Globex Foods', email: 'hello@globex.test' });
  ids.leadB = await lead(ids.orgB, { companyName: 'Initech', email: 'x@initech.test' });

  usageRows = async (org) => app.entityService.findMany('api::ai.ai-usage', { filters: { organization: org }, limit: 500 });
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

test('lead scoring runs through the package, is metered and stores score + reasons on the lead', async () => {
  const before = provider.calls.length;
  const res = await api('POST', `/lead-companies/${ids.leadA}/ai-score`, as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.equal(d.score, 75); // mock: email + phone
  assert.equal(d.label, 'hot');
  assert.ok(d.reasons.length >= 1);
  assert.ok(d.nextStep);
  assert.equal(d.model, 'claude-haiku-5-5'); // cheap tier
  assert.equal(d.creditsUsed, 1);
  assert.equal(d.credits.allowance, 100);
  assert.equal(d.credits.used, 1);
  assert.equal(d.undoable, true);

  const call = provider.calls[before];
  assert.equal(call.model, 'claude-haiku-5-5');
  assert.ok(call.jsonSchema.properties.score, 'structured output schema sent to the provider');
  assert.match(call.system, /score how likely a lead/);

  const lead = await app.entityService.findOne('api::lead-company.lead-company', ids.leadA);
  assert.equal(lead.aiScore, 75);
  assert.equal(lead.aiScoreLabel, 'hot');
  assert.ok(Array.isArray(lead.aiScoreReasons.reasons));
  assert.ok(lead.aiScoredAt);

  const usage = await usageRows(ids.orgA);
  assert.equal(usage.length, 1);
  assert.equal(usage[0].feature, 'grow.lead_score');
  assert.equal(usage[0].model, 'claude-haiku-5-5');
  assert.equal(usage[0].credits, 1);
  assert.ok(usage[0].inputTokens > 0 && usage[0].outputTokens > 0);
  ids.scoreActionId = d.actionId;
});

test('the AI action is in the audit log with the AI as actor, on the lead timeline', async () => {
  const rows = await app.entityService.findMany('api::crm-activity.crm-activity', {
    filters: { organization: ids.orgA, subjectType: 'lead_company', subjectId: ids.leadA },
    populate: { actor: { fields: ['id'] }, leadCompany: { fields: ['id'] } },
  });
  const aiRow = rows.find((r) => r.meta?.actorType === 'ai');
  assert.ok(aiRow, 'audit row written');
  assert.match(aiRow.summary, /^Fudge AI: Scored lead "Acme Steel" at 75\/100/);
  assert.equal(aiRow.meta.actorLabel, 'Fudge AI');
  assert.equal(aiRow.meta.onBehalfOfUserId, ids.userA);
  assert.equal(aiRow.meta.aiActionId, ids.scoreActionId);
  assert.equal(aiRow.actor.id, ids.userA);
  assert.equal(aiRow.leadCompany.id, ids.leadA);
});

test('Hindi output: the language instruction reaches the model and is saved', async () => {
  const before = provider.calls.length;
  const res = await api('POST', `/lead-companies/${ids.leadA2}/ai-score`, { ...as('A'), body: { language: 'hi' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.language, 'hi');
  const prompt = provider.calls[before].messages[0].content;
  assert.match(prompt, /Output language: Hindi/);
  assert.match(prompt, /Devanagari/);
});

test('undo restores the previous score and is audited', async () => {
  const res = await api('POST', `/ai/actions/${ids.scoreActionId}/undo`, as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.status, 'undone');
  const lead = await app.entityService.findOne('api::lead-company.lead-company', ids.leadA);
  assert.equal(lead.aiScore, null);
  const again = await api('POST', `/ai/actions/${ids.scoreActionId}/undo`, as('A'));
  assert.equal(again.status, 409);
  const audit = await app.entityService.findMany('api::crm-activity.crm-activity', { filters: { organization: ids.orgA, summary: { $startsWith: 'Undid AI action' } } });
  assert.equal(audit.length, 1);
});

test('actions are permission-checked as the acting user before any credits are spent', async () => {
  const usageBefore = (await usageRows(ids.orgA)).length;
  const callsBefore = provider.calls.length;
  const res = await api('POST', `/lead-companies/${ids.leadA}/ai-score`, as('Ar'));
  assert.equal(res.status, 403, JSON.stringify(res.body));
  assert.equal(res.body.error.details.code, 'AI_ACTION_FORBIDDEN');
  assert.equal(provider.calls.length, callsBefore);
  assert.equal((await usageRows(ids.orgA)).length, usageBefore);
  // Another org's lead is not found.
  const cross = await api('POST', `/lead-companies/${ids.leadB}/ai-score`, as('A'));
  assert.equal(cross.status, 404);
});

test('Free plan (0 credits): 402 with upgrade link, provider never called', async () => {
  const callsBefore = provider.calls.length;
  const res = await api('POST', `/lead-companies/${ids.leadB}/ai-score`, as('B'));
  assert.equal(res.status, 402, JSON.stringify(res.body));
  assert.equal(res.body.error.name, 'PlanLimitError');
  assert.equal(res.body.error.details.code, 'AI_CREDITS_EXHAUSTED');
  assert.equal(res.body.error.details.app, 'crm');
  assert.match(res.body.error.details.upgradeUrl, /\/billing\?app=crm$/);
  assert.match(res.body.error.message, /not included in your current plan/);
  assert.equal(provider.calls.length, callsBefore);
});

test('outbound: a drafted email goes to the approval queue, not out', async () => {
  mailLog.length = 0;
  const res = await api('POST', `/lead-companies/${ids.leadA}/ai-followup`, { ...as('A'), body: { goal: 'book a demo' } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.status, 'pending_approval');
  assert.equal(res.body.data.input.to, 'buy@acme.test');
  assert.equal(mailLog.length, 0, 'nothing sent yet');
  ids.draftId = res.body.data.id;

  const usage = await usageRows(ids.orgA);
  const draftUsage = usage.find((u) => u.feature === 'grow.followup_email');
  assert.equal(draftUsage.model, 'claude-sonnet-5-5'); // strong tier for drafting

  const queue = await api('GET', '/ai/actions', as('A'));
  assert.equal(queue.status, 200);
  assert.ok(queue.body.data.some((a) => a.id === ids.draftId && a.outbound && a.input.subject));

  // The read-only member sees only their own items (none) and cannot approve.
  const readerQueue = await api('GET', '/ai/actions', as('Ar'));
  assert.equal(readerQueue.body.data.length, 0);
  const denied = await api('POST', `/ai/actions/${ids.draftId}/approve`, as('Ar'));
  assert.equal(denied.status, 403);
  // Another organization cannot touch it.
  const cross = await api('POST', `/ai/actions/${ids.draftId}/approve`, as('B'));
  assert.equal(cross.status, 404);
});

test('approve sends once (as the approver); a second approve is a conflict', async () => {
  mailLog.length = 0;
  const res = await api('POST', `/ai/actions/${ids.draftId}/approve`, as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.status, 'executed');
  assert.equal(res.body.data.decidedBy.id, ids.userA);
  assert.equal(mailLog.length, 1);
  assert.match(mailLog[0], /To: buy@acme\.test/);
  const again = await api('POST', `/ai/actions/${ids.draftId}/approve`, as('A'));
  assert.equal(again.status, 409);
  assert.equal(mailLog.length, 1);
  const audit = await app.entityService.findMany('api::crm-activity.crm-activity', { filters: { organization: ids.orgA, summary: { $startsWith: 'Approved and sent' } } });
  assert.equal(audit.length, 1);
});

test('reject never sends', async () => {
  mailLog.length = 0;
  const draft = await api('POST', `/lead-companies/${ids.leadA2}/ai-followup`, as('A'));
  assert.equal(draft.status, 201);
  const res = await api('POST', `/ai/actions/${draft.body.data.id}/reject`, { ...as('A'), body: { reason: 'Too pushy' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'rejected');
  assert.equal(res.body.data.error, 'Too pushy');
  assert.equal(mailLog.length, 0);
});

test('usage for Apps & billing: allowance, used and per-feature breakdown', async () => {
  const res = await api('GET', '/ai/usage', as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const u = res.body.data;
  assert.equal(u.enabled, true);
  assert.equal(u.allowance, 100);
  assert.match(u.period, /^\d{4}-\d{2}$/);
  assert.match(u.resetsOn, /^\d{4}-\d{2}-01$/);
  const byFeature = Object.fromEntries(u.byFeature.map((f) => [f.feature, f]));
  assert.equal(byFeature['grow.lead_score'].calls, 2);
  assert.equal(byFeature['grow.followup_email'].calls, 2);
  assert.equal(u.used, u.byFeature.reduce((s, f) => s + f.credits, 0));
  assert.equal(u.remaining, 100 - u.used);
  assert.equal(u.costUsd, undefined, 'our USD cost is not shown to customers');
});

test('business memory: scored leads are indexed and searchable within the org', async () => {
  const res = await api('POST', '/ai/memory/search', { ...as('A'), body: { query: 'GST invoices bulk pricing' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data[0].sourceType, 'lead_company');
  assert.equal(res.body.data[0].sourceId, String(ids.leadA));
  const other = await api('POST', '/ai/memory/search', { ...as('B'), body: { query: 'GST invoices bulk pricing' } });
  assert.equal(other.status, 200);
  assert.ok(other.body.data.every((h) => h.sourceId !== String(ids.leadA)));
  const reader = await api('POST', '/ai/memory/search', { ...as('Ar'), body: { query: 'GST' } });
  assert.equal(reader.status, 403);
});

test('credits used up: the next call is blocked with 402 before reaching the provider', async () => {
  const status = await require('../../src/utils/ai').creditStatus(app, ids.orgA);
  await create('api::ai.ai-usage', { organization: ids.orgA, orgKey: ids.orgA, period: status.period, feature: 'grow.test_fill', credits: status.remaining, status: 'ok' });
  const callsBefore = provider.calls.length;
  const res = await api('POST', `/lead-companies/${ids.leadA}/ai-score`, as('A'));
  assert.equal(res.status, 402, JSON.stringify(res.body));
  assert.equal(res.body.error.details.code, 'AI_CREDITS_EXHAUSTED');
  assert.equal(res.body.error.details.allowance, 100);
  assert.equal(res.body.error.details.used, 100);
  assert.match(res.body.error.message, /used all 100 AI credits/);
  assert.equal(provider.calls.length, callsBefore);
  // Next month starts from zero (credits are counted per period).
  const usage = await usageRows(ids.orgA);
  assert.ok(usage.every((r) => r.period === status.period));
});

test('AI_ENABLED gate: switched off means 403 AI_DISABLED and usage reports disabled', async () => {
  process.env.AI_ENABLED = 'false';
  try {
    const res = await api('POST', `/lead-companies/${ids.leadA}/ai-score`, as('A'));
    assert.equal(res.status, 403);
    assert.equal(res.body.error.details.code, 'AI_DISABLED');
    const usage = await api('GET', '/ai/usage', as('A'));
    assert.deepEqual(usage.body.data, { enabled: false });
  } finally {
    process.env.AI_ENABLED = 'true';
  }
  // Internal mode never enables AI, whatever AI_ENABLED says.
  process.env.PLATFORM_MODE = 'internal';
  try {
    assert.equal(require('../../src/utils/ai').aiEnabled(), false);
  } finally {
    process.env.PLATFORM_MODE = 'saas';
  }
});
