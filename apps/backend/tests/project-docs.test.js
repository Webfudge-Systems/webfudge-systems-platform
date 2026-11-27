'use strict';

/**
 * Project docs (W8), against a real Strapi on a throwaway SQLite database.
 *   npm run test:docs   (from apps/backend)
 *
 * Covers: a project brief lives in its project, tasks created from its lines link back into it,
 * @mentions notify once, version history + restore, conflict detection, and access rules
 * (other org, restricted workspace, read-only role).
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-docs-${process.pid}-${Date.now()}.db`;
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

const realLog = console.log;
console.log = (...args) => {
  if (process.env.TEST_VERBOSE) realLog(...args);
};

let app;
let base;
const ids = {};

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
const p = (...content) => ({ type: 'paragraph', content });
const text = (t) => ({ type: 'text', text: t });
const mention = (id, label) => ({ type: 'mention', attrs: { id: String(id), label } });
const taskLink = (id, label) => ({ type: 'taskLink', attrs: { id: String(id), label } });
const doc = (...blocks) => ({ type: 'doc', content: blocks });

async function mentionNotifications(userId) {
  return app.entityService.findMany('api::notification.notification', {
    filters: { type: 'mention', user: { id: userId } },
    limit: 50,
  });
}

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

  const user = async (key) => {
    const u = await app.plugin('users-permissions').service('user').add({
      username: `${key}${Date.now()}`,
      email: `${key.toLowerCase()}@team.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
    return u.id;
  };

  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org ${key}`, slug: `docs-org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', { organization: org.id, app: pmApp.id, status: 'active', planCode: 'free', startDate: new Date() });
    await addMember(app, { orgId: org.id, userId: await user(key), role: 'Admin' });
  }
  // Org A members: Mia (member), Rex (member, outside the restricted workspace)
  await addMember(app, { orgId: ids.orgA, userId: await user('Mia'), role: 'Member' });
  await addMember(app, { orgId: ids.orgA, userId: await user('Rex'), role: 'Member' });

  ids.wsRestricted = (await create('api::workspace.workspace', { name: 'Leadership', organization: ids.orgA, membersMode: 'restricted', members: [ids.userMia] })).id;
  // Members only see projects they are on (PM / team member).
  ids.pOpen = (await create('api::project.project', { name: 'Website relaunch', organization: ids.orgA, projectManager: ids.userA, teamMembers: [ids.userMia, ids.userRex] })).id;
  ids.pRestricted = (await create('api::project.project', { name: 'Board pack', organization: ids.orgA, projectManager: ids.userA, workspace: ids.wsRestricted })).id;
  ids.pOtherOrg = (await create('api::project.project', { name: 'Initech', organization: ids.orgB, projectManager: ids.userB })).id;
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
});

test('helpers: plain text, mentions, task links, snapshot rule', () => {
  const h = require('../src/utils/project-docs');
  const c = doc(
    { type: 'heading', attrs: { level: 1 }, content: [text('Brief')] },
    p(text('Hi '), mention(5, 'Mia')),
    { type: 'bulletList', content: [{ type: 'listItem', content: [p(text('Ship it '), taskLink(9, 'Ship'))] }] }
  );
  assert.equal(h.docToPlainText(c), 'Brief\nHi @Mia\nShip it #Ship');
  assert.deepEqual(h.mentionedUserIds(c), [5]);
  assert.deepEqual(h.linkedTaskIds(c), [9]);
  assert.deepEqual(h.newMentionIds([5], c), []);
  assert.deepEqual(h.newMentionIds([], c), [5]);
  assert.equal(h.contentError({ type: 'nope' }) !== null, true);
  assert.equal(h.contentError(c), null);
  const now = Date.now();
  assert.equal(h.shouldSnapshotBeforeEdit({ contentText: '' }, 1, now), false);
  assert.equal(h.shouldSnapshotBeforeEdit({ contentText: 'x', lastEditedBy: 1, lastSnapshotAt: new Date(now - 60_000) }, 1, now), false);
  assert.equal(h.shouldSnapshotBeforeEdit({ contentText: 'x', lastEditedBy: 1, lastSnapshotAt: new Date(now - 11 * 60_000) }, 1, now), true);
  assert.equal(h.shouldSnapshotBeforeEdit({ contentText: 'x', lastEditedBy: 2, lastSnapshotAt: new Date(now) }, 1, now), true);
});

test('a project brief lives in the project, and tasks created from its lines link back', async () => {
  const created = await api('POST', '/project-docs', {
    token: ids.jwtA,
    org: ids.orgA,
    body: { data: { title: 'Project brief', docType: 'brief', project: ids.pOpen, content: doc(p(text('Design the homepage')), p(text('Write launch copy'))) } },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  ids.brief = created.body.data.id;
  assert.equal(created.body.data.project.id, ids.pOpen);

  const list = await api('GET', `/project-docs?project=${ids.pOpen}`, { token: ids.jwtA, org: ids.orgA });
  assert.deepEqual(list.body.data.map((d) => d.id), [ids.brief]);
  assert.match(list.body.data[0].excerpt, /Design the homepage/);

  // Convert a line to a task through the existing tasks API, then link it in the doc.
  const task = await api('POST', '/tasks', { token: ids.jwtA, org: ids.orgA, body: { data: { name: 'Design the homepage', projects: { set: [ids.pOpen] } } } });
  assert.ok([200, 201].includes(task.status), JSON.stringify(task.body));
  const taskId = task.body.data.id;
  const loaded = await api('GET', `/project-docs/${ids.brief}`, { token: ids.jwtA, org: ids.orgA });
  const saved = await api('PUT', `/project-docs/${ids.brief}`, {
    token: ids.jwtA,
    org: ids.orgA,
    body: { data: { baseUpdatedAt: loaded.body.data.updatedAt, content: doc(p(text('Design the homepage '), taskLink(taskId, 'Design the homepage')), p(text('Write launch copy'))) } },
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.deepEqual(saved.body.data.linkedTasks, [{ id: taskId, name: 'Design the homepage', status: 'SCHEDULED' }]);
  const t = await app.entityService.findOne('api::task.task', taskId, { populate: { projects: { fields: ['id'] } } });
  assert.deepEqual(t.projects.map((x) => x.id), [ids.pOpen]);
});

test('@mentions notify the mentioned member once, never the author, never outsiders', async () => {
  const before = (await mentionNotifications(ids.userMia)).length;
  const body = (c) => ({ data: { content: c } });
  const c1 = doc(p(text('Owner: '), mention(ids.userMia, 'Mia'), text(' '), mention(ids.userA, 'Me'), text(' '), mention(ids.userB, 'Outsider')));
  assert.equal((await api('PUT', `/project-docs/${ids.brief}`, { token: ids.jwtA, org: ids.orgA, body: body(c1) })).status, 200);
  await api('PUT', `/project-docs/${ids.brief}`, { token: ids.jwtA, org: ids.orgA, body: body(c1) });
  const mia = await mentionNotifications(ids.userMia);
  assert.equal(mia.length, before + 1);
  assert.equal(mia[mia.length - 1].data.href, `/docs/${ids.brief}`);
  assert.equal((await mentionNotifications(ids.userA)).length, 0);
  assert.equal((await mentionNotifications(ids.userB)).length, 0);
});

test('version history: snapshot on another editor, manual save, restore keeps the current state', async () => {
  // Mia edits after Admin A → A's state is snapshotted first.
  const edit = await api('PUT', `/project-docs/${ids.brief}`, { token: ids.jwtMia, org: ids.orgA, body: { data: { content: doc(p(text('Mia rewrote everything'))) } } });
  assert.equal(edit.status, 200, JSON.stringify(edit.body));
  let versions = (await api('GET', `/project-docs/${ids.brief}/versions`, { token: ids.jwtA, org: ids.orgA })).body.data;
  assert.ok(versions.length >= 1);
  const beforeMia = versions[0];
  assert.match(beforeMia.excerpt, /Owner/);

  const manual = await api('POST', `/project-docs/${ids.brief}/versions`, { token: ids.jwtMia, org: ids.orgA, body: { data: { note: 'Mia draft' } } });
  assert.equal(manual.status, 201);
  versions = (await api('GET', `/project-docs/${ids.brief}/versions`, { token: ids.jwtA, org: ids.orgA })).body.data;
  assert.equal(versions[0].reason, 'manual');
  assert.equal(versions[0].note, 'Mia draft');

  const one = await api('GET', `/project-docs/${ids.brief}/versions/${beforeMia.id}`, { token: ids.jwtA, org: ids.orgA });
  assert.equal(one.body.data.content.type, 'doc');

  const restored = await api('POST', `/project-docs/${ids.brief}/versions/${beforeMia.id}/restore`, { token: ids.jwtA, org: ids.orgA });
  assert.equal(restored.status, 200, JSON.stringify(restored.body));
  assert.match(JSON.stringify(restored.body.data.content), /Owner/);
  versions = (await api('GET', `/project-docs/${ids.brief}/versions`, { token: ids.jwtA, org: ids.orgA })).body.data;
  assert.equal(versions[0].reason, 'before_restore');
  assert.match(versions[0].excerpt, /Mia rewrote everything/);
});

test('a stale save gets 409 instead of overwriting someone else', async () => {
  const stale = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const res = await api('PUT', `/project-docs/${ids.brief}`, { token: ids.jwtMia, org: ids.orgA, body: { data: { baseUpdatedAt: stale, content: doc(p(text('old tab'))) } } });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.details.code, 'DOC_CONFLICT');
});

test('access: other org, restricted workspace and missing scope are refused', async () => {
  assert.equal((await api('GET', `/project-docs/${ids.brief}`, { token: ids.jwtB, org: ids.orgB })).status, 404);
  assert.equal((await api('PUT', `/project-docs/${ids.brief}`, { token: ids.jwtB, org: ids.orgB, body: { data: { title: 'x' } } })).status, 404);
  assert.equal((await api('POST', '/project-docs', { token: ids.jwtA, org: ids.orgA, body: { data: { title: 'x', project: ids.pOtherOrg } } })).status, 400);
  assert.equal((await api('POST', '/project-docs', { token: ids.jwtA, org: ids.orgA, body: { data: { title: 'x' } } })).status, 400);
  assert.equal((await api('GET', '/project-docs')).status, 401);

  // Restricted workspace: Mia is a member, Rex is not.
  const wsDoc = await api('POST', '/project-docs', { token: ids.jwtMia, org: ids.orgA, body: { data: { title: 'Board SOP', docType: 'sop', workspace: ids.wsRestricted } } });
  assert.equal(wsDoc.status, 201, JSON.stringify(wsDoc.body));
  const rpDoc = await api('POST', '/project-docs', { token: ids.jwtA, org: ids.orgA, body: { data: { title: 'Board notes', docType: 'meeting_notes', project: ids.pRestricted } } });
  assert.equal(rpDoc.status, 201);
  assert.equal((await api('GET', `/project-docs/${wsDoc.body.data.id}`, { token: ids.jwtRex, org: ids.orgA })).status, 404);
  assert.equal((await api('GET', `/project-docs/${rpDoc.body.data.id}`, { token: ids.jwtRex, org: ids.orgA })).status, 404);
  const rexList = (await api('GET', '/project-docs', { token: ids.jwtRex, org: ids.orgA })).body.data.map((d) => d.id);
  assert.ok(rexList.includes(ids.brief));
  assert.ok(!rexList.includes(wsDoc.body.data.id));
  assert.ok(!rexList.includes(rpDoc.body.data.id));
  const miaList = (await api('GET', '/project-docs', { token: ids.jwtMia, org: ids.orgA })).body.data.map((d) => d.id);
  assert.ok(miaList.includes(wsDoc.body.data.id));

  // Deleting: Rex (not author / PM / admin) cannot delete the brief; the admin can.
  assert.equal((await api('DELETE', `/project-docs/${ids.brief}`, { token: ids.jwtRex, org: ids.orgA })).status, 403);
  assert.equal((await api('DELETE', `/project-docs/${rpDoc.body.data.id}`, { token: ids.jwtA, org: ids.orgA })).status, 200);
});
