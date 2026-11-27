'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sanitizeCalls, buildTaskFilters, executeCalls, keepCitedIds } = require('../../src/utils/ai/ask-work');

const TODAY = '2026-11-26';
const member = { orgId: 7, userId: 3, isAdmin: false, visibleProjectIds: [10, 11], can: { tasks: true, projects: true }, today: TODAY };
const admin = { ...member, isAdmin: true, visibleProjectIds: null };

// ---------- the model's tool calls are whitelisted and sanitized ----------

test('unknown tools are dropped', () => {
  const calls = sanitizeCalls([{ tool: 'run_sql', args: { sql: 'select * from users' } }, { tool: 'find_tasks', args: {} }]);
  assert.deepEqual(calls.map((c) => c.tool), ['find_tasks']);
});

test('unknown arguments are dropped and enums enforced', () => {
  const [c] = sanitizeCalls([{ tool: 'find_tasks', args: { status: 'deleted', organization: 99, filters: { id: 1 }, project: 'Acme', limit: 1000 } }]);
  assert.deepEqual(Object.keys(c.args).sort(), ['limit', 'project']);
  assert.equal(c.args.limit, 25);
});

test('at most three calls run', () => {
  const calls = sanitizeCalls(Array.from({ length: 6 }, () => ({ tool: 'find_projects', args: {} })));
  assert.equal(calls.length, 3);
});

test('dates must be YYYY-MM-DD', () => {
  const [c] = sanitizeCalls([{ tool: 'find_tasks', args: { completedFrom: "2026-11-01' OR 1=1", completedTo: '2026-11-30' } }]);
  assert.deepEqual(c.args, { completedTo: '2026-11-30' });
});

// ---------- task filters always carry the org and the user's visibility ----------

test('a member only sees their own tasks or tasks on projects they can see', () => {
  const f = buildTaskFilters({ status: 'open' }, member);
  assert.equal(f.organization, 7);
  const vis = f.$and[0].$or;
  assert.deepEqual(vis, [{ assigner: 3 }, { assignee: 3 }, { collaborators: { id: 3 } }, { projects: { id: { $in: [10, 11] } } }]);
});

test('project ids outside the member visibility are removed', () => {
  const f = buildTaskFilters({ projectIds: [11, 99] }, member);
  assert.deepEqual(f.$and[1].projects, { id: { $in: [11] } });
});

test('asking only about invisible projects matches nothing', () => {
  const f = buildTaskFilters({ projectIds: [99] }, member);
  assert.deepEqual(f.$and[1].projects, { id: { $in: [-1] } });
});

test('a member with no visible projects still only sees their own tasks', () => {
  const f = buildTaskFilters({}, { ...member, visibleProjectIds: [] });
  assert.equal(f.$and[0].$or.length, 3);
});

test('an admin is org-scoped without the visibility clause', () => {
  const f = buildTaskFilters({ projectIds: [99] }, admin);
  assert.equal(f.organization, 7);
  assert.equal(JSON.stringify(f).includes('assigner'), false);
  assert.deepEqual(f.$and[1].projects, { id: { $in: [99] } });
});

test('overdue = open with a due date before today', () => {
  const f = buildTaskFilters({ status: 'overdue' }, admin);
  const c = f.$and[1];
  assert.deepEqual(c.status, { $notIn: ['COMPLETED', 'CANCELLED'] });
  assert.deepEqual(c.scheduledDate, { $lt: `${TODAY}T00:00:00.000Z` });
});

test('completed in a range filters on completedAt', () => {
  const f = buildTaskFilters({ status: 'completed', completedFrom: '2026-11-23', completedTo: '2026-11-26' }, admin);
  const c = f.$and[1];
  assert.equal(c.status, 'COMPLETED');
  assert.deepEqual(c.completedAt, { $gte: '2026-11-23T00:00:00.000Z', $lte: '2026-11-26T23:59:59.999Z' });
});

// ---------- execution respects module permissions ----------

function fakeDeps(log) {
  return {
    async findTasks(filters) {
      log.push(['tasks', filters]);
      return [{ id: 1, name: 'Fix login', status: 'OVERDUE', scheduledDate: '2026-11-20', projects: [{ id: 10, name: 'Acme site' }], assignee: { id: 3, firstName: 'Riya' } }];
    },
    async findProjects(filters) {
      log.push(['projects', filters]);
      return [{ id: 10, name: 'Acme site', status: 'active', clientAccount: { companyName: 'Acme' } }];
    },
    async findMembers() {
      return [{ id: 3, firstName: 'Riya', lastName: 'Shah' }, { id: 4, firstName: 'Dev', lastName: 'Rao' }];
    },
  };
}

test('without task read permission find_tasks returns not_allowed and never queries', async () => {
  const log = [];
  const out = await executeCalls([{ tool: 'find_tasks', args: {} }], { ...member, can: { tasks: false, projects: true } }, fakeDeps(log));
  assert.equal(out[0].error, 'not_allowed');
  assert.equal(log.length, 0);
});

test('a project or client name narrows tasks inside the visibility clause', async () => {
  const log = [];
  await executeCalls([{ tool: 'find_tasks', args: { project: 'site', client: 'acme' } }], member, fakeDeps(log));
  assert.equal(log.some((l) => l[0] === 'projects'), false);
  const q = log.find((l) => l[0] === 'tasks')[1];
  assert.equal(q.$and[0].$or[1].assignee, 3); // visibility still applies
  assert.deepEqual(q.$and[1].$and, [
    { projects: { name: { $containsi: 'site' } } },
    { $or: [{ projects: { clientAccount: { companyName: { $containsi: 'acme' } } } }, { clientAccount: { companyName: { $containsi: 'acme' } } }] },
  ]);
});

test('find_projects is limited to projects the member can see', async () => {
  const log = [];
  await executeCalls([{ tool: 'find_projects', args: { query: 'acme' } }], member, fakeDeps(log));
  const q = log.find((l) => l[0] === 'projects')[1];
  assert.deepEqual(q.$and.slice(0, 2), [{ organization: 7 }, { id: { $in: [10, 11] } }]);
});

test('a person name is resolved to org members, "me" to the user', async () => {
  const log = [];
  await executeCalls([{ tool: 'find_tasks', args: { assignee: 'riya' } }, { tool: 'find_tasks', args: { assignee: 'me' } }], member, fakeDeps(log));
  const q = log.filter((l) => l[0] === 'tasks').map((l) => l[1].$and[1].assignee);
  assert.deepEqual(q, [{ id: { $in: [3] } }, { id: { $in: [3] } }]);
});

test('task results are compact rows, not raw records', async () => {
  const out = await executeCalls([{ tool: 'find_tasks', args: {} }], member, fakeDeps([]));
  assert.deepEqual(out[0].rows[0], { id: 1, name: 'Fix login', status: 'OVERDUE', priority: null, due: '2026-11-20', completedAt: null, project: 'Acme site', assignee: 'Riya', estimatedHours: null });
});

test('only task ids returned by tools can be cited', () => {
  const results = [{ tool: 'find_tasks', rows: [{ id: 1 }, { id: 2 }] }];
  assert.deepEqual(keepCitedIds([2, 5, 1, 2], results), [2, 1]);
});
