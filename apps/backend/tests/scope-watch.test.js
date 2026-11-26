'use strict';

/**
 * W19 risk radar + scope-creep watcher against a real Strapi on a throwaway SQLite database, with
 * the mocked model provider (no API key).   npm run test:risk-radar   (from apps/backend)
 *
 * Acceptance: an out-of-scope client request is flagged with a draft change order (AI approval queue).
 * Also: in-scope requests are not flagged, client portal comments are checked, the change order is
 * approved / sent through the queue, plan gating (Free → 402), the risk radar for a project and the
 * portfolio, and the AI explanation.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const DB_REL = `.tmp/test-w19-${process.pid}-${Date.now()}.db`;
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
  AI_ENABLED: 'true',
  AI_PROVIDER: 'mock',
});
for (const k of ['RESEND_API_KEY', 'REDIS_URL', 'ANTHROPIC_API_KEY', 'AI_EMBEDDINGS_PROVIDER', 'AI_CREDIT_USD', 'AI_MIN_CREDITS_PER_CALL']) delete process.env[k];

let app;
let base;
const ids = {};
const realLog = console.log;
console.log = (...args) => {
  if (process.env.TEST_VERBOSE) realLog(...args);
};

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
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString();

const SOW = `Statement of work: Acme website redesign.
Deliverables: a five page marketing website (home, about, services, blog, contact), responsive design,
one round of design revisions, content migration of existing blog posts, basic on-page SEO setup.
Out of scope: e-commerce, mobile apps, paid advertising.`;

let provider;

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  app = await createStrapi(await compileStrapi()).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  const { createMockProvider } = require('@webfudge/ai');
  const { mockRespond } = require('../src/utils/ai/mock-responder');
  provider = createMockProvider({ respond: mockRespond });
  require('../src/utils/ai').setProvider(provider);

  const { addMember } = require('../src/utils/saas-org');
  const [pmApp] = await app.entityService.findMany('api::app.app', { filters: { slug: 'pm' }, limit: 1 });
  assert.ok(pmApp, 'SaaS catalog seeded the pm app');
  const plans = { A: 'professional', B: 'free' }; // Work Business vs Free
  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `W19 Org ${key}`, slug: `w19-org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    await create('api::subscription.subscription', { organization: org.id, app: pmApp.id, status: 'active', planCode: plans[key], startDate: new Date(), currentPeriodEnd: new Date(Date.now() + 30 * 864e5), totalUsers: 5 });
  }
  const user = async (key, orgKey, role, name) => {
    const u = await app.plugin('users-permissions').service('user').add({ username: `w19${key}${Date.now()}`, firstName: name, email: `w19-${key.toLowerCase()}@team.test`, password: 'Passw0rd!x', confirmed: true, provider: 'local' });
    const m = await addMember(app, { orgId: ids[`org${orgKey}`], userId: u.id, role });
    ids[`user${key}`] = u.id;
    ids[`member${key}`] = m.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  };
  await user('A', 'A', 'Admin', 'Asha');
  await user('A2', 'A', 'Member', 'Ravi');
  await user('B', 'B', 'Admin', 'Bina');

  const project = await create('api::project.project', {
    name: 'Acme website',
    organization: ids.orgA,
    status: 'IN_PROGRESS',
    startDate: day(-20),
    endDate: day(5),
    hourlyRate: 2000,
    currency: 'INR',
    projectManager: ids.userA,
    teamMembers: [ids.userA, ids.userA2],
  });
  ids.project = project.id;
  ids.projectB = (await create('api::project.project', { name: 'Free org project', organization: ids.orgB, status: 'IN_PROGRESS' })).id;

  const contact = await create('api::contact.contact', { firstName: 'Carla', lastName: 'Client', email: 'carla@acme.test', organization: ids.orgA });
  ids.contact = contact.id;

  const task = async (data) => (await create('api::task.task', { organization: ids.orgA, projects: [ids.project], status: 'SCHEDULED', priority: 'medium', taskType: 'task', ...data })).id;
  // Client requests from the portal (W10)
  ids.outTask = await task({ name: 'Build an Android mobile app', description: 'Please build an Android and iOS mobile app with push notifications and in-app checkout.', tags: ['client-request'], clientRequestedBy: ids.contact });
  ids.inTask = await task({ name: 'Migrate blog posts', description: 'Content migration of the existing blog posts to the new website.', tags: ['client-request'], clientRequestedBy: ids.contact });
  // Risk radar: an overdue chain and an overloaded assignee
  ids.design = await task({ name: 'Homepage design', status: 'IN_PROGRESS', startDate: day(-10), scheduledDate: day(-3), assignee: ids.userA, estimatedHours: 30 });
  ids.build = await task({ name: 'Homepage build', startDate: day(0), scheduledDate: day(2), assignee: ids.userA, estimatedHours: 30, dependsOn: [{ taskId: ids.design, type: 'FS', lagDays: 0 }] });
  await task({ name: 'Done task', status: 'COMPLETED', completedAt: day(-2) });
  // A client comment from the portal asking for extra work
  await create('api::crm-activity.crm-activity', {
    organization: ids.orgA,
    action: 'comment',
    subjectType: 'task',
    subjectId: ids.inTask,
    summary: 'Carla Client (client) commented',
    meta: { comment: 'Also run a paid Google advertising campaign for the launch.', source: 'client_portal', clientContactId: ids.contact, clientName: 'Carla Client' },
  });
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

test('Free plan: risk radar and scope watcher answer 402 PLAN_FEATURE_REQUIRED', async () => {
  const r1 = await api('GET', `/risk-radar/projects/${ids.projectB}`, as('B'));
  assert.equal(r1.status, 402, JSON.stringify(r1.body));
  assert.equal(r1.body.error.details.code, 'PLAN_FEATURE_REQUIRED');
  assert.equal(r1.body.error.details.feature, 'pm.risk_radar');
  const r2 = await api('GET', `/scope-watch/projects/${ids.projectB}`, as('B'));
  assert.equal(r2.status, 402);
  assert.equal(r2.body.error.details.feature, 'pm.scope_watch');
});

test('risk radar: overdue chain, overload and forecast for the project', async () => {
  const res = await api('GET', `/risk-radar/projects/${ids.project}`, as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.ok(['medium', 'high'].includes(d.level), `level ${d.level}`);
  assert.equal(d.chains[0].root.id, ids.design);
  assert.ok(d.chains[0].blocked.some((b) => b.id === ids.build));
  const build = d.tasks.find((t) => t.id === ids.build);
  assert.ok(build.factors.includes('chain'), JSON.stringify(build));
  assert.ok(d.tasks.some((t) => t.factors.includes('overload')), 'Asha has 60 h in a 40 h week');
  assert.ok(d.reassignments.some((r) => r.to.id === ids.userA2), 'suggests moving work to Ravi');
  assert.equal(d.forecast.method, 'throughput');
  assert.equal(res.body.meta.manager, true);
});

test('risk radar: members do not see teammates’ utilization or reassignment suggestions', async () => {
  const res = await api('GET', `/risk-radar/projects/${ids.project}`, as('A2'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.meta.manager, false);
  assert.deepEqual(res.body.data.reassignments, []);
  assert.ok(!JSON.stringify(res.body.data.tasks).includes('% of capacity'));
});

test('risk radar portfolio lists the project with its level', async () => {
  const res = await api('GET', '/risk-radar/portfolio', as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const row = res.body.data.projects.find((p) => p.id === ids.project);
  assert.ok(row);
  assert.ok(row.counts.overdue >= 1);
  assert.ok(res.body.data.summary.total >= 1);
});

test('risk radar explanation uses Fudge AI and is metered', async () => {
  const res = await api('POST', `/risk-radar/projects/${ids.project}/explain`, as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.ok(res.body.data.headline);
  assert.ok(Array.isArray(res.body.data.actions));
  const usage = await app.entityService.findMany('api::ai.ai-usage', { filters: { organization: ids.orgA, feature: 'work.risk_explain' } });
  assert.equal(usage.length, 1);
});

test('scope check without a SOW explains what to do', async () => {
  const res = await api('POST', `/scope-watch/projects/${ids.project}/check`, as('A'));
  assert.equal(res.status, 400, JSON.stringify(res.body));
  assert.equal(res.body.error.details.code, 'SCOPE_SOW_MISSING');
});

test('members without edit rights cannot change the SOW', async () => {
  const res = await api('PUT', `/scope-watch/projects/${ids.project}/sow`, { ...as('A2'), body: { sowText: SOW } });
  assert.equal(res.status, 403, JSON.stringify(res.body));
});

test('ACCEPTANCE: an out-of-scope client request is flagged with a draft change order', async () => {
  const put = await api('PUT', `/scope-watch/projects/${ids.project}/sow`, { ...as('A'), body: { sowText: SOW } });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.equal(put.body.data.sow.configured, true);

  const before = await api('GET', `/scope-watch/projects/${ids.project}`, as('A'));
  assert.equal(before.body.data.unchecked, 3, 'two portal requests + one portal comment');

  const res = await api('POST', `/scope-watch/projects/${ids.project}/check`, as('A'));
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.equal(d.checked.length, 3);
  const out = d.checked.find((c) => c.task?.id === ids.outTask && c.sourceType === 'client_request');
  assert.equal(out.verdict, 'out_of_scope', JSON.stringify(out));
  assert.ok(out.changeOrder, 'change order drafted');
  assert.equal(out.changeOrder.status, 'pending_approval');
  assert.equal(out.changeOrder.to, 'carla@acme.test');
  assert.ok(out.changeOrder.subject && out.changeOrder.body);
  const inScope = d.checked.find((c) => c.sourceKey === `task:${ids.inTask}`);
  assert.equal(inScope.verdict, 'in_scope', JSON.stringify(inScope));
  assert.equal(inScope.changeOrder, null);
  const comment = d.checked.find((c) => c.sourceType === 'change_request');
  assert.equal(comment.verdict, 'out_of_scope', JSON.stringify(comment));
  assert.equal(d.drafted, 2);
  ids.changeOrderId = out.changeOrder.id;
  ids.commentOrderId = comment.changeOrder.id;

  // It is in the AI approval queue for Work.
  const queue = await api('GET', '/ai/actions?app=pm', as('A'));
  assert.equal(queue.status, 200);
  const row = queue.body.data.find((a) => a.id === ids.changeOrderId);
  assert.ok(row, 'in the approval queue');
  assert.equal(row.outbound, true);
  assert.equal(row.input.to, 'carla@acme.test');

  // Re-running finds nothing new.
  const again = await api('POST', `/scope-watch/projects/${ids.project}/check`, as('A'));
  assert.equal(again.status, 200);
  assert.equal(again.body.data.checked.length, 0);
});

test('approving the change order sends it and logs it on the task; rejecting closes it', async () => {
  const ok = await api('POST', `/ai/actions/${ids.changeOrderId}/approve`, as('A'));
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const view = await api('GET', `/scope-watch/projects/${ids.project}`, as('A'));
  const row = view.body.data.checks.find((c) => c.changeOrder?.id === ids.changeOrderId);
  assert.equal(row.changeOrder.status, 'executed');
  const log = await app.entityService.findMany('api::crm-activity.crm-activity', { filters: { organization: ids.orgA, subjectType: 'task', subjectId: ids.outTask } });
  assert.ok(log.some((l) => l.meta?.changeOrder === true), 'change order logged on the task');

  const no = await api('POST', `/ai/actions/${ids.commentOrderId}/reject`, { ...as('A'), body: { reason: 'Covered by retainer' } });
  assert.equal(no.status, 200, JSON.stringify(no.body));
  const portfolio = await api('GET', '/scope-watch/portfolio', as('A'));
  assert.equal(portfolio.status, 200);
  const p = portfolio.body.data.projects.find((x) => x.id === ids.project);
  assert.equal(p.outOfScope, 1, 'rejected change order no longer counts');
});

test('force re-check of one task replaces its verdict', async () => {
  const res = await api('POST', `/scope-watch/projects/${ids.project}/check`, { ...as('A'), body: { taskId: ids.inTask, force: true } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.checked.length, 1);
  const view = await api('GET', `/scope-watch/projects/${ids.project}`, as('A'));
  assert.equal(view.body.data.checks.filter((c) => c.sourceKey === `task:${ids.inTask}`).length, 1);
});
