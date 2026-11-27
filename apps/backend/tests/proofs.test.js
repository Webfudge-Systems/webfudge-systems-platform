'use strict';

/**
 * Approvals & proofing (W9), against a real Strapi on a throwaway SQLite database.
 *   npm run test:proofs   (from apps/backend)
 *
 * Walks the acceptance flow (designer uploads v1, client pins a comment on a video frame and asks
 * for changes, designer uploads v2 on the same task) and checks the scoping rules: clients only
 * reach versions of their own visible deliverables, internal comments never reach the portal, and
 * other organizations see nothing.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-proofs-${process.pid}-${Date.now()}.db`;
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
  PORTAL_APP_URL: 'http://portal.test',
});
delete process.env.RESEND_API_KEY;
delete process.env.REDIS_URL;

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
const lastLinkFor = (email) => {
  const hit = [...mailLog].reverse().find((l) => l.includes(`To: ${email}`));
  const m = hit && hit.match(/token=([A-Za-z0-9_%-]+)/);
  return m ? decodeURIComponent(m[1]) : null;
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
    /* empty body */
  }
  return { status: res.status, body: json };
}

const create = (uid, data) => app.entityService.create(uid, { data });

async function signIn(email) {
  mailLog.length = 0;
  await api('POST', '/portal/auth/request-link', { body: { email } });
  const link = lastLinkFor(email);
  assert.ok(link, `a magic link was mailed to ${email}`);
  const res = await api('POST', '/portal/auth/exchange', { body: { token: link } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.data.token;
}

const uploadFile = async (name, mime) =>
  (await app.db.query('plugin::upload.file').create({
    data: { name, hash: crypto.randomUUID(), ext: path.extname(name), mime, size: 1, url: `/uploads/${name}`, provider: 'local' },
  })).id;

const notificationsFor = (userId) =>
  app.entityService.findMany('api::notification.notification', { filters: { user: { id: userId } }, sort: { id: 'desc' } });

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

  const user = async (key, orgId, role) => {
    const u = await app.plugin('users-permissions').service('user').add({
      username: `${key}${Date.now()}`,
      email: `${key}@team.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
    await addMember(app, { orgId, userId: u.id, role });
    return { id: u.id, jwt: app.plugin('users-permissions').service('jwt').issue({ id: u.id }) };
  };

  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org ${key}`, slug: `proof-org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', { organization: org.id, app: pmApp.id, status: 'active', planCode: 'free', startDate: new Date() });
    ids[`admin${key}`] = await user(`padmin${key.toLowerCase()}`, org.id, 'Admin');
  }
  // The designer is the assignee but not on the project team.
  ids.designer = await user('designer', ids.orgA, 'Admin');

  const account = async (name, org) => (await create('api::client-account.client-account', { companyName: name, organization: org })).id;
  ids.accA1 = await account('Acme', ids.orgA);
  ids.accA2 = await account('Globex', ids.orgA);
  const contact = async (first, email, org, acc) =>
    (await create('api::contact.contact', { firstName: first, lastName: 'Client', email, organization: org, clientAccount: acc, portalAccess: true })).id;
  ids.cAlice = await contact('Alice', 'alice@acme.proof.test', ids.orgA, ids.accA1);
  ids.cGina = await contact('Gina', 'gina@globex.proof.test', ids.orgA, ids.accA2);

  const project = async (name, org, acc, pm) =>
    (await create('api::project.project', { name, organization: org, clientAccount: acc, clientPortalEnabled: true, projectManager: pm })).id;
  ids.pAcme = await project('Acme launch', ids.orgA, ids.accA1, ids.adminA.id);
  ids.pGlobex = await project('Globex app', ids.orgA, ids.accA2, ids.adminA.id);
  ids.pB = await project('Org B work', ids.orgB, null, ids.adminB.id);

  const task = async (name, org, projectId, extra = {}) =>
    (await create('api::task.task', { name, organization: org, projects: [projectId], ...extra })).id;
  ids.tVideo = await task('Launch video', ids.orgA, ids.pAcme, {
    taskType: 'deliverable', clientVisible: true, clientApprovalStatus: 'pending', assignee: ids.designer.id,
  });
  ids.tHidden = await task('Internal cut', ids.orgA, ids.pAcme, { taskType: 'deliverable', assignee: ids.designer.id });
  ids.tGlobex = await task('Globex banner', ids.orgA, ids.pGlobex, { taskType: 'deliverable', clientVisible: true, clientApprovalStatus: 'pending' });
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
});

const teamA = (who = 'designer') => ({ token: ids[who].jwt, org: ids.orgA });

test('designer uploads v1: a task attachment and version 1 in review', async () => {
  const fileId = await uploadFile('launch-v1.mp4', 'video/mp4');
  const res = await api('POST', `/proofs/tasks/${ids.tVideo}/versions`, { ...teamA(), body: { fileId, note: 'First cut' } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.version, 1);
  ids.v1 = res.body.data.id;

  const list = await api('GET', `/proofs/tasks/${ids.tVideo}`, teamA());
  assert.equal(list.status, 200);
  const [v1] = list.body.data.versions;
  assert.equal(v1.label, 'v1');
  assert.equal(v1.kind, 'video');
  assert.equal(v1.status, 'in_review');
  assert.equal(v1.note, 'First cut');
  assert.equal(v1.file.mime, 'video/mp4');

  const attachments = await app.entityService.findMany('api::entity-attachment.entity-attachment', { filters: { subjectType: 'task', subjectId: ids.tVideo } });
  assert.equal(attachments.length, 1, 'the version file is also a task file');
});

test('bad input is refused', async () => {
  assert.equal((await api('POST', `/proofs/tasks/${ids.tVideo}/versions`, { ...teamA(), body: {} })).status, 400);
  assert.equal((await api('POST', `/proofs/tasks/${ids.tVideo}/versions`, { ...teamA(), body: { fileId: 999999 } })).status, 400);
  const url = `/proofs/versions/${ids.v1}/comments`;
  assert.equal((await api('POST', url, { ...teamA(), body: { body: '  ' } })).status, 400);
  assert.equal((await api('POST', url, { ...teamA(), body: { body: 'x', x: 150, y: 10 } })).status, 400);
  assert.equal((await api('POST', url, { ...teamA(), body: { body: 'x', x: 10 } })).status, 400, 'a pin needs x and y');
  assert.equal((await api('POST', url, { ...teamA(), body: { body: 'x', timestamp: -1 } })).status, 400);
});

test('another organization sees nothing', async () => {
  const other = { token: ids.adminB.jwt, org: ids.orgB };
  assert.equal((await api('GET', `/proofs/tasks/${ids.tVideo}`, other)).status, 404);
  assert.equal((await api('POST', `/proofs/versions/${ids.v1}/comments`, { ...other, body: { body: 'hi' } })).status, 404);
  assert.equal((await api('POST', `/proofs/versions/${ids.v1}/decision`, { ...other, body: { decision: 'approve' } })).status, 404);
  // Spoofing org A in the header does not help a user who is not a member.
  assert.notEqual((await api('GET', `/proofs/tasks/${ids.tVideo}`, { token: ids.adminB.jwt, org: ids.orgA })).status, 200);
});

test('client pins a comment on a video frame; internal team notes stay internal', async () => {
  await api('POST', `/proofs/versions/${ids.v1}/comments`, { ...teamA(), body: { body: 'Colour grade still WIP', internal: true } });

  const token = await signIn('alice@acme.proof.test');
  const list = await api('GET', `/portal/projects/${ids.pAcme}/tasks/${ids.tVideo}/proofs`, { token });
  assert.equal(list.status, 200, JSON.stringify(list.body));
  assert.equal(list.body.data.versions.length, 1);
  assert.equal(list.body.data.versions[0].comments.length, 0, 'internal comment hidden from the client');
  assert.equal(list.body.data.versions[0].uploadedBy, undefined);

  const before = (await notificationsFor(ids.designer.id)).length;
  const res = await api('POST', `/portal/projects/${ids.pAcme}/tasks/${ids.tVideo}/proofs/${ids.v1}/comments`, {
    token,
    body: { body: 'Logo is too small here', x: 42.5, y: 61.25, timestamp: 12.4, internal: true },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.author.kind, 'client');
  assert.equal(res.body.data.author.isYou, true);
  assert.equal(res.body.data.timestamp, 12.4);
  assert.equal(res.body.data.internal, false, 'clients cannot post internal notes');

  const notes = await notificationsFor(ids.designer.id);
  assert.equal(notes.length, before + 1, 'the assignee hears about the client comment');
  assert.match(notes[0].message, /Logo is too small/);
  assert.equal(notes[0].data.subjectId, ids.tVideo);

  const team = await api('GET', `/proofs/tasks/${ids.tVideo}`, teamA('adminA'));
  const pins = team.body.data.versions[0].comments;
  assert.equal(pins.length, 2);
  const pin = pins.find((c) => c.author.kind === 'client');
  assert.deepEqual([pin.x, pin.y, pin.timestamp], [42.5, 61.25, 12.4]);
  assert.equal(pin.author.name, 'Alice Client');
});

test('clients only reach versions of their own visible deliverables', async () => {
  const alice = await signIn('alice@acme.proof.test');
  const gina = await signIn('gina@globex.proof.test');
  const tries = [
    [alice, ids.pAcme, ids.tHidden, ids.v1], // hidden task in my project
    [alice, ids.pAcme, ids.tGlobex, ids.v1], // other client's task through my project
    [alice, ids.pGlobex, ids.tGlobex, ids.v1], // other client's project
    [gina, ids.pAcme, ids.tVideo, ids.v1], // Acme work as Globex
  ];
  for (const [token, p, t, v] of tries) {
    assert.equal((await api('GET', `/portal/projects/${p}/tasks/${t}/proofs`, { token })).status, 404);
    assert.equal((await api('POST', `/portal/projects/${p}/tasks/${t}/proofs/${v}/comments`, { token, body: { body: 'sneaky' } })).status, 404);
  }
  // A version id from another task, through a task I can see.
  const fileId = await uploadFile('globex-v1.png', 'image/png');
  const g = await api('POST', `/proofs/tasks/${ids.tGlobex}/versions`, { token: ids.adminA.jwt, org: ids.orgA, body: { fileId } });
  assert.equal(g.status, 201);
  assert.equal((await api('POST', `/portal/projects/${ids.pAcme}/tasks/${ids.tVideo}/proofs/${g.body.data.id}/comments`, { token: alice, body: { body: 'x' } })).status, 404);
  // No portal token, or a team JWT, on the portal endpoint.
  assert.equal((await api('GET', `/portal/projects/${ids.pAcme}/tasks/${ids.tVideo}/proofs`)).status, 401);
  assert.equal((await api('GET', `/portal/projects/${ids.pAcme}/tasks/${ids.tVideo}/proofs`, { token: ids.adminA.jwt })).status, 401);
});

test('client requests changes: the latest version is stamped and the assignee is told', async () => {
  const token = await signIn('alice@acme.proof.test');
  const before = (await notificationsFor(ids.designer.id)).length;
  const res = await api('POST', `/portal/projects/${ids.pAcme}/tasks/${ids.tVideo}/approval`, {
    token,
    body: { decision: 'request_changes', comment: 'See the pin at 0:12' },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.approval.status, 'changes_requested');

  const v1 = await app.entityService.findOne('api::proof.proof-version', ids.v1, { populate: { decidedByContact: { fields: ['id'] } } });
  assert.equal(v1.status, 'changes_requested');
  assert.equal(v1.decisionComment, 'See the pin at 0:12');
  assert.equal(v1.decidedByContact.id, ids.cAlice);

  const notes = await notificationsFor(ids.designer.id);
  assert.ok(notes.length > before, 'assignee notified of the change request');
  assert.match(notes[0].title, /requested changes on v1/);
});

test('designer uploads v2 on the same task; the client is asked again and v1 keeps its pins', async () => {
  const fileId = await uploadFile('launch-v2.mp4', 'video/mp4');
  const res = await api('POST', `/proofs/tasks/${ids.tVideo}/versions`, { ...teamA(), body: { fileId, note: 'Bigger logo' } });
  assert.equal(res.status, 201);
  assert.equal(res.body.data.version, 2);
  ids.v2 = res.body.data.id;

  const task = await app.entityService.findOne('api::task.task', ids.tVideo, { fields: ['clientApprovalStatus'] });
  assert.equal(task.clientApprovalStatus, 'pending');

  const token = await signIn('alice@acme.proof.test');
  const list = await api('GET', `/portal/projects/${ids.pAcme}/tasks/${ids.tVideo}/proofs`, { token });
  const [v2, v1] = list.body.data.versions;
  assert.deepEqual([v2.label, v1.label], ['v2', 'v1']);
  assert.equal(v2.status, 'in_review');
  assert.equal(v1.status, 'changes_requested');
  assert.equal(v1.comments.length, 1);
  assert.equal(list.body.data.task.approval.status, 'pending');

  // Approve v2 from the portal.
  const ok = await api('POST', `/portal/projects/${ids.pAcme}/tasks/${ids.tVideo}/approval`, { token, body: { decision: 'approve' } });
  assert.equal(ok.status, 200);
  const row = await app.entityService.findOne('api::proof.proof-version', ids.v2, { fields: ['status'] });
  assert.equal(row.status, 'approved');
});

test('team reviewers decide on the latest version only and can resolve comments', async () => {
  const old = await api('POST', `/proofs/versions/${ids.v1}/decision`, { ...teamA('adminA'), body: { decision: 'approve' } });
  assert.equal(old.status, 409);
  assert.equal((await api('POST', `/proofs/versions/${ids.v2}/decision`, { ...teamA('adminA'), body: { decision: 'request_changes' } })).status, 400);
  const res = await api('POST', `/proofs/versions/${ids.v2}/decision`, { ...teamA('adminA'), body: { decision: 'request_changes', comment: 'End card typo' } });
  assert.equal(res.status, 200);
  assert.equal(res.body.data.status, 'changes_requested');

  const team = await api('GET', `/proofs/tasks/${ids.tVideo}`, teamA());
  const pin = team.body.data.versions[1].comments.find((c) => c.author.kind === 'client');
  const r = await api('PUT', `/proofs/comments/${pin.id}`, { ...teamA(), body: { resolved: true } });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.resolved, true);
  assert.equal((await api('PUT', `/proofs/comments/${pin.id}`, { token: ids.adminB.jwt, org: ids.orgB, body: { resolved: false } })).status, 404);
});
