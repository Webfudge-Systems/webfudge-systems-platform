'use strict';

/**
 * W17 Status Reporter against a real Strapi on a throwaway SQLite database with a mocked model
 * provider (no API key).   npm run test:ai   (from apps/backend)
 *
 * Covers: drafting from real task activity (done / in progress / blocked / next week), client vs
 * internal versions and recipients, metering, both versions queued as outbound AI actions, editing a
 * draft keeps the queued action in step, one-click send by email, WhatsApp refused as not available,
 * permissions, the Business plan gate, the Friday run and approving from the shared AI queue.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-status-reports-${process.pid}-${Date.now()}.db`;
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
  WEEKLY_STATUS_CRON: 'off',
});
for (const k of ['RESEND_API_KEY', 'REDIS_URL', 'ANTHROPIC_API_KEY', 'AI_EMBEDDINGS_PROVIDER', 'AI_CREDIT_USD', 'AI_MIN_CREDITS_PER_CALL']) delete process.env[k];

let app;
let base;
let provider;
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
const HOUR = 3600 * 1000;

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
  const [pmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'pm' }, limit: 1 });
  assert.ok(pmApp, 'SaaS catalog seeded the pm app');

  const plans = { A: 'professional', B: 'standard' }; // Work Business (has the Status Reporter) vs Pro
  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Agency ${key}`, slug: `sr-org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', {
      organization: org.id,
      app: pmApp.id,
      status: 'active',
      planCode: plans[key],
      startDate: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
      totalUsers: 5,
    });
  }
  const user = async (key, orgKey, role, customPermissions) => {
    const u = await app.plugin('users-permissions').service('user').add({
      username: `sr${key}${Date.now()}`,
      email: `sr-${key.toLowerCase()}@team.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
      firstName: `Person${key}`,
    });
    const m = await addMember(app, { orgId: ids[`org${orgKey}`], userId: u.id, role });
    if (customPermissions) await app.entityService.update('api::organization-user.organization-user', m.id, { data: { customPermissions } });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  };
  await user('A', 'A', 'Admin');
  await user('Am', 'A', 'Member', { pm: { modules: { projects: { access: 'read' }, tasks: { access: 'read' } } } });
  await user('B', 'B', 'Admin');

  const client = await create('api::client-account.client-account', { companyName: 'Acme Retail', organization: ids.orgA });
  await create('api::contact.contact', { firstName: 'Priya', lastName: 'Shah', email: 'priya@acme.test', portalAccess: true, clientAccount: client.id, organization: ids.orgA });
  await create('api::contact.contact', { firstName: 'Ravi', lastName: 'Patil', email: 'ravi@acme.test', portalAccess: false, clientAccount: client.id, organization: ids.orgA });

  const project = await create('api::project.project', {
    name: 'Acme Website Revamp',
    status: 'ACTIVE',
    organization: ids.orgA,
    clientAccount: client.id,
    projectManager: ids.userA,
    teamMembers: [ids.userAm],
  });
  ids.projectA = project.id;

  const { reportPeriod } = require('../../src/utils/status-reports');
  const p = reportPeriod();
  const task = (data) => create('api::task.task', { organization: ids.orgA, projects: [ids.projectA], priority: 'medium', ...data });
  await task({ name: 'Homepage design signed off', status: 'COMPLETED', completedAt: new Date(Date.now() - 60 * 1000), clientVisible: true });
  await task({ name: 'Old logo cleanup', status: 'COMPLETED', completedAt: new Date(p.start.getTime() - 3 * 864e5) }); // last week
  await task({ name: 'Product page build', status: 'IN_PROGRESS', clientVisible: true });
  await task({ name: 'Payment gateway integration', status: 'IN_PROGRESS', scheduledDate: new Date(Date.now() - 48 * HOUR) }); // overdue
  await task({ name: 'Launch checklist', status: 'SCHEDULED', scheduledDate: new Date(p.nextStart.getTime() + 36 * HOUR), clientVisible: true });

  const p2 = await create('api::project.project', { name: 'Acme SEO Retainer', status: 'ACTIVE', organization: ids.orgA, projectManager: ids.userA });
  ids.projectA2 = p2.id;
  await create('api::task.task', { organization: ids.orgA, projects: [p2.id], name: 'Keyword research', status: 'IN_PROGRESS' });
  const done = await create('api::project.project', { name: 'Finished thing', status: 'COMPLETED', organization: ids.orgA });
  await create('api::task.task', { organization: ids.orgA, projects: [done.id], name: 'x', status: 'COMPLETED' });

  const pB = await create('api::project.project', { name: 'B project', status: 'ACTIVE', organization: ids.orgB });
  ids.projectB = pB.id;
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

test('writes a draft from real task activity, with client and internal versions queued for approval', async () => {
  const before = provider.calls.length;
  const res = await api('POST', '/status-reports/generate', { ...as('A'), body: { projectId: ids.projectA } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const r = res.body.data;
  ids.reportA = r.id;
  assert.equal(r.status, 'draft');
  assert.equal(r.source, 'manual');
  assert.equal(r.health, 'at_risk'); // the overdue task
  assert.equal(r.canSend, true);
  assert.deepEqual(r.versions.client.recipients, ['priya@acme.test'], 'client version goes to portal contacts');
  assert.deepEqual(r.versions.internal.recipients.sort(), ['sr-a@team.test', 'sr-am@team.test']);
  assert.equal(r.versions.client.state, 'pending');
  assert.equal(r.versions.internal.state, 'pending');
  assert.match(r.versions.client.subject, /Acme Website Revamp/);
  assert.match(r.versions.client.body, /Homepage design signed off/);
  assert.doesNotMatch(r.versions.client.body, /Old logo cleanup/, 'last week is not this week');
  assert.match(r.versions.internal.subject, /^\[Internal\]/);
  assert.match(r.versions.internal.body, /Blocked\n- Payment gateway integration/);
  assert.match(r.versions.internal.body, /Next week\n- Launch checklist/);
  assert.equal(r.creditsUsed, 1);

  const call = provider.calls[before];
  assert.equal(call.model, 'claude-sonnet-5-5', 'draft task routes to the strong tier');
  assert.match(call.system, /Status Reporter teammate/);
  assert.ok(call.jsonSchema.properties.internal && call.jsonSchema.properties.client);
  const prompt = call.messages[0].content;
  assert.match(prompt, /"overdue": true/);
  assert.match(prompt, /"clientVisibleTasksExist": true/);

  const usage = await app.entityService.findMany('api::ai.ai-usage', { filters: { organization: ids.orgA } });
  assert.equal(usage.length, 1);
  assert.equal(usage[0].feature, 'work.weekly_status');
  assert.equal(usage[0].app, 'pm');

  const queue = await api('GET', '/ai/actions?app=pm', as('A'));
  assert.equal(queue.status, 200);
  const mine = queue.body.data.filter((a) => a.actionKey === 'work.status_report.send');
  assert.equal(mine.length, 2);
  assert.ok(mine.every((a) => a.outbound && a.status === 'pending_approval'));
});

test('editing the draft keeps the queued action (what gets sent) in step', async () => {
  const res = await api('PUT', `/status-reports/${ids.reportA}`, {
    ...as('A'),
    body: { client: { body: 'Hello,\n\nEdited by the PM.\n\nRegards', recipients: 'priya@acme.test, not-an-email, ops@acme.test' } },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.versions.client.recipients, ['priya@acme.test', 'ops@acme.test']);
  const action = await app.entityService.findOne('api::ai.ai-action', res.body.data.versions.client.actionId);
  assert.equal(action.input.body, 'Hello,\n\nEdited by the PM.\n\nRegards');
  assert.equal(action.input.to, 'priya@acme.test, ops@acme.test');
});

test('WhatsApp is listed but refused until Fudge Connect ships', async () => {
  const ch = await api('GET', '/status-reports/channels', as('A'));
  assert.equal(ch.status, 200);
  const wa = ch.body.data.find((c) => c.key === 'whatsapp');
  assert.equal(wa.available, false);
  assert.match(wa.reason, /Fudge Connect/);
  const res = await api('POST', `/status-reports/${ids.reportA}/send`, { ...as('A'), body: { audience: 'client', channel: 'whatsapp' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.details.code, 'CHANNEL_UNAVAILABLE');
});

test('a member who is not the PM cannot send', async () => {
  const res = await api('POST', `/status-reports/${ids.reportA}/send`, { ...as('Am'), body: { audience: 'client' } });
  assert.equal(res.status, 403, JSON.stringify(res.body));
});

test('one click sends the client version by email, once', async () => {
  mailLog.length = 0;
  const res = await api('POST', `/status-reports/${ids.reportA}/send`, { ...as('A'), body: { audience: 'client' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const r = res.body.data;
  assert.equal(r.versions.client.state, 'sent');
  assert.equal(r.versions.internal.state, 'pending');
  assert.equal(r.status, 'partially_sent');
  assert.equal(r.versions.client.delivered, false, 'no RESEND_API_KEY in tests: not claimed as delivered');
  assert.match(r.versions.client.deliveryNote, /not configured/);
  assert.equal(mailLog.length, 2, 'one message per recipient');
  assert.ok(mailLog.some((l) => l.includes('To: priya@acme.test') && l.includes('Edited by the PM.')));

  const action = await app.entityService.findOne('api::ai.ai-action', r.versions.client.actionId, { populate: { decidedBy: true } });
  assert.equal(action.status, 'executed');
  assert.equal(action.decidedBy.id, ids.userA);
  const audit = await app.entityService.findMany('api::crm-activity.crm-activity', { filters: { organization: ids.orgA, subjectType: 'project', subjectId: ids.projectA } });
  assert.ok(audit.some((a) => a.meta?.actorType === 'ai' && a.meta?.event === 'approved'));

  const again = await api('POST', `/status-reports/${ids.reportA}/send`, { ...as('A'), body: { audience: 'client' } });
  assert.equal(again.status, 409);
  assert.equal(again.body.error.details.code, 'VERSION_SENT');

  const regen = await api('POST', '/status-reports/generate', { ...as('A'), body: { projectId: ids.projectA } });
  assert.equal(regen.status, 409);
  assert.equal(regen.body.error.details.code, 'REPORT_ALREADY_SENT');
});

test('the Status Reporter is a Business feature', async () => {
  const res = await api('POST', '/status-reports/generate', { ...as('B'), body: { projectId: ids.projectB } });
  assert.equal(res.status, 402);
  assert.equal(res.body.error.details.code, 'PLAN_FEATURE_REQUIRED');
  assert.equal(res.body.error.details.feature, 'pm.ai_teammates');
});

test('the Friday run drafts every other active project with tasks, and the AI queue approves it', async () => {
  const { runWeeklyDrafts } = require('../../src/utils/status-reports');
  const counts = await runWeeklyDrafts(app);
  assert.equal(counts.orgs, 1, 'only the Business org');
  assert.equal(counts.created, 1, 'project 2 only: project 1 already has one and the completed project is skipped');

  const list = await api('GET', `/status-reports?projectId=${ids.projectA2}`, as('A'));
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 1);
  const r = list.body.data[0];
  assert.equal(r.source, 'scheduled');
  assert.equal(r.versions.client.state, 'no_recipients', 'no client account: nothing queued for a client');
  assert.equal(r.versions.internal.state, 'pending');

  const again = await runWeeklyDrafts(app);
  assert.equal(again.created, 0, 'idempotent within the week');

  const approve = await api('POST', `/ai/actions/${r.versions.internal.actionId}/approve`, as('A'));
  assert.equal(approve.status, 200, JSON.stringify(approve.body));
  const after = await api('GET', `/status-reports/${r.id}`, as('A'));
  assert.equal(after.body.data.versions.internal.state, 'sent');
  assert.equal(after.body.data.status, 'sent');
});

test('nothing works with AI switched off', async () => {
  process.env.AI_ENABLED = 'false';
  try {
    const res = await api('POST', '/status-reports/generate', { ...as('A'), body: { projectId: ids.projectA2 } });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.details.code, 'AI_DISABLED');
  } finally {
    process.env.AI_ENABLED = 'true';
  }
});
