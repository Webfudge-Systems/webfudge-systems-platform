'use strict';

/**
 * W20 smart triage + meeting → tasks over HTTP: real Strapi on a throwaway SQLite database, mocked
 * model provider (no API key). Covers the inbox, suggest → apply (+ undo), meeting extract → create
 * tasks linked to the meeting/project, org isolation and the AI gate.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-triage-${process.pid}-${Date.now()}.db`;
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
  assert.ok(pmApp, 'SaaS catalog seeded the pm app');
  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org ${key}`, slug: `triage-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', {
      organization: org.id,
      app: pmApp.id,
      status: 'active',
      planCode: 'standard',
      startDate: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
      totalUsers: 5,
    });
  }
  const user = async (key, orgKey, role, firstName) => {
    const u = await app.plugin('users-permissions').service('user').add({
      username: `tri${key}${Date.now()}`,
      email: `tri-${key.toLowerCase()}@team.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
      firstName,
    });
    await addMember(app, { orgId: ids[`org${orgKey}`], userId: u.id, role });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  };
  await user('A', 'A', 'Admin', 'Asha');
  await user('A2', 'A', 'Member', 'Vikram');
  await user('B', 'B', 'Admin', 'Bea');

  ids.project = (await create('api::project.project', { name: 'Website', organization: ids.orgA })).id;
  ids.task = (await create('api::task.task', { name: 'Fix login bug', status: 'SCHEDULED', organization: ids.orgA, projects: [ids.project] })).id;
  ids.assigned = (await create('api::task.task', { name: 'Already owned', status: 'SCHEDULED', organization: ids.orgA, assignee: ids.userA })).id;
  ids.meeting = (await create('api::meeting.meeting', { title: 'Kickoff', startTime: new Date(), organization: ids.orgA, notes: 'Vikram to send the revised quote\nBudget discussed' })).id;
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

test('inbox lists open unassigned tasks of the org only', async () => {
  const res = await api('GET', '/smart-triage/tasks', as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const names = res.body.data.map((t) => t.name);
  assert.ok(names.includes('Fix login bug'));
  assert.ok(!names.includes('Already owned'));
  const other = await api('GET', '/smart-triage/tasks', as('B'));
  assert.equal(other.body.data.length, 0);
});

test('suggest returns validated suggestions with the team, then apply assigns and undo restores', async () => {
  const res = await api('POST', '/smart-triage/suggest', { ...as('A'), body: { taskIds: [ids.task] } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const s = res.body.data.suggestions[0];
  assert.equal(s.taskId, ids.task);
  assert.ok(['low', 'medium', 'high'].includes(s.priority));
  assert.ok(res.body.data.team.some((m) => m.name === 'Vikram'));

  const applied = await api('POST', '/smart-triage/apply', { ...as('A'), body: { items: [{ taskId: ids.task, priority: 'high', assigneeId: ids.userA2, scheduledDate: s.scheduledDate }] } });
  assert.equal(applied.status, 200, JSON.stringify(applied.body));
  assert.equal(applied.body.data.applied, 1);
  let task = await app.entityService.findOne('api::task.task', ids.task, { populate: { assignee: true } });
  assert.equal(task.priority, 'high');
  assert.equal(task.assignee.id, ids.userA2);

  const undo = await api('POST', `/ai/actions/${applied.body.data.results[0].actionId}/undo`, as('A'));
  assert.equal(undo.status, 200, JSON.stringify(undo.body));
  task = await app.entityService.findOne('api::task.task', ids.task, { populate: { assignee: true } });
  assert.equal(task.assignee, null);
});

test('apply refuses a task or assignee from another organization', async () => {
  const res = await api('POST', '/smart-triage/apply', { ...as('B'), body: { items: [{ taskId: ids.task, priority: 'low' }] } });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.applied, 0);
  const res2 = await api('POST', '/smart-triage/apply', { ...as('A'), body: { items: [{ taskId: ids.task, assigneeId: ids.userB }] } });
  assert.equal(res2.body.data.applied, 0);
  assert.match(res2.body.data.results[0].error, /not a member/);
});

test('meeting notes become a preview, then tasks linked to the meeting and project', async () => {
  const list = await api('GET', '/smart-triage/meetings', as('A'));
  assert.ok(list.body.data.some((m) => m.id === ids.meeting));

  const res = await api('POST', `/smart-triage/meetings/${ids.meeting}/extract`, { ...as('A'), body: {} }); // uses the saved notes
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const item = res.body.data.items[0];
  assert.match(item.title, /revised quote/);
  assert.equal(item.assigneeId, ids.userA2);

  const made = await api('POST', `/smart-triage/meetings/${ids.meeting}/tasks`, { ...as('A'), body: { projectId: ids.project, items: [item] } });
  assert.equal(made.status, 200, JSON.stringify(made.body));
  assert.equal(made.body.data.count, 1);
  const task = await app.entityService.findOne('api::task.task', made.body.data.taskIds[0], { populate: { meeting: true, projects: true, assignee: true } });
  assert.equal(task.meeting.id, ids.meeting);
  assert.equal(task.projects[0].id, ids.project);
  assert.equal(task.assignee.id, ids.userA2);
});

test('another organization cannot read or use the meeting', async () => {
  const res = await api('POST', `/smart-triage/meetings/${ids.meeting}/extract`, { ...as('B'), body: { notes: 'x to do y' } });
  assert.equal(res.status, 404);
  const made = await api('POST', `/smart-triage/meetings/${ids.meeting}/tasks`, { ...as('B'), body: { items: [{ title: 'x' }] } });
  assert.equal(made.status, 400);
});

test('AI endpoints answer 403 AI_DISABLED when AI is switched off', async () => {
  process.env.AI_ENABLED = 'false';
  try {
    const res = await api('POST', '/smart-triage/suggest', { ...as('A'), body: { taskIds: [ids.task] } });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.details.code, 'AI_DISABLED');
  } finally {
    process.env.AI_ENABLED = 'true';
  }
});
