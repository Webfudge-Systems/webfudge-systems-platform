'use strict';

/**
 * W16 AI project planner against a real Strapi on a throwaway SQLite database, with the mocked
 * model provider (no API key needed).   npm run test:ai   (from apps/backend)
 *
 * Covers: brief → plan (metered as work.project_plan), SOW upload as PDF (sent to the model as a
 * document block), Word and text files (extracted text), the edited plan → project in one call
 * (phases as task lists, owners by role, estimates, dependencies), deal handoff (deal + proposal
 * as scope, created through /deals/:id/delivery-project), credits exhausted (402), permissions and
 * the AI_ENABLED gate.
 */

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');

const DB_REL = `.tmp/test-ai-planner-${process.pid}-${Date.now()}.db`;
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
let provider;
const ids = {};

const realLog = console.log;
console.log = (...args) => {
  if (process.env.TEST_VERBOSE) realLog(...args);
};

async function api(method, url, { token, body, org, form } = {}) {
  const res = await fetch(`${base}/api${url}`, {
    method,
    headers: {
      ...(form ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(org ? { 'X-Organization-Id': String(org) } : {}),
    },
    body: form || (body ? JSON.stringify(body) : undefined),
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

/** Minimal .docx: a zip with word/document.xml (deflated). */
function makeDocx(paragraphs) {
  const xml = Buffer.from(
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="x"><w:body>${paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('')}</w:body></w:document>`
  );
  const name = Buffer.from('word/document.xml');
  const data = zlib.deflateRawSync(xml);
  const crc = zlib.crc32 ? zlib.crc32(xml) : 0;
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(crc >>> 0, 14);
  local.writeUInt32LE(data.length, 18);
  local.writeUInt32LE(xml.length, 22);
  local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4);
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10);
  central.writeUInt32LE(crc >>> 0, 16);
  central.writeUInt32LE(data.length, 20);
  central.writeUInt32LE(xml.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(0, 42);
  const cdOffset = local.length + name.length + data.length;
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + name.length, 12);
  end.writeUInt32LE(cdOffset, 16);
  return Buffer.concat([local, name, data, central, name, end]);
}

before(async () => {
  const { createStrapi, compileStrapi } = require('@strapi/strapi');
  const ctx = await compileStrapi();
  app = await createStrapi(ctx).load();
  app.server.mount();
  await new Promise((resolve) => app.server.httpServer.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${app.server.httpServer.address().port}`;

  const { createMockProvider } = require('@webfudge/ai');
  const { mockRespond } = require('../../src/utils/ai/mock-responder');
  provider = createMockProvider({ respond: mockRespond });
  require('../../src/utils/ai').setProvider(provider);

  const { addMember } = require('../../src/utils/saas-org');
  const appRow = async (slug) => (await app.entityService.findMany('api::app.app', { filters: { slug }, limit: 1 }))[0];
  const [crmApp, pmApp] = [await appRow('crm'), await appRow('pm')];
  assert.ok(crmApp && pmApp, 'SaaS catalog seeded crm and pm');

  const plans = { A: 'standard', B: 'free' }; // Pro (100 AI credits per app) vs Free (0)
  for (const key of ['A', 'B']) {
    const org = await create('api::organization.organization', { name: `Planner Org ${key}`, slug: `planner-org-${key.toLowerCase()}-${Date.now()}` });
    ids[`org${key}`] = org.id;
    for (const a of [crmApp, pmApp]) {
      await create('api::subscription.subscription', {
        organization: org.id,
        app: a.id,
        status: 'active',
        planCode: plans[key],
        startDate: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 864e5),
        totalUsers: 5,
      });
    }
  }
  const user = async (key, orgKey, role) => {
    const u = await app.plugin('users-permissions').service('user').add({
      username: `pl${key}${Date.now()}`,
      email: `planner-${key.toLowerCase()}@team.test`,
      password: 'Passw0rd!x',
      confirmed: true,
      provider: 'local',
    });
    await addMember(app, { orgId: ids[`org${orgKey}`], userId: u.id, role });
    ids[`user${key}`] = u.id;
    ids[`jwt${key}`] = app.plugin('users-permissions').service('jwt').issue({ id: u.id });
  };
  await user('A', 'A', 'Admin');
  await user('Ad', 'A', 'Admin'); // a designer on the team
  await user('Am', 'A', 'Member');
  await user('B', 'B', 'Admin');

  const deal = await create('api::deal.deal', { organization: ids.orgA, name: 'Acme corporate website', value: 250000, stage: 'won', assignedTo: ids.userA, description: 'Five-page corporate site with a blog.' });
  ids.dealA = deal.id;
  await create('api::proposal.proposal', {
    organization: ids.orgA,
    deal: deal.id,
    title: 'Acme website SOW',
    projectName: 'Acme website',
    projectOverview: 'Design and build a five-page marketing website on WordPress.',
    modules: [{ name: 'Homepage' }, { name: 'Services' }, { name: 'Blog' }],
    estimatedTimeline: '6 weeks',
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

test('brief → editable plan with phases, roles, estimates and dependencies (metered, nothing saved)', async () => {
  const before = provider.calls.length;
  const projectsBefore = await app.entityService.count('api::project.project', { filters: { organization: ids.orgA } });
  const res = await api('POST', '/projects/ai-plan', { ...as('A'), body: { brief: 'Corporate website for a steel company: 5 pages, contact form, blog.', startDate: '2026-12-01' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const d = res.body.data;
  assert.ok(d.plan.phases.length >= 2);
  assert.equal(d.plan.totals.tasks, 9);
  assert.ok(d.plan.totals.hours > 0);
  assert.ok(d.plan.roles.some((r) => r.key === 'designer' && r.label === 'Designer'));
  const all = d.plan.phases.flatMap((p) => p.tasks);
  const approval = all.find((t) => t.name === 'Design approval');
  assert.deepEqual(approval.dependsOn, ['T4', 'T5']);
  assert.equal(approval.type, 'milestone');
  assert.equal(d.model, 'claude-sonnet-5-5'); // plan → strong tier
  assert.ok(d.creditsUsed >= 1);

  const call = provider.calls[before];
  assert.ok(call.jsonSchema.properties.phases, 'structured output schema sent');
  assert.match(call.system, /delivery plan/);
  assert.match(call.messages[0].content, /steel company/);
  assert.match(call.messages[0].content, /2026-12-01/);

  const usage = await app.entityService.findMany('api::ai.ai-usage', { filters: { organization: ids.orgA, feature: 'work.project_plan' } });
  assert.equal(usage.length, 1);
  assert.equal(usage[0].app, 'pm');
  assert.equal(await app.entityService.count('api::project.project', { filters: { organization: ids.orgA } }), projectsBefore, 'generating saves nothing');
  ids.plan = d.plan;
});

test('SOW upload: a PDF goes to the model as a document block; Word and text files as text', async () => {
  let before = provider.calls.length;
  const pdf = new FormData();
  pdf.append('document', new Blob([Buffer.from('%PDF-1.4\n% fake sow\n')], { type: 'application/pdf' }), 'sow.pdf');
  pdf.append('startDate', '2026-12-01');
  let res = await api('POST', '/projects/ai-plan', { ...as('A'), form: pdf });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.source.document, 'pdf');
  const content = provider.calls[before].messages[0].content;
  assert.ok(Array.isArray(content));
  assert.equal(content[0].type, 'document');
  assert.equal(content[0].source.media_type, 'application/pdf');
  assert.match(content[1].text, /attached document is the statement of work/);

  before = provider.calls.length;
  const docx = new FormData();
  docx.append('document', new Blob([makeDocx(['Scope: shoot a 60 second brand video', 'Deliverables: one reel &amp; cutdowns'])]), 'sow.docx');
  res = await api('POST', '/projects/ai-plan', { ...as('A'), form: docx });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.source.document, 'text');
  assert.match(provider.calls[before].messages[0].content, /shoot a 60 second brand video\nDeliverables: one reel & cutdowns/);
  assert.equal(res.body.data.plan.projectName, 'Brand video');

  const txt = new FormData();
  txt.append('document', new Blob(['Monthly SEO retainer'], { type: 'text/plain' }), 'brief.txt');
  res = await api('POST', '/projects/ai-plan', { ...as('A'), form: txt });
  assert.equal(res.status, 200, JSON.stringify(res.body));

  const bad = new FormData();
  bad.append('document', new Blob([Buffer.from([1, 2, 3])], { type: 'image/png' }), 'logo.png');
  res = await api('POST', '/projects/ai-plan', { ...as('A'), form: bad });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.details.code, 'AI_DOCUMENT_UNSUPPORTED');
});

test('edited plan → project in one click: phases as lists, owners by role, estimates, dependencies', async () => {
  const plan = JSON.parse(JSON.stringify(ids.plan));
  // The person edits the preview: renames a task, changes an estimate, removes one task.
  plan.phases[0].tasks[0].name = 'Kickoff workshop';
  plan.phases[1].tasks[0].estimateHours = 20;
  plan.phases[2].tasks = plan.phases[2].tasks.filter((t) => t.name !== 'QA and client review');

  const res = await api('POST', '/projects/ai-plan/create', {
    ...as('A'),
    body: { plan, project: { name: 'Acme Steel website', startDate: '2026-12-01' }, roleAssignments: { designer: ids.userAd, developer: 999999 } },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  const projectId = res.body.data.id;
  assert.equal(res.body.meta.tasksCreated, 8);
  assert.equal(res.body.meta.listsCreated, 3);

  const project = await app.entityService.findOne('api::project.project', projectId, { populate: { teamMembers: { fields: ['id'] }, projectManager: { fields: ['id'] }, workspace: { fields: ['id'] } } });
  assert.equal(project.name, 'Acme Steel website');
  assert.equal(project.projectManager.id, ids.userA);
  assert.ok(project.workspace, 'put in the default workspace');
  assert.ok(project.teamMembers.some((u) => u.id === ids.userAd), 'assigned designer joins the team');

  const lists = await app.entityService.findMany('api::task-list.task-list', { filters: { project: projectId }, sort: { sortOrder: 'asc' } });
  assert.deepEqual(lists.map((l) => l.name), ['Discovery', 'Design', 'Build & launch']);
  assert.deepEqual(lists.map((l) => l.isDefault), [true, false, false]);

  const tasks = await app.entityService.findMany('api::task.task', { filters: { projects: { id: projectId } }, populate: { assignee: { fields: ['id'] }, taskList: { fields: ['id', 'name'] } }, limit: 100 });
  const byName = Object.fromEntries(tasks.map((t) => [t.name, t]));
  assert.ok(byName['Kickoff workshop']);
  assert.equal(byName['Kickoff workshop'].assignee.id, ids.userA, 'Project manager role → the project manager');
  assert.equal(byName.Wireframes.assignee.id, ids.userAd);
  assert.equal(Number(byName.Wireframes.estimatedHours), 20);
  assert.equal(byName.Wireframes.taskList.name, 'Design');
  assert.equal(byName['Build pages'].assignee, null, 'non-members are never assigned');
  assert.equal(byName['Design approval'].taskType, 'milestone');
  const deps = byName['Design approval'].dependsOn.map((d) => d.taskId).sort();
  assert.deepEqual(deps, [byName.Wireframes.id, byName['Website copy'].id].sort());
  assert.equal(byName['Design approval'].dependsOn[0].type, 'FS');
  // Go live depended on the removed QA task: that link is dropped, the task stays.
  assert.deepEqual(byName['Go live'].dependsOn || [], []);
  assert.equal(new Date(byName['Kickoff workshop'].startDate).toISOString().slice(0, 10), '2026-12-01');
  assert.ok(new Date(byName.Wireframes.startDate) >= new Date(byName['Sitemap and page list'].scheduledDate));
});

test('deal handoff: the won deal and its SOW proposal are the scope; the plan becomes its delivery project', async () => {
  const before = provider.calls.length;
  let res = await api('POST', '/projects/ai-plan', { ...as('A'), body: { dealId: ids.dealA } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.source.dealId, ids.dealA);
  assert.equal(res.body.data.source.proposals.length, 1);
  const prompt = provider.calls[before].messages[0].content;
  assert.match(prompt, /Acme corporate website/);
  assert.match(prompt, /five-page marketing website on WordPress/);

  res = await api('POST', `/deals/${ids.dealA}/delivery-project`, {
    ...as('A'),
    body: { aiPlan: res.body.data.plan, projectName: 'Acme website delivery', startDate: '2026-12-07', invoicePlan: 'none' },
  });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal(res.body.meta.aiPlan, true);
  assert.equal(res.body.meta.tasksCreated, 9);
  const project = await app.entityService.findOne('api::project.project', res.body.data.id, { populate: { sourceDeal: { fields: ['id'] }, workspace: { fields: ['id'] } } });
  assert.equal(project.name, 'Acme website delivery');
  assert.equal(project.sourceDeal.id, ids.dealA);
  assert.equal(Number(project.budget), 250000);
  assert.ok(project.workspace);
});

test('free plan: 402 AI credits exhausted before the model is called', async () => {
  const before = provider.calls.length;
  const res = await api('POST', '/projects/ai-plan', { ...as('B'), body: { brief: 'A website' } });
  assert.equal(res.status, 402, JSON.stringify(res.body));
  assert.equal(res.body.error.details.code, 'AI_CREDITS_EXHAUSTED');
  assert.equal(res.body.error.details.app, 'pm');
  assert.equal(provider.calls.length, before);
});

test('permissions and input checks', async () => {
  let res = await api('POST', '/projects/ai-plan', { ...as('Am'), body: { brief: 'A website' } });
  assert.equal(res.status, 403, 'members cannot plan new projects');
  res = await api('POST', '/projects/ai-plan', { ...as('Am'), body: { dealId: ids.dealA } });
  assert.equal(res.status, 403, 'only the deal owner or a deals manager can plan its delivery');
  res = await api('POST', '/projects/ai-plan', { ...as('B'), body: { dealId: ids.dealA } });
  assert.equal(res.status, 404, 'other orgs cannot see the deal');
  res = await api('POST', '/projects/ai-plan', { ...as('A'), body: {} });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.details.code, 'AI_PLAN_NO_INPUT');
  res = await api('POST', '/projects/ai-plan/create', { ...as('A'), body: { plan: { phases: [] }, project: { name: 'Empty' } } });
  assert.equal(res.status, 400);
  res = await api('POST', '/projects/ai-plan/create', { ...as('Am'), body: { plan: ids.plan, project: { name: 'X' } } });
  assert.equal(res.status, 403);
});

test('AI_ENABLED gate: switched off → 403 AI_DISABLED', async () => {
  process.env.AI_ENABLED = 'false';
  try {
    const res = await api('POST', '/projects/ai-plan', { ...as('A'), body: { brief: 'A website' } });
    assert.equal(res.status, 403);
    assert.equal(res.body.error.details.code, 'AI_DISABLED');
  } finally {
    process.env.AI_ENABLED = 'true';
  }
});
