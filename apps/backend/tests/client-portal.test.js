'use strict';

/**
 * Client portal (W10) access rules, against a real Strapi on a throwaway SQLite database.
 *   npm run test:portal   (from apps/backend)
 *
 * Seeds two organizations, two client accounts in org A and one in org B, and checks that a portal
 * contact only ever reaches the projects, tasks and files shared with their own client account,
 * whatever ids they put in the URL.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-portal-${process.pid}-${Date.now()}.db`;
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

// Mail is printed to the console when RESEND_API_KEY is unset; capture the magic links from it.
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
  assert.match(res.body.data.token, /^wfp_/);
  return res.body.data.token;
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

  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Org ${key}`, slug: `org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', { organization: org.id, app: pmApp.id, status: 'active', planCode: 'free', startDate: new Date() });
    const user = await app.plugin('users-permissions').service('user').add({
      username: `admin${key}${Date.now()}`,
      email: `admin${key.toLowerCase()}@team.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
    ids[`user${key}`] = user.id;
    await addMember(app, { orgId: org.id, userId: user.id, role: 'Admin' });
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: user.id });
  }

  const account = async (name, org) => (await create('api::client-account.client-account', { companyName: name, organization: org })).id;
  ids.accA1 = await account('Acme', ids.orgA);
  ids.accA2 = await account('Globex', ids.orgA);
  ids.accB1 = await account('Initech', ids.orgB);

  const contact = async (first, email, org, acc, portalAccess = true) =>
    (await create('api::contact.contact', { firstName: first, lastName: 'Client', email, organization: org, clientAccount: acc, portalAccess })).id;
  ids.cA1 = await contact('Alice', 'alice@acme.test', ids.orgA, ids.accA1);
  ids.cA2 = await contact('Gina', 'gina@globex.test', ids.orgA, ids.accA2);
  ids.cB1 = await contact('Ivan', 'ivan@initech.test', ids.orgB, ids.accB1);
  ids.cOff = await contact('Otto', 'otto@acme.test', ids.orgA, ids.accA1, false);
  ids.cA1New = await contact('Nina', 'nina@acme.test', ids.orgA, ids.accA1, false);
  // Same email in another org's client account: gets its own, separate link.
  ids.cShared = await contact('Sam', 'sam@shared.test', ids.orgA, ids.accA1);
  ids.cSharedB = await contact('Sam', 'sam@shared.test', ids.orgB, ids.accB1);

  const project = async (name, org, acc, shared) =>
    (await create('api::project.project', { name, organization: org, clientAccount: acc, clientPortalEnabled: shared, projectManager: org === ids.orgA ? ids.userA : ids.userB })).id;
  ids.pShared = await project('Acme website', ids.orgA, ids.accA1, true);
  ids.pUnshared = await project('Acme internal retainer', ids.orgA, ids.accA1, false);
  ids.pOtherClient = await project('Globex app', ids.orgA, ids.accA2, true);
  ids.pOtherOrg = await project('Initech rollout', ids.orgB, ids.accB1, true);

  const task = async (name, org, projectId, extra = {}) =>
    (await create('api::task.task', { name, organization: org, projects: [projectId], ...extra })).id;
  ids.tDeliverable = await task('Homepage design', ids.orgA, ids.pShared, { taskType: 'deliverable', clientVisible: true, clientApprovalStatus: 'pending' });
  ids.tMilestone = await task('Launch', ids.orgA, ids.pShared, { taskType: 'milestone', clientVisible: true });
  ids.tHidden = await task('Internal: margin review', ids.orgA, ids.pShared, { taskType: 'deliverable', clientApprovalStatus: 'pending' });
  ids.tDone = await task('Kickoff', ids.orgA, ids.pShared, { status: 'COMPLETED' });
  ids.tOtherClient = await task('Globex mockups', ids.orgA, ids.pOtherClient, { taskType: 'deliverable', clientVisible: true, clientApprovalStatus: 'pending' });
  ids.tOtherOrg = await task('Initech plan', ids.orgB, ids.pOtherOrg, { taskType: 'deliverable', clientVisible: true, clientApprovalStatus: 'pending' });
  ids.tUnshared = await task('Retainer deliverable', ids.orgA, ids.pUnshared, { taskType: 'deliverable', clientVisible: true, clientApprovalStatus: 'pending' });

  const file = async (name) =>
    (await app.db.query('plugin::upload.file').create({ data: { name, hash: crypto.randomUUID(), ext: '.pdf', mime: 'application/pdf', size: 1, url: `/uploads/${name}`, provider: 'local' } })).id;
  const attach = async (name, org, subjectType, subjectId, clientShareable) =>
    (await create('api::entity-attachment.entity-attachment', { subjectType, subjectId, fileName: name, file: await file(name), organization: org, clientShareable })).id;
  ids.fShared = await attach('brief.pdf', ids.orgA, 'project', ids.pShared, true);
  ids.fInternal = await attach('costing.pdf', ids.orgA, 'project', ids.pShared, false);
  ids.fTaskShared = await attach('homepage-v1.pdf', ids.orgA, 'task', ids.tDeliverable, true);
  ids.fHiddenTask = await attach('margins.pdf', ids.orgA, 'task', ids.tHidden, true);
  ids.fOtherProject = await attach('globex.pdf', ids.orgA, 'project', ids.pOtherClient, true);
});

after(async () => {
  console.log = realLog;
  if (app) await app.destroy();
  for (const suffix of ['', '-journal', '-wal', '-shm']) fs.rmSync(DB_PATH + suffix, { force: true });
});

// ── Sign-in ──────────────────────────────────────────────────────────────────

test('request-link answers 200 for unknown emails and contacts without portal access, and sends nothing', async () => {
  mailLog.length = 0;
  for (const email of ['nobody@nowhere.test', 'otto@acme.test']) {
    const res = await api('POST', '/portal/auth/request-link', { body: { email } });
    assert.equal(res.status, 200);
  }
  assert.equal(mailLog.length, 0);
});

test('a magic link works once', async () => {
  mailLog.length = 0;
  await api('POST', '/portal/auth/request-link', { body: { email: 'ALICE@acme.test' } });
  const link = lastLinkFor('alice@acme.test');
  assert.match(link, /^wfl_/);
  assert.equal((await api('POST', '/portal/auth/exchange', { body: { token: link } })).status, 200);
  const again = await api('POST', '/portal/auth/exchange', { body: { token: link } });
  assert.equal(again.status, 401);
  assert.equal(again.body.error.details.code, 'LINK_USED');
});

test('expired and made-up links are rejected', async () => {
  const { hashToken, SESSION_UID } = require('../src/utils/client-portal');
  const token = 'wfl_expired-token-for-test';
  await create(SESSION_UID, { kind: 'magic_link', tokenHash: hashToken(token), contact: ids.cA1, organization: ids.orgA, expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await api('POST', '/portal/auth/exchange', { body: { token } })).body.error.details.code, 'LINK_EXPIRED');
  assert.equal((await api('POST', '/portal/auth/exchange', { body: { token: 'wfl_nope' } })).status, 401);
  // A session token is not a magic link.
  const session = await signIn('gina@globex.test');
  assert.equal((await api('POST', '/portal/auth/exchange', { body: { token: session } })).status, 401);
});

test('a contact whose email exists in two orgs gets one link per org, each scoped to its own org', async () => {
  mailLog.length = 0;
  await api('POST', '/portal/auth/request-link', { body: { email: 'sam@shared.test' } });
  const links = mailLog.map((l) => decodeURIComponent(l.match(/token=([A-Za-z0-9_%-]+)/)[1]));
  assert.equal(links.length, 2);
  const seen = [];
  for (const link of links) {
    const token = (await api('POST', '/portal/auth/exchange', { body: { token: link } })).body.data.token;
    const me = await api('GET', '/portal/me', { token });
    seen.push(me.body.data.projects.map((p) => p.id));
  }
  assert.deepEqual(seen.flat().sort(), [ids.pShared, ids.pOtherOrg].sort());
});

// ── Token isolation ──────────────────────────────────────────────────────────

test('portal endpoints reject missing tokens and user JWTs; team endpoints reject portal tokens', async () => {
  assert.equal((await api('GET', '/portal/me')).status, 401);
  assert.equal((await api('GET', '/portal/me', { token: ids.jwtA })).status, 401);
  const portalToken = await signIn('alice@acme.test');
  assert.equal((await api('GET', '/projects', { token: portalToken })).status, 401);
  assert.equal((await api('GET', `/client-portal/projects/${ids.pShared}`, { token: portalToken })).status, 401);
  assert.equal((await api('GET', `/tasks/${ids.tDeliverable}`, { token: portalToken })).status, 401);
});

// ── Read scope ───────────────────────────────────────────────────────────────

test('a contact sees only the shared projects of their own client account', async () => {
  const token = await signIn('alice@acme.test');
  const me = await api('GET', '/portal/me', { token });
  assert.equal(me.status, 200);
  assert.deepEqual(me.body.data.projects.map((p) => p.id), [ids.pShared]);
  assert.equal(me.body.data.projects[0].progress.total, 4);
  assert.equal(me.body.data.projects[0].progress.done, 1);
  assert.equal(me.body.data.organization.name, 'Org A');
});

test('changing the project id never reaches another project, client or organization', async () => {
  const token = await signIn('alice@acme.test');
  for (const id of [ids.pUnshared, ids.pOtherClient, ids.pOtherOrg, 999999, '0', '-1', 'abc', `${ids.pShared}abc`, `${ids.pShared} OR 1=1`]) {
    const res = await api('GET', `/portal/projects/${encodeURIComponent(id)}`, { token });
    assert.equal(res.status, 404, `project ${id} must be hidden`);
  }
});

test('project detail lists only client-visible tasks and shareable files', async () => {
  const token = await signIn('alice@acme.test');
  const res = await api('GET', `/portal/projects/${ids.pShared}`, { token });
  assert.equal(res.status, 200);
  const d = res.body.data;
  const taskIds = [...d.milestones, ...d.deliverables, ...d.tasks].map((t) => t.id).sort();
  assert.deepEqual(taskIds, [ids.tDeliverable, ids.tMilestone].sort());
  assert.deepEqual(d.files.map((f) => f.id).sort(), [ids.fShared, ids.fTaskShared].sort());
  assert.equal(d.deliverables[0].approval.status, 'pending');
  // Only whitelisted fields leave the API.
  const keys = Object.keys(d.project).sort();
  assert.deepEqual(keys, ['description', 'endDate', 'id', 'name', 'progress', 'startDate', 'status']);
  const json = JSON.stringify(res.body);
  for (const leak of ['Internal: margin review', 'costing.pdf', 'margins.pdf', 'globex.pdf', 'budget', 'hourlyRate', 'assignee']) {
    assert.ok(!json.includes(leak), `response must not contain ${leak}`);
  }
});

test('a contact of another client in the same org cannot see Acme work', async () => {
  const token = await signIn('gina@globex.test');
  const me = await api('GET', '/portal/me', { token });
  assert.deepEqual(me.body.data.projects.map((p) => p.id), [ids.pOtherClient]);
  assert.equal((await api('GET', `/portal/projects/${ids.pShared}`, { token })).status, 404);
});

// ── Write scope ──────────────────────────────────────────────────────────────

test('approvals only reach visible deliverables of a shared project', async () => {
  const token = await signIn('alice@acme.test');
  const tries = [
    [ids.pShared, ids.tHidden], // hidden task in my project
    [ids.pShared, ids.tOtherClient], // other client's task through my project
    [ids.pShared, ids.tOtherOrg], // other org's task through my project
    [ids.pOtherClient, ids.tOtherClient], // other client's project
    [ids.pOtherOrg, ids.tOtherOrg], // other org's project
    [ids.pUnshared, ids.tUnshared], // my client, project not shared
  ];
  for (const [p, t] of tries) {
    const res = await api('POST', `/portal/projects/${p}/tasks/${t}/approval`, { token, body: { decision: 'approve' } });
    assert.equal(res.status, 404, `approval on project ${p} task ${t} must be refused`);
  }
  for (const t of [ids.tHidden, ids.tOtherClient, ids.tOtherOrg, ids.tUnshared]) {
    const row = await app.entityService.findOne('api::task.task', t, { fields: ['clientApprovalStatus'] });
    assert.equal(row.clientApprovalStatus, 'pending', `task ${t} unchanged`);
  }
  // Milestones are not deliverables.
  assert.equal((await api('POST', `/portal/projects/${ids.pShared}/tasks/${ids.tMilestone}/approval`, { token, body: { decision: 'approve' } })).status, 400);
});

test('approve and request-changes record the decision once and land in Work', async () => {
  const token = await signIn('alice@acme.test');
  const url = `/portal/projects/${ids.pShared}/tasks/${ids.tDeliverable}/approval`;
  assert.equal((await api('POST', url, { token, body: { decision: 'request_changes' } })).status, 400, 'changes need a comment');
  const ok = await api('POST', url, { token, body: { decision: 'approve', comment: 'Looks great' } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.data.approval.status, 'approved');
  assert.equal((await api('POST', url, { token, body: { decision: 'approve' } })).status, 409);

  const row = await app.entityService.findOne('api::task.task', ids.tDeliverable, { populate: { clientApprovalBy: { fields: ['id'] } } });
  assert.equal(row.clientApprovalStatus, 'approved');
  assert.equal(row.clientApprovalBy.id, ids.cA1);
  const comments = await app.entityService.findMany('api::crm-activity.crm-activity', { filters: { subjectType: 'task', subjectId: ids.tDeliverable, action: 'comment' } });
  assert.equal(comments.length, 1);
  assert.equal(comments[0].meta.source, 'client_portal');
});

test('requests become tasks in the shared project only', async () => {
  const token = await signIn('alice@acme.test');
  for (const p of [ids.pOtherClient, ids.pOtherOrg, ids.pUnshared]) {
    assert.equal((await api('POST', `/portal/projects/${p}/requests`, { token, body: { title: 'Sneaky' } })).status, 404);
  }
  assert.equal((await api('POST', `/portal/projects/${ids.pShared}/requests`, { token, body: { title: '  ' } })).status, 400);
  const res = await api('POST', `/portal/projects/${ids.pShared}/requests`, {
    token,
    body: { title: 'Add a careers page', description: 'With three open roles', organization: ids.orgB, projects: [ids.pOtherOrg] },
  });
  assert.equal(res.status, 201);
  const row = await app.entityService.findOne('api::task.task', res.body.data.id, { populate: { projects: { fields: ['id'] }, organization: { fields: ['id'] }, clientRequestedBy: { fields: ['id'] } } });
  assert.equal(row.organization.id, ids.orgA);
  assert.deepEqual(row.projects.map((p) => p.id), [ids.pShared]);
  assert.equal(row.clientRequestedBy.id, ids.cA1);
  assert.deepEqual(row.tags, ['client-request']);
  assert.equal((await app.entityService.findMany('api::task.task', { filters: { name: 'Sneaky' } })).length, 0);
});

// ── Team controls ────────────────────────────────────────────────────────────

test('the generic project and task APIs cannot flip portal fields', async () => {
  await api('PUT', `/projects/${ids.pUnshared}`, { token: ids.jwtA, org: ids.orgA, body: { data: { clientPortalEnabled: true } } });
  const p = await app.entityService.findOne('api::project.project', ids.pUnshared, { fields: ['clientPortalEnabled'] });
  assert.equal(p.clientPortalEnabled, false);
  await api('PUT', `/tasks/${ids.tHidden}`, { token: ids.jwtA, org: ids.orgA, body: { data: { clientVisible: true } } });
  const t = await app.entityService.findOne('api::task.task', ids.tHidden, { fields: ['clientVisible'] });
  assert.equal(t.clientVisible, false);
});

test('team users of another org cannot touch this org through the portal controls', async () => {
  const opts = { token: ids.jwtB, org: ids.orgB };
  assert.equal((await api('GET', `/client-portal/projects/${ids.pShared}`, opts)).status, 404);
  assert.equal((await api('PUT', `/client-portal/projects/${ids.pUnshared}/sharing`, { ...opts, body: { enabled: true } })).status, 404);
  assert.equal((await api('PUT', `/client-portal/tasks/${ids.tHidden}`, { ...opts, body: { clientVisible: true } })).status, 404);
  assert.equal((await api('PUT', `/client-portal/attachments/${ids.fInternal}`, { ...opts, body: { clientShareable: true } })).status, 404);
  assert.equal((await api('POST', `/client-portal/contacts/${ids.cA1}/invite`, opts)).status, 404);
  assert.equal((await api('POST', `/client-portal/contacts/${ids.cA1}/revoke`, opts)).status, 404);
  // Faking the org header does not help either.
  assert.equal((await api('GET', `/client-portal/projects/${ids.pShared}`, { token: ids.jwtB, org: ids.orgA })).status, 403);
});

test('invite turns portal access on and mails a link; sharing toggles reach the portal', async () => {
  mailLog.length = 0;
  const opts = { token: ids.jwtA, org: ids.orgA };
  const inv = await api('POST', `/client-portal/contacts/${ids.cA1New}/invite`, { ...opts, body: { projectId: ids.pShared } });
  assert.equal(inv.status, 200, JSON.stringify(inv.body));
  const ninaLink = lastLinkFor('nina@acme.test');
  assert.ok(ninaLink);
  // A contact of another client account cannot be invited to this project.
  assert.equal((await api('POST', `/client-portal/contacts/${ids.cA2}/invite`, { ...opts, body: { projectId: ids.pShared } })).status, 400);

  // The invite email carries the first link (asking again right away hits the resend cooldown).
  const token = (await api('POST', '/portal/auth/exchange', { body: { token: ninaLink } })).body.data.token;
  assert.deepEqual((await api('GET', '/portal/me', { token })).body.data.projects.map((p) => p.id), [ids.pShared]);
  assert.equal((await api('PUT', `/client-portal/projects/${ids.pUnshared}/sharing`, { ...opts, body: { enabled: true } })).status, 200);
  assert.deepEqual((await api('GET', '/portal/me', { token })).body.data.projects.map((p) => p.id).sort(), [ids.pShared, ids.pUnshared].sort());
  assert.equal((await api('PUT', `/client-portal/projects/${ids.pUnshared}/sharing`, { ...opts, body: { enabled: false } })).status, 200);
  assert.equal((await api('GET', `/portal/projects/${ids.pUnshared}`, { token })).status, 404);

  const vis = await api('PUT', `/client-portal/tasks/${ids.tHidden}`, { ...opts, body: { clientVisible: true } });
  assert.equal(vis.status, 200);
  assert.equal(vis.body.data.clientApprovalStatus, 'pending');
  const detail = await api('GET', `/portal/projects/${ids.pShared}`, { token });
  assert.ok(detail.body.data.deliverables.some((t) => t.id === ids.tHidden));
  await api('PUT', `/client-portal/tasks/${ids.tHidden}`, { ...opts, body: { clientVisible: false } });

  const sharing = await api('GET', `/client-portal/projects/${ids.pShared}`, opts);
  assert.equal(sharing.status, 200);
  assert.ok(sharing.body.data.contacts.find((c) => c.id === ids.cA1New).portalAccess);
  assert.ok(!sharing.body.data.contacts.some((c) => c.id === ids.cA2), 'only the project client account contacts are listed');
});

test('revoking a contact ends their sessions at once and stops new links', async () => {
  const token = await signIn('alice@acme.test');
  assert.equal((await api('GET', '/portal/me', { token })).status, 200);
  const res = await api('POST', `/client-portal/contacts/${ids.cA1}/revoke`, { token: ids.jwtA, org: ids.orgA });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.sessionsRevoked >= 1);
  assert.equal((await api('GET', '/portal/me', { token })).status, 401);
  assert.equal((await api('POST', `/portal/projects/${ids.pShared}/requests`, { token, body: { title: 'After revoke' } })).status, 401);
  mailLog.length = 0;
  await api('POST', '/portal/auth/request-link', { body: { email: 'alice@acme.test' } });
  assert.equal(lastLinkFor('alice@acme.test'), null);
});

test('turning portalAccess off in Grow, or moving the contact to another client, cuts access too', async () => {
  const token = await signIn('gina@globex.test');
  await app.entityService.update('api::contact.contact', ids.cA2, { data: { clientAccount: ids.accA1 } });
  // Now Acme's contact: sees Acme's shared project, never Globex's.
  const me = await api('GET', '/portal/me', { token });
  assert.ok(!me.body.data.projects.some((p) => p.id === ids.pOtherClient));
  await app.entityService.update('api::contact.contact', ids.cA2, { data: { portalAccess: false } });
  assert.equal((await api('GET', '/portal/me', { token })).status, 403);
});

test('portal contacts do not take seats', async () => {
  const { memberCount } = require('../src/utils/saas-org');
  assert.equal(await memberCount(app, ids.orgA), 1);
});
