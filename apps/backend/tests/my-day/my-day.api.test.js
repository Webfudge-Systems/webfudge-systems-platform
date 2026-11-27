'use strict';

/**
 * W21 My Day + Ask Work end to end: in-process Strapi on SQLite, AI_PROVIDER=mock.
 * Checks the planned day (meetings, dependencies, overrides) and that Ask Work answers only from
 * tasks the asking user may see (a project in a restricted workspace stays hidden from a member).
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-my-day-${process.pid}-${Date.now()}.db`;
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

const TOMORROW = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const YESTERDAY = new Date(Date.now() - 864e5).toISOString();

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
const as = (key) => ({ token: ids[`jwt${key}`], org: ids.org });
const taskIdsIn = (blocks) => blocks.filter((b) => b.kind === 'task').map((b) => b.id);

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
  const [pmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'pm' }, limit: 1 });
  const org = await create('api::organization.organization', { name: 'Org W21', slug: `w21-${Date.now()}` });
  ids.org = org.id;
  await create('api::subscription.subscription', { organization: org.id, app: pmApp.id, status: 'active', planCode: 'standard', startDate: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5), totalUsers: 5 });

  const user = async (key, role, firstName) => {
    const u = await app.plugin('users-permissions').service('user').add({ username: `w21${key}${Date.now()}`, email: `w21-${key.toLowerCase()}@team.test`, password: 'Passw0rd!x', confirmed: true, provider: 'local', firstName });
    await addMember(app, { orgId: org.id, userId: u.id, role });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  };
  await user('A', 'Admin', 'Asha');
  await user('M', 'Member', 'Riya');

  const client = await create('api::client-account.client-account', { companyName: 'Acme', organization: org.id });
  const openWs = await create('api::workspace.workspace', { name: 'Open', membersMode: 'all', organization: org.id });
  const secretWs = await create('api::workspace.workspace', { name: 'Secret', membersMode: 'restricted', organization: org.id });
  const pOpen = await create('api::project.project', { name: 'Acme website', status: 'active', organization: org.id, workspace: openWs.id, clientAccount: client.id });
  const pSecret = await create('api::project.project', { name: 'Acme acquisition', status: 'active', organization: org.id, workspace: secretWs.id, clientAccount: client.id });

  const task = async (data) => (await create('api::task.task', { organization: org.id, status: 'SCHEDULED', priority: 'medium', ...data })).id;
  ids.secret = await task({ name: 'Secret due diligence', assignee: ids.userA, projects: [pSecret.id], scheduledDate: YESTERDAY });
  ids.t2 = await task({ name: 'Fix checkout bug', assignee: ids.userM, projects: [pOpen.id], priority: 'high', estimatedHours: 2, scheduledDate: YESTERDAY });
  ids.t3 = await task({ name: 'Deploy checkout fix', assignee: ids.userM, projects: [pOpen.id], estimatedHours: 1, dependsOn: [{ taskId: ids.t2, type: 'FS', lagDays: 0 }] });
  ids.t4 = await task({ name: 'Wait on legal', assignee: ids.userM, projects: [pOpen.id], dependsOn: [{ taskId: ids.secret, type: 'FS', lagDays: 0 }] });
  await create('api::meeting.meeting', { title: 'Standup', organization: org.id, organizer: ids.userM, status: 'scheduled', startTime: `${TOMORROW}T09:00:00.000Z`, endTime: `${TOMORROW}T10:00:00.000Z` });
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

test('My Day plans meetings, dependencies and capacity for the signed-in user', async () => {
  const res = await api('GET', `/my-day?date=${TOMORROW}&tzOffset=0`, as('M'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  const meeting = d.blocks.find((b) => b.kind === 'meeting');
  assert.deepEqual([meeting.start, meeting.end], [540, 600]);
  assert.deepEqual(taskIdsIn(d.blocks), [ids.t2, ids.t3]);
  const t2 = d.blocks.find((b) => b.id === ids.t2 && b.kind === 'task');
  assert.deepEqual([t2.start, t2.end, t2.overdue], [600, 720, true]);
  assert.deepEqual(d.unscheduled, [{ id: ids.t4, reason: 'blocked', blockedBy: [ids.secret], name: 'Wait on legal' }]);
  assert.equal(d.capacityHours, 8);
  assert.equal(JSON.stringify(d).includes('Secret due diligence'), false);
});

test('overrides are saved; removing a predecessor blocks its dependent; reset restores', async () => {
  const res = await api('POST', '/my-day/plan', { ...as('M'), body: { date: TOMORROW, tzOffset: 0, overrides: { excluded: [ids.t2] } } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(taskIdsIn(res.body.data.blocks), []);
  assert.ok(res.body.data.unscheduled.some((u) => u.id === ids.t3 && u.reason === 'blocked'));

  const again = await api('GET', `/my-day?date=${TOMORROW}&tzOffset=0`, as('M'));
  assert.deepEqual(again.body.data.overrides.excluded, [ids.t2]);

  const reset = await api('POST', '/my-day/plan', { ...as('M'), body: { date: TOMORROW, tzOffset: 0, reset: true } });
  assert.deepEqual(taskIdsIn(reset.body.data.blocks), [ids.t2, ids.t3]);
});

test('Ask Work: a member only gets tasks they may see', async () => {
  const res = await api('POST', '/my-day/ask', { ...as('M'), body: { question: "What's overdue on Acme?" } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.deepEqual(d.tasks.map((t) => t.id), [ids.t2]);
  assert.equal(JSON.stringify(d).includes('Secret'), false);
  assert.deepEqual(d.toolCalls.map((c) => c.tool), ['find_tasks']);
});

test('Ask Work: an admin sees the restricted project too', async () => {
  const res = await api('POST', '/my-day/ask', { ...as('A'), body: { question: "What's overdue on Acme?" } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.tasks.map((t) => t.id).sort(), [ids.secret, ids.t2].sort());
});

test('Ask Work: what did Riya finish this week', async () => {
  await app.entityService.update('api::task.task', ids.t3, { data: { status: 'COMPLETED', completedAt: new Date() } });
  const res = await api('POST', '/my-day/ask', { ...as('A'), body: { question: 'What did Riya finish this week?' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.deepEqual(res.body.data.tasks.map((t) => t.id), [ids.t3]);
});

test('Ask Work needs a question and a signed-in user', async () => {
  assert.equal((await api('POST', '/my-day/ask', { ...as('M'), body: { question: ' ' } })).status, 400);
  assert.equal((await api('POST', '/my-day/ask', { body: { question: 'hi' } })).status, 401);
});
