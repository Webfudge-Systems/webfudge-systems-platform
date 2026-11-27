'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createTaskFromIntake, TASK_UID, CHANNEL_UID } = require('../../src/utils/intake/create-task');

function fakeStrapi() {
  const calls = [];
  return {
    calls,
    entityService: {
      create: async (uid, { data }) => {
        calls.push(['create', uid, data]);
        return { id: 77, ...data };
      },
      update: async (uid, id, { data }) => {
        calls.push(['update', uid, id, data]);
        return { id, ...data };
      },
    },
  };
}

const channel = {
  id: 5,
  submissionCount: 2,
  organization: { id: 9 },
  project: { id: 3 },
  taskList: { id: 4 },
  assignee: { id: 12 },
  settings: { priority: 'high' },
};

test('createTaskFromIntake files the task in the channel project + list with org, assignee and priority', async () => {
  const s = fakeStrapi();
  const task = await createTaskFromIntake(s, channel, { name: 'N', description: 'D', tags: ['intake'] }, new Date('2026-01-01T00:00:00Z'));
  assert.equal(task.id, 77);
  const [, uid, data] = s.calls[0];
  assert.equal(uid, TASK_UID);
  assert.deepEqual(
    { org: data.organization, projects: data.projects, list: data.taskList, assignee: data.assignee, priority: data.priority, status: data.status },
    { org: 9, projects: [3], list: 4, assignee: 12, priority: 'high', status: 'SCHEDULED' }
  );
  assert.deepEqual(data.tags, ['intake']);
});

test('createTaskFromIntake bumps the channel counter and timestamp', async () => {
  const s = fakeStrapi();
  const at = new Date('2026-01-01T00:00:00Z');
  await createTaskFromIntake(s, channel, { name: 'N', description: 'D', tags: [] }, at);
  const upd = s.calls.find((c) => c[0] === 'update');
  assert.equal(upd[1], CHANNEL_UID);
  assert.deepEqual(upd[3], { submissionCount: 3, lastSubmissionAt: at.toISOString() });
});

test('createTaskFromIntake ignores an invalid priority and a missing assignee', async () => {
  const s = fakeStrapi();
  await createTaskFromIntake(s, { ...channel, assignee: null, settings: { priority: 'urgent!!' } }, { name: 'N', description: '', tags: [] });
  const data = s.calls[0][2];
  assert.equal(data.priority, 'medium');
  assert.equal(data.assignee, undefined);
});
