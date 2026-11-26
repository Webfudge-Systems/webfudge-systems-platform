'use strict';

/**
 * Loads what the risk radar (utils/risk-radar.js) needs for one or many projects in a few batched
 * queries: project tasks, sprints, active members with capacity (W6) and their open work across
 * all projects.
 */

const { computeRiskRadar, userName } = require('./risk-radar');

const TASK_UID = 'api::task.task';
const SPRINT_UID = 'api::sprint.sprint';
const MEMBER_UID = 'api::organization-user.organization-user';
const OPEN = { $notIn: ['COMPLETED', 'CANCELLED'] };
const USER_FIELDS = ['id', 'username', 'firstName', 'lastName', 'email'];
const TASK_FIELDS = ['id', 'name', 'status', 'priority', 'scheduledDate', 'startDate', 'estimatedHours', 'completedAt', 'dependsOn', 'devMetadata', 'taskType'];

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);

async function loadMembers(strapi, orgId) {
  const rows = await strapi.entityService.findMany(MEMBER_UID, {
    filters: { organization: orgId, isActive: true },
    fields: ['id', 'weeklyCapacityHours', 'jobRole'],
    populate: { user: { fields: [...USER_FIELDS] } },
    limit: 500,
  });
  return rows
    .filter((m) => m.user?.id)
    .map((m) => ({ userId: m.user.id, name: userName(m.user), capacity: m.weeklyCapacityHours == null ? 40 : Number(m.weeklyCapacityHours), jobRole: m.jobRole || null }));
}

async function loadWorkloadTasks(strapi, orgId, userIds) {
  if (!userIds.length) return [];
  const end = new Date(Date.now() + 35 * 86400000).toISOString();
  return strapi.entityService.findMany(TASK_UID, {
    filters: { organization: orgId, status: OPEN, assignee: { id: { $in: userIds } }, scheduledDate: { $lte: end } },
    fields: ['id', 'status', 'scheduledDate', 'estimatedHours'],
    populate: { assignee: { fields: ['id'] } },
    limit: 10000,
  });
}

/**
 * @param {Array} projects  rows with id, name, startDate, endDate, projectManager, teamMembers
 * @returns {Promise<Map<number, object>>} projectId → radar
 */
async function radarForProjects(strapi, orgId, projects, { today } = {}) {
  const ids = projects.map((p) => p.id);
  if (!ids.length) return new Map();
  const [tasks, sprints, members] = await Promise.all([
    strapi.entityService.findMany(TASK_UID, {
      filters: { organization: orgId, projects: { id: { $in: ids } }, status: { $ne: 'CANCELLED' } },
      fields: [...TASK_FIELDS],
      populate: { assignee: { fields: [...USER_FIELDS] }, projects: { fields: ['id'] } },
      limit: 20000,
    }),
    strapi.entityService.findMany(SPRINT_UID, {
      filters: { organization: orgId, project: { id: { $in: ids } } },
      fields: ['id', 'status', 'startDate', 'endDate', 'committedPoints', 'completedPoints'],
      populate: { project: { fields: ['id'] } },
      limit: 2000,
    }),
    loadMembers(strapi, orgId),
  ]);
  const memberIds = new Set(members.map((m) => m.userId));
  const workloadTasks = await loadWorkloadTasks(strapi, orgId, [...memberIds]);

  const tasksBy = new Map(ids.map((id) => [id, []]));
  for (const t of tasks) for (const p of t.projects || []) tasksBy.get(p.id)?.push(t);
  const sprintsBy = new Map(ids.map((id) => [id, []]));
  for (const s of sprints) sprintsBy.get(relId(s.project))?.push(s);

  const out = new Map();
  for (const p of projects) {
    const ts = tasksBy.get(p.id) || [];
    const team = new Set([relId(p.projectManager), ...(p.teamMembers || []).map(relId), ...ts.map((t) => relId(t.assignee))].filter((x) => x && memberIds.has(Number(x))).map(Number));
    out.set(
      p.id,
      computeRiskRadar({
        project: p,
        tasks: ts,
        sprints: sprintsBy.get(p.id) || [],
        members,
        workloadTasks,
        candidateIds: [...team],
        today,
      })
    );
  }
  return out;
}

/**
 * People who are not managers do not see teammates' utilization (same rule as the W6 planner).
 */
function redactForMember(radar) {
  return {
    ...radar,
    reassignments: [],
    tasks: radar.tasks.map((t) => ({
      ...t,
      reasons: t.reasons.map((r, i) => (t.factors[i] === 'overload' ? 'The assignee is over capacity that week' : r)),
    })),
  };
}

module.exports = { radarForProjects, redactForMember };
