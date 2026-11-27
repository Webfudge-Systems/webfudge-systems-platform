'use strict';

/**
 * Goals / OKRs (W12), against a real Strapi on a throwaway SQLite database.
 *   npm run test:goals   (from apps/backend)
 *
 * Checks that task-based key results follow their linked tasks (directly and through projects),
 * number / percent key results move with check-ins, and objectives stay inside their org.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-goals-${process.pid}-${Date.now()}.db`;
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

const create = (uid, data) => app.entityService.create(uid, { data });
const asA = (method, url, body) => api(method, url, { token: ids.jwtA, org: ids.orgA, body });

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const ctx = await compileStrapi();
  app = await createStrapi(ctx).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  const { addMember } = require('../src/utils/saas-org');
  const [pmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'pm' }, limit: 1 });
  assert.ok(pmApp, 'SaaS catalog seeded the pm app');

  const user = async (name) =>
    app.plugin('users-permissions').service('user').add({
      username: `${name}${Date.now()}`,
      email: `${name.toLowerCase()}@goals.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
  const jwt = (id) => app.plugin('users-permissions').service('jwt').issue({ id });

  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org ${key}`, slug: `goals-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', { organization: org.id, app: pmApp.id, status: 'active', planCode: 'free', startDate: new Date() });
    const u = await user(`Admin${key}`);
    ids[`user${key}`] = u.id;
    await addMember(app, { orgId: org.id, userId: u.id, role: 'Admin' });
    ids[`jwt${key}`] = jwt(u.id);
  }
  const member = await user('MemberA');
  ids.memberA = member.id;
  await addMember(app, { orgId: ids.orgA, userId: member.id, role: 'Member' });
  ids.jwtMember = jwt(member.id);

  const project = await create('api::project.project', { name: 'Website relaunch', organization: ids.orgA, projectManager: ids.userA });
  ids.project = project.id;
  const project2 = await create('api::project.project', { name: 'Brand refresh', organization: ids.orgA, projectManager: ids.userA });
  ids.project2 = project2.id;
  const task = async (name, projectId, extra = {}) => (await create('api::task.task', { name, organization: ids.orgA, projects: [projectId], ...extra })).id;
  ids.t1 = await task('Design homepage', ids.project);
  ids.t2 = await task('Build homepage', ids.project);
  ids.p2t1 = await task('New logo', ids.project2);
  ids.p2t2 = await task('Brand book', ids.project2);
  ids.p2cancelled = await task('Old mascot', ids.project2, { status: 'CANCELLED' });
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
});

const krByTitle = (o, title) => o.keyResults.find((k) => k.title === title);

test('pure progress helpers', () => {
  const G = require('../src/utils/goals');
  assert.equal(G.metricProgress(0, 200, 50), 25);
  assert.equal(G.metricProgress(10, 0, 5), 50, 'decreasing targets work');
  assert.equal(G.metricProgress(0, 100, 150), 100, 'clamped');
  assert.deepEqual(G.taskProgress([{ status: 'COMPLETED' }, { status: 'TODO' }, { status: 'CANCELLED' }]), { done: 1, total: 2, progress: 50 });
  assert.equal(G.objectiveProgress([{ progress: 50 }, { progress: 0 }]), 25);
});

test('create an objective with a task-based and a number key result', async () => {
  const res = await asA('POST', '/goals/objectives', {
    title: 'Launch the new website',
    periodLabel: 'Q4 2026',
    keyResults: [
      { title: 'Ship homepage tasks', metricType: 'tasks', taskIds: [ids.t1, ids.t2] },
      { title: 'Newsletter signups', metricType: 'number', startValue: 0, targetValue: 200 },
    ],
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const o = res.body.data;
  ids.objective = o.id;
  ids.krTasks = krByTitle(o, 'Ship homepage tasks').id;
  ids.krNumber = krByTitle(o, 'Newsletter signups').id;
  assert.equal(o.progress, 0);
  assert.equal(o.owner.id, ids.userA, 'owner defaults to the creator');
  const kr = krByTitle(o, 'Ship homepage tasks');
  assert.equal(kr.targetValue, 2);
  assert.equal(kr.currentValue, 0);
  assert.equal(kr.tasks.length, 2);
});

test('completing a linked task through the tasks API moves the key result and objective', async () => {
  const upd = await asA('PUT', `/tasks/${ids.t1}`, { data: { status: 'COMPLETED' } });
  assert.ok(upd.status < 300, JSON.stringify(upd.body));
  const o = (await asA('GET', `/goals/objectives/${ids.objective}`)).body.data;
  const kr = krByTitle(o, 'Ship homepage tasks');
  assert.equal(kr.progress, 50);
  assert.equal(kr.currentValue, 1);
  assert.equal(o.progress, 25, 'objective = mean of 50 and 0');

  const history = (await asA('GET', `/goals/key-results/${ids.krTasks}/check-ins`)).body.data;
  assert.equal(history[0].source, 'auto');
  assert.match(history[0].note, /1 of 2/);

  // Re-opening the task moves it back.
  await app.entityService.update('api::task.task', ids.t1, { data: { status: 'IN_PROGRESS' } });
  const again = (await asA('GET', `/goals/objectives/${ids.objective}`)).body.data;
  assert.equal(krByTitle(again, 'Ship homepage tasks').progress, 0);
});

test('number check-ins update progress and keep history', async () => {
  const res = await asA('POST', `/goals/key-results/${ids.krNumber}/check-ins`, { value: 50, confidence: 'at_risk', note: 'Slow start' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const kr = krByTitle(res.body.data, 'Newsletter signups');
  assert.equal(kr.progress, 25);
  assert.equal(kr.confidence, 'at_risk');
  assert.equal(res.body.data.health, 'at_risk');
  await asA('POST', `/goals/key-results/${ids.krNumber}/check-ins`, { value: 120 });
  const history = (await asA('GET', `/goals/key-results/${ids.krNumber}/check-ins`)).body.data;
  assert.deepEqual(history.map((c) => c.value), [120, 50]);
  assert.equal(history[1].note, 'Slow start');
  assert.equal((await asA('POST', `/goals/key-results/${ids.krTasks}/check-ins`, { value: 5 })).status, 400, 'task KRs are not checked in by hand');
});

test('a project-linked key result counts the project tasks and follows new ones', async () => {
  const res = await asA('POST', `/goals/objectives/${ids.objective}/key-results`, { title: 'Brand work done', metricType: 'tasks', projectIds: [ids.project2] });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  let kr = krByTitle(res.body.data, 'Brand work done');
  ids.krProject = kr.id;
  assert.equal(kr.targetValue, 2, 'cancelled tasks are left out');
  await app.entityService.update('api::task.task', ids.p2t1, { data: { status: 'COMPLETED' } });
  await create('api::task.task', { name: 'Brand guidelines site', organization: ids.orgA, projects: [ids.project2] });
  const o = (await asA('GET', `/goals/objectives/${ids.objective}`)).body.data;
  kr = krByTitle(o, 'Brand work done');
  assert.equal(kr.currentValue, 1);
  assert.equal(kr.targetValue, 3);
  assert.equal(kr.progress, 33.3);

  const linked = (await asA('GET', `/goals/linked?projectId=${ids.project2}`)).body.data;
  assert.equal(linked.length, 1);
  assert.deepEqual(linked[0].keyResults.map((k) => k.title), ['Brand work done']);
  const linked1 = (await asA('GET', `/goals/linked?projectId=${ids.project}`)).body.data;
  assert.deepEqual(linked1[0].keyResults.map((k) => k.title), ['Ship homepage tasks'], 'linked through its tasks');
});

test('deleting a linked task updates the key result', async () => {
  await app.entityService.delete('api::task.task', ids.t2);
  const o = (await asA('GET', `/goals/objectives/${ids.objective}`)).body.data;
  const kr = krByTitle(o, 'Ship homepage tasks');
  assert.equal(kr.targetValue, 1);
});

test('objectives stay inside their organization', async () => {
  const other = await api('GET', `/goals/objectives/${ids.objective}`, { token: ids.jwtB, org: ids.orgB });
  assert.equal(other.status, 404);
  const list = await api('GET', '/goals/objectives', { token: ids.jwtB, org: ids.orgB });
  assert.equal(list.status, 200);
  assert.equal(list.body.data.length, 0);
  const link = await api('PUT', `/goals/key-results/${ids.krTasks}`, { token: ids.jwtB, org: ids.orgB, body: { taskIds: [ids.t1] } });
  assert.equal(link.status, 404);
  // Org A can't link org B's work either.
  const bProject = await create('api::project.project', { name: 'B secret', organization: ids.orgB, projectManager: ids.userB });
  const bad = await asA('PUT', `/goals/key-results/${ids.krProject}`, { projectIds: [bProject.id] });
  assert.equal(bad.status, 400);
});

test('members can read but not edit objectives they do not own', async () => {
  const read = await api('GET', `/goals/objectives/${ids.objective}`, { token: ids.jwtMember, org: ids.orgA });
  assert.equal(read.status, 200, JSON.stringify(read.body));
  assert.equal(read.body.data.canEdit, false);
  const edit = await api('PUT', `/goals/objectives/${ids.objective}`, { token: ids.jwtMember, org: ids.orgA, body: { title: 'Hijacked' } });
  assert.equal(edit.status, 403);
  // A key result owned by the member can be checked in by them.
  await asA('PUT', `/goals/key-results/${ids.krNumber}`, { ownerId: ids.memberA });
  const checkIn = await api('POST', `/goals/key-results/${ids.krNumber}/check-ins`, { token: ids.jwtMember, org: ids.orgA, body: { value: 150 } });
  assert.equal(checkIn.status, 201, JSON.stringify(checkIn.body));
});

test('deleting an objective removes its key results and check-ins', async () => {
  const res = await asA('DELETE', `/goals/objectives/${ids.objective}`);
  assert.equal(res.status, 200);
  assert.equal(await app.db.query('api::goal.key-result').count({ where: { objective: ids.objective } }), 0);
  assert.equal(await app.db.query('api::goal.check-in').count({ where: { keyResult: ids.krNumber } }), 0);
});
