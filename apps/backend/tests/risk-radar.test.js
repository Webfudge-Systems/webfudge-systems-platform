'use strict';

/** Risk radar engine (W19). Pure functions, no Strapi.   node --test tests/risk-radar.test.js */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeRiskRadar, forecast, overdueChains } = require('../src/utils/risk-radar');

const TODAY = '2026-11-26'; // a Thursday
const d = (offset) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + offset * 86400000).toISOString();
const user = (id, name) => ({ id, username: name.toLowerCase(), firstName: name });

test('velocity forecast: remaining points / points per day, slip vs end date', () => {
  const tasks = [
    { id: 1, status: 'SCHEDULED', devMetadata: { storyPoints: 10 } },
    { id: 2, status: 'IN_PROGRESS', devMetadata: { storyPoints: 10 } },
    { id: 3, status: 'COMPLETED', devMetadata: { storyPoints: 5 }, completedAt: d(-3) },
  ];
  // Two completed 10-day sprints of 10 points each → 1 point/day. 20 points left → 20 days.
  const sprints = [
    { status: 'completed', startDate: '2026-11-01', endDate: '2026-11-10', completedPoints: 10 },
    { status: 'completed', startDate: '2026-11-11', endDate: '2026-11-20', completedPoints: 10 },
  ];
  const fc = forecast({ project: { endDate: d(10) }, tasks, sprints, today: TODAY });
  assert.equal(fc.method, 'velocity');
  assert.equal(fc.pointsPerDay, 1);
  assert.equal(fc.projectedFinish, d(20).slice(0, 10));
  assert.equal(fc.slipDays, 10);
});

test('throughput forecast when there are no sprints, and none without history', () => {
  const tasks = [
    ...Array.from({ length: 4 }, (_, i) => ({ id: i + 1, status: 'COMPLETED', completedAt: d(-i - 1) })), // 1 task/week
    { id: 10, status: 'SCHEDULED' },
    { id: 11, status: 'SCHEDULED' },
  ];
  const fc = forecast({ project: { endDate: d(30) }, tasks, today: TODAY });
  assert.equal(fc.method, 'throughput');
  assert.equal(fc.projectedFinish, d(14).slice(0, 10));
  assert.equal(fc.slipDays, 0);
  assert.equal(forecast({ project: {}, tasks: [{ id: 1, status: 'SCHEDULED' }], today: TODAY }).method, 'none');
});

test('overdue chain: dependents of an overdue task slip and are listed', () => {
  const tasks = [
    { id: 1, name: 'Design', status: 'IN_PROGRESS', scheduledDate: d(-4), startDate: d(-10) },
    { id: 2, name: 'Build', status: 'SCHEDULED', startDate: d(0), scheduledDate: d(2), dependsOn: [{ taskId: 1, type: 'FS', lagDays: 0 }] },
    { id: 3, name: 'Launch', status: 'SCHEDULED', startDate: d(3), scheduledDate: d(4), dependsOn: [{ taskId: 2, type: 'FS', lagDays: 0 }] },
    { id: 4, name: 'Unrelated', status: 'SCHEDULED', scheduledDate: d(20) },
  ];
  const chains = overdueChains(tasks, TODAY);
  assert.equal(chains.length, 1);
  assert.equal(chains[0].root.name, 'Design');
  assert.deepEqual(chains[0].blocked.map((b) => b.name), ['Build', 'Launch']);

  const radar = computeRiskRadar({ project: { endDate: d(30) }, tasks, today: TODAY });
  const build = radar.tasks.find((t) => t.id === 2);
  assert.ok(build, 'Build is at risk');
  assert.ok(build.factors.includes('chain'));
  assert.ok(build.slipDays > 0);
  assert.ok(!radar.tasks.find((t) => t.id === 4), 'unrelated future task is not flagged');
  assert.equal(radar.tasks[0].id, 1, 'the overdue root is the riskiest');
  assert.equal(radar.counts.blocked, 2);
});

test('overloaded assignee → reassignment to the teammate with spare capacity', () => {
  const asha = user(1, 'Asha');
  const ravi = user(2, 'Ravi');
  const tasks = [
    { id: 1, name: 'Homepage copy', status: 'SCHEDULED', scheduledDate: d(1), estimatedHours: 30, assignee: asha },
    { id: 2, name: 'Pricing page', status: 'SCHEDULED', scheduledDate: d(1), estimatedHours: 20, assignee: asha },
    { id: 3, name: 'QA pass', status: 'SCHEDULED', scheduledDate: d(1), estimatedHours: 4 }, // unassigned, due soon
  ];
  const radar = computeRiskRadar({
    project: { endDate: d(40) },
    tasks,
    members: [
      { userId: 1, name: 'Asha', capacity: 40, jobRole: 'Writer' },
      { userId: 2, name: 'Ravi', capacity: 40, jobRole: 'Writer' },
    ],
    workloadTasks: tasks,
    candidateIds: [1, 2],
    today: TODAY,
  });
  const copy = radar.tasks.find((t) => t.id === 1);
  assert.ok(copy.factors.includes('overload'), 'Asha is at 125% that week');
  assert.ok(radar.reassignments.length >= 1);
  const first = radar.reassignments[0];
  assert.equal(first.from.id, 1);
  assert.equal(first.to.id, 2);
  assert.ok(first.to.utilizationAfter <= 100);
  assert.ok(radar.tasks.find((t) => t.id === 3).factors.includes('unassigned'));
  assert.ok(['medium', 'high'].includes(radar.level));
});

test('healthy project is low risk', () => {
  const radar = computeRiskRadar({
    project: { endDate: d(60) },
    tasks: [
      { id: 1, status: 'COMPLETED', completedAt: d(-2) },
      { id: 2, status: 'COMPLETED', completedAt: d(-9) },
      { id: 3, status: 'IN_PROGRESS', scheduledDate: d(10) },
    ],
    today: TODAY,
  });
  assert.equal(radar.level, 'low');
  assert.equal(radar.tasks.length, 0);
  assert.equal(radar.reassignments.length, 0);
});

test('dependency cycles do not hang', () => {
  const tasks = [
    { id: 1, status: 'SCHEDULED', scheduledDate: d(-1), dependsOn: [{ taskId: 2 }] },
    { id: 2, status: 'SCHEDULED', scheduledDate: d(1), dependsOn: [{ taskId: 1 }] },
  ];
  const radar = computeRiskRadar({ project: {}, tasks, today: TODAY });
  assert.ok(radar.tasks.length >= 1);
});
