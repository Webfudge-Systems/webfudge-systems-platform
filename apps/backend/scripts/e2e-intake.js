'use strict';

/**
 * W13 end-to-end check: boots this Strapi in SaaS mode against a THROWAWAY SQLite file, seeds two orgs with
 * Fudge Work, creates intake channels through the settings API, submits the public form and a signed
 * Resend inbound webhook, and checks the tasks in the database. Calls to api.resend.com are stubbed
 * in-process (no network, nothing is sent).
 *
 *   node scripts/e2e-intake.js          (from apps/backend; deletes the SQLite file afterwards)
 */

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const assert = require('node:assert/strict');

const dbFile = `.tmp/e2e-intake-${Date.now()}.db`;
const PORT = Number(process.env.E2E_PORT || 1398);
const WEBHOOK_KEY = Buffer.from('e2e-intake-webhook-key-0123456789');
Object.assign(process.env, {
  DATABASE_CLIENT: 'sqlite',
  DATABASE_FILENAME: dbFile,
  DATABASE_URL: '',
  PLATFORM_MODE: 'saas',
  NODE_ENV: 'development',
  HOST: '127.0.0.1',
  PORT: String(PORT),
  REDIS_ENABLED: 'false',
  CACHE_API_ENABLED: 'false',
  JWT_SECRET: 'e2e-only-jwt-secret-not-used-anywhere-else-000000',
  APP_KEYS: 'e2eKeyA,e2eKeyB',
  API_TOKEN_SALT: 'e2e-salt',
  ADMIN_JWT_SECRET: 'e2e-admin-secret',
  TRANSFER_TOKEN_SALT: 'e2e-transfer-salt',
  ENCRYPTION_KEY: 'e2e-encryption-key',
  STRAPI_TELEMETRY_DISABLED: 'true',
  RESEND_API_KEY: 're_e2e_stub_only',
  RESEND_INBOUND_WEBHOOK_SECRET: `whsec_${WEBHOOK_KEY.toString('base64')}`,
  INTAKE_EMAIL_DOMAIN: 'in.e2e.test',
});

// Stub Resend's receiving API (body + attachments) so nothing leaves this process.
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url);
  if (u.startsWith('https://api.resend.com/emails/receiving/em_1/attachments')) {
    return new Response(JSON.stringify({ data: [{ id: 'at_1', filename: '../brief.txt', content_type: 'text/plain', size: 11, download_url: 'https://stub.e2e.test/brief' }] }), { status: 200 });
  }
  if (u.startsWith('https://api.resend.com/emails/receiving/em_')) {
    return new Response(JSON.stringify({ text: 'Please refresh the homepage banner.\n<script>alert(1)</script>', headers: {} }), { status: 200 });
  }
  if (u === 'https://stub.e2e.test/brief') return new Response('hello brief', { status: 200 });
  if (u.startsWith('https://api.resend.com/')) throw new Error(`unexpected Resend call ${u}`);
  return realFetch(url, opts);
};

const TASK = 'api::task.task';
const CHANNEL = 'api::intake-channel.intake-channel';

function svixHeaders(body) {
  const id = `msg_${crypto.randomBytes(4).toString('hex')}`;
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto.createHmac('sha256', WEBHOOK_KEY).update(`${id}.${ts}.${body}`).digest('base64');
  return { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${sig}` };
}

async function main() {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const app = await createStrapi(await compileStrapi()).load();
  await app.server.listen(PORT, '127.0.0.1');
  const base = `http://127.0.0.1:${PORT}/api`;
  const jwt = require('jsonwebtoken');
  const { addMember } = require('../src/utils/saas-org');
  const { ensureDefaultTaskList } = require('../src/utils/workspaces');
  const { resetRateLimits } = require('../src/utils/lead-capture/rate-limit');
  const es = app.entityService;
  // Uploads go to S3 (config/plugins.js); there are no AWS credentials here, so record the file row only.
  const uploaded = [];
  app.plugin('upload').service('upload').upload = async ({ files }) => {
    uploaded.push(files);
    const row = await app.db.query('plugin::upload.file').create({
      data: { name: files.originalFilename, hash: `e2e_${Date.now()}`, ext: path.extname(files.originalFilename), mime: files.mimetype, size: files.size / 1000, url: '/e2e', provider: 'e2e' },
    });
    return [row];
  };
  const results = [];
  const check = async (name, fn) => {
    try {
      await fn();
      results.push(['PASS', name]);
    } catch (e) {
      results.push(['FAIL', name, e.message]);
    }
  };

  const pmApp = (await es.findMany('api::app.app', { filters: { slug: 'pm' }, limit: 1 }))[0];
  assert.ok(pmApp, 'pm app should be seeded by bootstrap');
  async function seedOrg(n) {
    const user = await app.db.query('plugin::users-permissions.user').create({
      data: { username: `e2e-intake-${n}`, email: `intake${n}@e2e.test`, provider: 'local', confirmed: true, blocked: false, password: 'x' },
    });
    const org = await es.create('api::organization.organization', { data: { name: `Intake Org ${n}`, slug: `intake-org-${n}-${Date.now()}`, owner: user.id } });
    await addMember(app, { orgId: org.id, userId: user.id, role: 'Admin' });
    await es.create('api::subscription.subscription', {
      data: { organization: org.id, app: pmApp.id, status: 'trial', startDate: new Date(), trialEndsAt: new Date(Date.now() + 10 * 86400000) },
    });
    const project = await es.create('api::project.project', { data: { name: `Website ${n}`, organization: org.id, projectManager: user.id } });
    const list = { id: await ensureDefaultTaskList(app, project.id, org.id) };
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    return { org, user, token, project, list };
  }
  const A = await seedOrg(1);
  const B = await seedOrg(2);

  const api = async (who, method, p, body) => {
    const res = await fetch(base + p, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${who.token}`, 'X-Organization-Id': String(who.org.id) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const post = async (p, body, headers = {}) => {
    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const res = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: raw });
    return { status: res.status, json: await res.json().catch(() => null) };
  };
  const tasksOf = (who) => es.findMany(TASK, { filters: { organization: who.org.id }, populate: { taskList: { fields: ['id'] }, projects: { fields: ['id'] } } });

  let form;
  let email;
  await check('settings: unauthenticated and other-org requests are rejected', async () => {
    assert.ok([401, 403].includes((await fetch(`${base}/pm-intake/projects/${A.project.id}`)).status));
    const r = await api(B, 'GET', `/pm-intake/projects/${A.project.id}`);
    assert.equal(r.status, 404);
  });
  await check('settings: availability lists WhatsApp as not available yet', async () => {
    const r = await api(A, 'GET', `/pm-intake/projects/${A.project.id}`);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.data.availability.whatsapp.available, false);
    assert.equal(r.json.data.availability.email.available, true);
    const w = await api(A, 'POST', `/pm-intake/projects/${A.project.id}`, { channel: 'whatsapp' });
    assert.equal(w.status, 400);
  });
  await check('settings: create a form and an email channel', async () => {
    const f = await api(A, 'POST', `/pm-intake/projects/${A.project.id}`, {
      channel: 'form',
      fields: [{ label: 'What do you need?', type: 'textarea', required: true }, { label: 'Team', type: 'select', options: ['Design', 'Dev'] }],
      settings: { priority: 'high', successMessage: 'Got it!' },
    });
    assert.equal(f.status, 201, JSON.stringify(f.json));
    form = f.json.data;
    assert.equal(form.taskListId, A.list.id);
    const e = await api(A, 'POST', `/pm-intake/projects/${A.project.id}`, { channel: 'email' });
    assert.equal(e.status, 201, JSON.stringify(e.json));
    email = e.json.data;
    assert.match(email.emailAddress, /^task-[a-f0-9]{24}@in\.e2e\.test$/);
  });
  await check('settings: a task list from another project is refused', async () => {
    const r = await api(A, 'PUT', `/pm-intake/channels/${form.id}`, { taskListId: B.list.id });
    assert.equal(r.status, 400);
  });

  await check('public form: definition is served without login', async () => {
    const r = await fetch(`${base}/intake/forms/${form.secret}`).then((x) => x.json());
    assert.equal(r.data.projectName, 'Website 1');
    assert.equal(r.data.fields.length, 2);
  });
  await check('public form: invalid submission returns field errors and creates nothing', async () => {
    const r = await post(`/intake/forms/${form.secret}`, { name: '', email: 'x', values: {}, startedAt: Date.now() - 5000 });
    assert.equal(r.status, 400);
    assert.ok(r.json.error.details.errors.name && r.json.error.details.errors.what_do_you_need);
    assert.equal((await tasksOf(A)).length, 0);
  });
  await check('public form: honeypot submission looks fine but creates nothing', async () => {
    const r = await post(`/intake/forms/${form.secret}`, { name: 'Bot', email: 'b@b.co', website: 'spam', values: { what_do_you_need: 'buy' }, startedAt: Date.now() - 5000 });
    assert.equal(r.status, 200);
    assert.equal((await tasksOf(A)).length, 0);
  });
  await check('public form: valid submission creates a task in the list with submitter info', async () => {
    const r = await post(`/intake/forms/${form.secret}`, { name: 'Ada', email: 'ada@client.test', values: { what_do_you_need: 'New logo\nin SVG', team: 'Design' }, startedAt: Date.now() - 5000 });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.data.message, 'Got it!');
    const [t] = await tasksOf(A);
    assert.equal(t.name, 'New logo');
    assert.equal(t.priority, 'high');
    assert.equal(t.taskList.id, A.list.id);
    assert.deepEqual(t.projects.map((p) => p.id), [A.project.id]);
    assert.match(t.description, /Submitted by: Ada <ada@client.test>/);
    assert.match(t.description, /Team: Design/);
    const ch = await es.findOne(CHANNEL, form.id);
    assert.equal(ch.submissionCount, 1);
  });
  await check('public form: per-IP rate limit kicks in', async () => {
    resetRateLimits();
    let last;
    for (let i = 0; i < 11; i += 1) last = await post(`/intake/forms/${form.secret}`, { name: 'x', email: 'bad' });
    assert.equal(last.status, 429);
    resetRateLimits();
  });
  await check('public form: disabled or rotated forms stop working', async () => {
    const rot = await api(A, 'POST', `/pm-intake/channels/${form.id}/rotate`);
    assert.equal(rot.status, 200);
    assert.equal((await fetch(`${base}/intake/forms/${form.secret}`)).status, 404);
    form = rot.json.data;
    await api(A, 'PUT', `/pm-intake/channels/${form.id}`, { enabled: false });
    assert.equal((await fetch(`${base}/intake/forms/${form.secret}`)).status, 404);
  });

  const inbound = (emailId, to, extra = {}) =>
    JSON.stringify({
      type: 'email.received',
      created_at: new Date().toISOString(),
      data: { email_id: emailId, from: 'Grace <grace@client.test>', to: [to], subject: 'Banner refresh', attachments: [{ id: 'at_1', filename: 'brief.txt' }], ...extra },
    });

  await check('email: unsigned or tampered webhook is rejected', async () => {
    const body = inbound('em_1', email.emailAddress);
    assert.equal((await post('/intake/email/resend', body)).status, 401);
    const h = svixHeaders(body);
    assert.equal((await post('/intake/email/resend', body.replace('Banner', 'Evil'), h)).status, 401);
    assert.equal((await tasksOf(A)).length, 1);
  });
  await check('email: signed webhook creates a task with body and the attachment', async () => {
    const body = inbound('em_1', email.emailAddress);
    const r = await post('/intake/email/resend', body, svixHeaders(body));
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.ok(r.json.taskId, JSON.stringify(r.json));
    const t = await es.findOne(TASK, r.json.taskId, { populate: { taskList: { fields: ['id'] } } });
    assert.equal(t.name, 'Banner refresh');
    assert.match(t.description, /From: Grace <grace@client.test>/);
    assert.match(t.description, /refresh the homepage banner/);
    assert.equal(t.taskList.id, A.list.id);
    const files = await es.findMany('api::entity-attachment.entity-attachment', { filters: { subjectType: 'task', subjectId: t.id } });
    assert.equal(files.length, 1);
    assert.equal(files[0].fileName, 'brief.txt');
  });
  await check('email: redelivery of the same email does not duplicate', async () => {
    const body = inbound('em_1', email.emailAddress);
    const r = await post('/intake/email/resend', body, svixHeaders(body));
    assert.equal(r.json.ignored, 'duplicate');
  });
  await check('email: unknown address and other domains are ignored', async () => {
    for (const to of ['task-aaaaaaaaaaaaaaaaaaaaaaaa@in.e2e.test', email.emailAddress.replace('in.e2e.test', 'evil.test')]) {
      const body = inbound(`em_${crypto.randomBytes(3).toString('hex')}`, to);
      const r = await post('/intake/email/resend', body, svixHeaders(body));
      assert.equal(r.json.ignored, 'no channel');
    }
  });
  await check('email: allowed-sender domains are enforced', async () => {
    await api(A, 'PUT', `/pm-intake/channels/${email.id}`, { settings: { allowedSenderDomains: ['partner.test'] } });
    const body = inbound('em_2', email.emailAddress);
    const r = await post('/intake/email/resend', body, svixHeaders(body));
    assert.equal(r.json.ignored, 'sender not allowed');
  });

  for (const r of results) console.log(r.join('  '));
  const failed = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  await app.destroy();
  for (const f of [dbFile, `${dbFile}-shm`, `${dbFile}-wal`]) fs.rmSync(path.join(__dirname, '..', f), { force: true });
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
