'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planDay } = require('../../src/utils/my-day-scheduler');

const DATE = '2026-11-26';
const base = (over = {}) => ({ date: DATE, workStart: 540, workEnd: 1080, capacityHours: 8, tasks: [], meetings: [], ...over });
const task = (id, over = {}) => ({ id, name: `T${id}`, priority: 'medium', dueDate: null, estimatedHours: 1, dependsOn: [], ...over });
const taskBlocks = (r) => r.blocks.filter((b) => b.kind === 'task');

test('ranks overdue first, then priority, then due date, then id', () => {
  const r = planDay(base({
    tasks: [
      task(1, { priority: 'low' }),
      task(2, { priority: 'high', dueDate: '2026-12-10' }),
      task(3, { priority: 'high', dueDate: '2026-12-01' }),
      task(4, { priority: 'low', dueDate: '2026-11-20' }), // overdue
    ],
  }));
  assert.deepEqual(taskBlocks(r).map((b) => b.id), [4, 3, 2, 1]);
  assert.equal(taskBlocks(r)[0].start, 540);
  assert.equal(taskBlocks(r)[0].end, 600);
  assert.equal(taskBlocks(r)[0].overdue, true);
});

test('tasks due today outrank higher-priority tasks due later', () => {
  const r = planDay(base({ tasks: [task(1, { priority: 'high', dueDate: '2026-12-05' }), task(2, { priority: 'low', dueDate: DATE })] }));
  assert.deepEqual(taskBlocks(r).map((b) => b.id), [2, 1]);
});

test('meetings are fixed blocks and tasks fill the gaps around them', () => {
  const r = planDay(base({ tasks: [task(1, { estimatedHours: 2 })], meetings: [{ id: 9, title: 'Standup', start: 570, end: 600 }] }));
  const m = r.blocks.find((b) => b.kind === 'meeting');
  assert.deepEqual([m.start, m.end], [570, 600]);
  // 2h task does not fit in the 30 min before the meeting, so it starts after it
  assert.deepEqual(taskBlocks(r).map((b) => [b.start, b.end]), [[600, 720]]);
  assert.deepEqual(r.blocks.map((b) => b.kind), ['meeting', 'task']);
});

test('small tasks use the gap before a meeting', () => {
  const r = planDay(base({ tasks: [task(1, { estimatedHours: 0.5 })], meetings: [{ id: 9, start: 570, end: 600 }] }));
  assert.deepEqual(taskBlocks(r).map((b) => [b.start, b.end]), [[540, 570]]);
});

test('stops at the daily capacity and reports the rest as no_capacity', () => {
  const r = planDay(base({ capacityHours: 2, tasks: [task(1), task(2), task(3)] }));
  assert.deepEqual(taskBlocks(r).map((b) => b.id), [1, 2]);
  assert.deepEqual(r.unscheduled, [{ id: 3, reason: 'no_capacity' }]);
  assert.equal(r.summary.taskMinutes, 120);
});

test('a long task is split to fill the remaining capacity when at least 30 min are left', () => {
  const r = planDay(base({ capacityHours: 3, tasks: [task(1, { estimatedHours: 2 }), task(2, { estimatedHours: 4 })] }));
  const b2 = taskBlocks(r).find((b) => b.id === 2);
  assert.equal(b2.end - b2.start, 60);
  assert.equal(b2.partial, true);
});

test('unestimated tasks get the default length and are flagged', () => {
  const r = planDay(base({ tasks: [task(1, { estimatedHours: null })] }));
  const b = taskBlocks(r)[0];
  assert.equal(b.end - b.start, 60);
  assert.equal(b.estimated, false);
});

test('a task waiting on an open predecessor that is not on today is blocked', () => {
  const r = planDay(base({ tasks: [task(1, { dependsOn: [{ taskId: 50 }] })], openTaskIds: [1, 50] }));
  assert.equal(taskBlocks(r).length, 0);
  assert.deepEqual(r.unscheduled, [{ id: 1, reason: 'blocked', blockedBy: [50] }]);
});

test('a completed predecessor does not block', () => {
  const r = planDay(base({ tasks: [task(1, { dependsOn: [{ taskId: 50 }] })], openTaskIds: [1] }));
  assert.deepEqual(taskBlocks(r).map((b) => b.id), [1]);
});

test('a predecessor scheduled today is placed before its dependent even if it ranks lower', () => {
  const r = planDay(base({ tasks: [task(1, { priority: 'high', dependsOn: [{ taskId: 2 }] }), task(2, { priority: 'low' })], openTaskIds: [1, 2] }));
  assert.deepEqual(taskBlocks(r).map((b) => b.id), [2, 1]);
});

test('a manual order overrides the ranking', () => {
  const r = planDay(base({ tasks: [task(1, { priority: 'high' }), task(2, { priority: 'low' })], overrides: { order: [2, 1] } }));
  assert.deepEqual(taskBlocks(r).map((b) => b.id), [2, 1]);
});

test('removed tasks are left out of the day', () => {
  const r = planDay(base({ tasks: [task(1), task(2)], overrides: { excluded: [1] } }));
  assert.deepEqual(taskBlocks(r).map((b) => b.id), [2]);
  assert.deepEqual(r.unscheduled, [{ id: 1, reason: 'excluded' }]);
});

test('a pinned task keeps its start time and others flow around it', () => {
  const r = planDay(base({ tasks: [task(1), task(2)], overrides: { pinned: [{ taskId: 2, start: 540 }] } }));
  const byId = Object.fromEntries(taskBlocks(r).map((b) => [b.id, b]));
  assert.deepEqual([byId[2].start, byId[2].pinned], [540, true]);
  assert.equal(byId[1].start, 600);
});

test('starts no earlier than now (rounded up to 15 min) when planning today', () => {
  const r = planDay(base({ tasks: [task(1)], nowMinute: 602 }));
  assert.equal(taskBlocks(r)[0].start, 615);
});

test('is deterministic for the same input', () => {
  const input = base({ tasks: [task(3), task(1), task(2, { priority: 'high' })], meetings: [{ id: 1, start: 660, end: 720 }] });
  assert.deepEqual(planDay(input), planDay(JSON.parse(JSON.stringify(input))));
});
