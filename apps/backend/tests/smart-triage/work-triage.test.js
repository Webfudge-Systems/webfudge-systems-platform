'use strict';

/**
 * W20 smart triage + meeting → tasks. Pure helpers and the AI flows with a fake Strapi and the
 * mock provider from @webfudge/ai (no API key, no database).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAiClient, createMockProvider } = require('@webfudge/ai');
const triage = require('../../src/utils/ai/work-triage');

const TODAY = '2026-11-26';

const TEAM = [
  { userId: 1, name: 'Asha Rao', jobRole: 'Designer', capacity: 40, openHours: 38, openTasks: 6, recentWork: ['Homepage mockups'] },
  { userId: 2, name: 'Vikram Shah', jobRole: 'Developer', capacity: 40, openHours: 8, openTasks: 2, recentWork: ['API auth'] },
];
const LISTS = [{ id: 10, name: 'Backlog', projectId: 5 }, { id: 11, name: 'Design', projectId: 5 }];

function fakeStrapi(fixtures) {
  const calls = [];
  const created = [];
  const updated = [];
  const deleted = [];
  let nextId = 900;
  return {
    calls,
    created,
    updated,
    deleted,
    log: { warn() {}, info() {}, error() {} },
    entityService: {
      async findMany(uid, opts) {
        calls.push({ uid, opts });
        const f = fixtures[uid];
        return typeof f === 'function' ? f(opts) : f || [];
      },
      async findOne(uid, id) {
        const f = fixtures[`${uid}#one`];
        return typeof f === 'function' ? f(id) : f || null;
      },
      async create(uid, { data }) {
        const row = { id: nextId++, ...data };
        created.push({ uid, data });
        return row;
      },
      async update(uid, id, { data }) {
        updated.push({ uid, id, data });
        return { id, ...data };
      },
      async delete(uid, id) {
        deleted.push({ uid, id });
        return { id };
      },
    },
  };
}

const clientWith = (responses) => {
  const provider = createMockProvider({ responses });
  return { provider, client: createAiClient({ provider, env: { AI_PROVIDER: 'mock' }, retries: 0 }) };
};

// ---------- team / workload ----------

test('buildTeam sums open estimated hours and counts tasks per member', () => {
  const members = [
    { user: { id: 1, firstName: 'Asha', lastName: 'Rao' }, jobRole: 'Designer', weeklyCapacityHours: 30 },
    { user: { id: 2, username: 'vikram' }, jobRole: null, weeklyCapacityHours: null },
  ];
  const open = [
    { assignee: { id: 1 }, estimatedHours: '5.5' },
    { assignee: { id: 1 }, estimatedHours: null },
    { assignee: { id: 2 }, estimatedHours: 3 },
  ];
  const recent = [{ assignee: { id: 2 }, name: 'API auth', tags: ['backend'] }];
  const team = triage.buildTeam(members, open, recent);
  assert.deepEqual(team[0], { userId: 1, name: 'Asha Rao', jobRole: 'Designer', capacity: 30, openHours: 5.5, openTasks: 2, recentWork: [] });
  assert.equal(team[1].name, 'vikram');
  assert.equal(team[1].capacity, 40);
  assert.deepEqual(team[1].recentWork, ['API auth (backend)']);
});

// ---------- suggestion validation ----------

test('normalizeSuggestion keeps valid fields', () => {
  const s = triage.normalizeSuggestion(
    { taskId: 7, priority: 'high', assigneeId: 2, taskListId: 11, dueDate: '2026-12-01', reason: 'Dev work, Vikram has room.' },
    { team: TEAM, lists: LISTS, today: TODAY },
  );
  assert.deepEqual(s, { taskId: 7, priority: 'high', assigneeId: 2, taskListId: 11, scheduledDate: '2026-12-01', reason: 'Dev work, Vikram has room.' });
});

test('normalizeSuggestion drops assignees, lists and dates the AI made up', () => {
  const s = triage.normalizeSuggestion(
    { taskId: 7, priority: 'urgent', assigneeId: 99, taskListId: 77, dueDate: '2025-01-01', reason: 'x' },
    { team: TEAM, lists: LISTS, today: TODAY },
  );
  assert.equal(s.priority, 'medium');
  assert.equal(s.assigneeId, null);
  assert.equal(s.taskListId, null);
  assert.equal(s.scheduledDate, null);
});

// ---------- owner matching ----------

test('matchOwner finds members by full name, first name or username', () => {
  assert.equal(triage.matchOwner('Vikram Shah', TEAM), 2);
  assert.equal(triage.matchOwner('asha', TEAM), 1);
  assert.equal(triage.matchOwner('Someone Else', TEAM), null);
  assert.equal(triage.matchOwner('', TEAM), null);
});

test('normalizeActionItems maps owners, drops empty titles and past dates', () => {
  const items = triage.normalizeActionItems(
    [
      { title: ' Send revised quote ', description: 'With new pricing', owner: 'Vikram', dueDate: '2026-11-30', priority: 'high' },
      { title: '', owner: 'Asha' },
      { title: 'Book venue', owner: 'Client', dueDate: '2020-01-01', priority: 'whatever' },
    ],
    { team: TEAM, today: TODAY },
  );
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { title: 'Send revised quote', description: 'With new pricing', ownerName: 'Vikram', assigneeId: 2, scheduledDate: '2026-11-30', priority: 'high' });
  assert.equal(items[1].assigneeId, null);
  assert.equal(items[1].scheduledDate, null);
  assert.equal(items[1].priority, 'medium');
});

// ---------- AI flows ----------

const ORG = { orgId: 3, userId: 1 };

function triageFixtures() {
  return {
    'api::task.task': (opts) => {
      if (opts.filters?.id) {
        return [{ id: 7, name: 'Fix login bug', description: 'SSO fails', priority: null, projects: [{ id: 5, name: 'Website' }], clientRequestedBy: { id: 4 } }];
      }
      return [];
    },
    'api::organization-user.organization-user': [
      { user: { id: 1, firstName: 'Asha', lastName: 'Rao' }, jobRole: 'Designer', weeklyCapacityHours: 40 },
      { user: { id: 2, firstName: 'Vikram', lastName: 'Shah' }, jobRole: 'Developer', weeklyCapacityHours: 40 },
    ],
    'api::task-list.task-list': [{ id: 10, name: 'Backlog', project: { id: 5 } }],
  };
}

test('suggestTriage sends tasks, team and lists to the model and returns validated suggestions', async () => {
  const strapi = fakeStrapi(triageFixtures());
  const { client, provider } = clientWith([
    JSON.stringify({ suggestions: [{ taskId: 7, priority: 'high', assigneeId: 2, taskListId: 10, dueDate: '2026-11-28', reason: 'Bug from a client, Vikram is a developer with room.' }] }),
  ]);
  const out = await triage.suggestTriage(strapi, ORG, { taskIds: [7] }, { client, today: TODAY });
  assert.equal(out.suggestions.length, 1);
  assert.deepEqual(out.suggestions[0], { taskId: 7, priority: 'high', assigneeId: 2, taskListId: 10, scheduledDate: '2026-11-28', reason: 'Bug from a client, Vikram is a developer with room.' });
  assert.equal(out.team.length, 2);
  const prompt = JSON.stringify(provider.calls[0].messages);
  assert.match(prompt, /Fix login bug/);
  assert.match(prompt, /Vikram Shah/);
  assert.match(prompt, /Backlog/);
  // tasks are always loaded scoped to the org
  const taskCall = strapi.calls.find((c) => c.uid === 'api::task.task' && c.opts.filters?.id);
  assert.equal(taskCall.opts.filters.organization, 3);
});

test('suggestTriage rejects an empty or oversized selection before calling the model', async () => {
  const strapi = fakeStrapi(triageFixtures());
  const { client, provider } = clientWith([]);
  await assert.rejects(triage.suggestTriage(strapi, ORG, { taskIds: [] }, { client }), { code: 'AI_BAD_REQUEST' });
  await assert.rejects(triage.suggestTriage(strapi, ORG, { taskIds: Array.from({ length: 26 }, (_, i) => i + 1) }, { client }), { code: 'AI_BAD_REQUEST' });
  assert.equal(provider.calls.length, 0);
});

test('suggestTriage fills in a no-change suggestion for tasks the model skipped', async () => {
  const strapi = fakeStrapi(triageFixtures());
  const { client } = clientWith([JSON.stringify({ suggestions: [] })]);
  const out = await triage.suggestTriage(strapi, ORG, { taskIds: [7] }, { client, today: TODAY });
  assert.equal(out.suggestions[0].taskId, 7);
  assert.equal(out.suggestions[0].assigneeId, null);
});

test('extractMeetingTasks returns a preview of action items from pasted notes', async () => {
  const strapi = fakeStrapi({
    ...triageFixtures(),
    'api::meeting.meeting#one': { id: 20, title: 'Kickoff', startTime: '2026-11-25T10:00:00Z', notes: '', organization: { id: 3 } },
  });
  const { client, provider } = clientWith([
    JSON.stringify({ items: [{ title: 'Share wireframes', description: '', owner: 'Asha', dueDate: '2026-12-02', priority: 'medium' }] }),
  ]);
  const out = await triage.extractMeetingTasks(strapi, ORG, 20, { notes: 'Asha to share wireframes by Dec 2.' }, { client, today: TODAY });
  assert.equal(out.meeting.id, 20);
  assert.deepEqual(out.items[0], { title: 'Share wireframes', description: '', ownerName: 'Asha', assigneeId: 1, scheduledDate: '2026-12-02', priority: 'medium' });
  assert.match(JSON.stringify(provider.calls[0].messages), /share wireframes by Dec 2/);
});

test('extractMeetingTasks refuses a meeting from another organization', async () => {
  const strapi = fakeStrapi({ ...triageFixtures(), 'api::meeting.meeting#one': { id: 20, organization: { id: 999 } } });
  const { client } = clientWith([]);
  await assert.rejects(triage.extractMeetingTasks(strapi, ORG, 20, { notes: 'x' }, { client }), { code: 'AI_SUBJECT_NOT_FOUND' });
});

test('extractMeetingTasks needs notes (pasted or saved on the meeting)', async () => {
  const strapi = fakeStrapi({ ...triageFixtures(), 'api::meeting.meeting#one': { id: 20, notes: '  ', organization: { id: 3 } } });
  const { client } = clientWith([]);
  await assert.rejects(triage.extractMeetingTasks(strapi, ORG, 20, { notes: '' }, { client }), { code: 'AI_BAD_REQUEST' });
});

// ---------- actions (write paths: audited + undoable) ----------

function actionDefs(strapi) {
  const defs = {};
  triage.registerWorkTriageActions({ define: (d) => (defs[d.key] = d) }, strapi);
  return defs;
}

test('work.task.apply_triage updates only the accepted fields and undo restores them', async () => {
  const strapi = fakeStrapi({
    'api::task.task#one': { id: 7, name: 'Fix login bug', priority: 'low', scheduledDate: null, assignee: null, taskList: null, organization: { id: 3 } },
    'api::organization-user.organization-user': [{ id: 1 }],
  });
  const def = actionDefs(strapi)['work.task.apply_triage'];
  assert.equal(def.outbound, undefined);
  const out = await def.execute({ taskId: 7, priority: 'high', assigneeId: 2 }, { orgId: 3 });
  assert.deepEqual(strapi.updated[0], { uid: 'api::task.task', id: 7, data: { priority: 'high', assignee: 2 } });
  assert.deepEqual(out.undoData, { taskId: 7, previous: { priority: 'low', assignee: null } });
  await def.undo(out.undoData, { orgId: 3 });
  assert.deepEqual(strapi.updated[1].data, { priority: 'low', assignee: null });
});

test('work.task.apply_triage refuses an assignee who is not in the organization', async () => {
  const strapi = fakeStrapi({ 'api::task.task#one': { id: 7, organization: { id: 3 } }, 'api::organization-user.organization-user': [] });
  const def = actionDefs(strapi)['work.task.apply_triage'];
  await assert.rejects(def.execute({ taskId: 7, assigneeId: 55 }, { orgId: 3 }), /not a member/i);
  assert.equal(strapi.updated.length, 0);
});

test('work.task.apply_triage refuses a task from another organization', async () => {
  const strapi = fakeStrapi({ 'api::task.task#one': { id: 7, organization: { id: 999 } } });
  const def = actionDefs(strapi)['work.task.apply_triage'];
  await assert.rejects(def.execute({ taskId: 7, priority: 'high' }, { orgId: 3 }), /not found/i);
});

test('work.meeting.create_tasks creates linked tasks and undo deletes them', async () => {
  const strapi = fakeStrapi({
    'api::meeting.meeting#one': { id: 20, title: 'Kickoff', organization: { id: 3 } },
    'api::project.project#one': { id: 5, organization: { id: 3 } },
    'api::organization-user.organization-user': [{ id: 1 }],
  });
  const def = actionDefs(strapi)['work.meeting.create_tasks'];
  const out = await def.execute(
    { meetingId: 20, projectId: 5, assignerId: 1, items: [{ title: 'Share wireframes', description: 'v1', assigneeId: 1, scheduledDate: '2026-12-02', priority: 'medium' }] },
    { orgId: 3 },
  );
  const data = strapi.created[0].data;
  assert.equal(data.name, 'Share wireframes');
  assert.equal(data.meeting, 20);
  assert.deepEqual(data.projects, [5]);
  assert.equal(data.organization, 3);
  assert.equal(data.assignee, 1);
  assert.equal(data.assigner, 1);
  assert.equal(data.status, 'SCHEDULED');
  assert.equal(out.result.taskIds.length, 1);
  await def.undo(out.undoData, { orgId: 3 });
  assert.deepEqual(strapi.deleted.map((d) => d.id), out.result.taskIds);
});
