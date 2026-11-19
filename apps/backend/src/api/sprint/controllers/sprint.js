'use strict';

/**
 * Sprints (W7). A sprint belongs to one project; tasks join via task.sprint.
 * Points = task devMetadata.storyPoints (tasks without points count 0 and are flagged).
 * Burndown: remaining points per day = points in the sprint − points of tasks completed by that
 * day (task.completedAt). One active sprint per project. Completing a sprint records velocity and
 * moves unfinished tasks to the next sprint or back to the backlog.
 * Read: anyone who can view the project. Write: project manager / PM admin / manager role.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { requireModuleAccess, canAccess, isPmOrgAdminRole, isPmOrgManagerRole, userCanViewProjectRow } = require('../../../utils/rbac');

const UID = 'api::sprint.sprint';
const TASK_UID = 'api::task.task';
const PROJECT_UID = 'api::project.project';
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || ''));
const pointsOf = (t) => {
  const p = Number(t?.devMetadata?.storyPoints);
  return Number.isFinite(p) && p > 0 ? p : 0;
};

function guard(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  return true;
}

async function loadProject(strapi, ctx, projectId) {
  const id = parseInt(String(projectId), 10);
  if (Number.isNaN(id)) return null;
  const p = await strapi.entityService.findOne(PROJECT_UID, id, {
    populate: { organization: { fields: ['id'] }, projectManager: { fields: ['id'] }, teamMembers: { fields: ['id'] } },
  });
  if (!p || orgIdFromRelation(p.organization) !== ctx.state.orgId) return null;
  if (!userCanViewProjectRow(ctx, p, ctx.state.user.id)) return null;
  return p;
}

const canPlan = (ctx, project) =>
  isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'pm', 'projects', 'manage') || Number(project?.projectManager?.id) === Number(ctx.state.user.id);

async function loadSprint(strapi, ctx) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const s = await strapi.entityService.findOne(UID, id, { populate: { organization: { fields: ['id'] }, project: { fields: ['id'] } } });
  if (!s || orgIdFromRelation(s.organization) !== ctx.state.orgId) return null;
  const project = await loadProject(strapi, ctx, s.project?.id);
  if (!project) return null;
  return { sprint: s, project };
}

async function sprintTasks(strapi, sprintId) {
  return strapi.entityService.findMany(TASK_UID, {
    filters: { sprint: { id: sprintId } },
    fields: ['id', 'name', 'status', 'devMetadata', 'completedAt', 'scheduledDate', 'taskCategory'],
    populate: { assignee: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] } },
    limit: 2000,
  });
}

const userName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email : null);
const serializeTask = (t) => ({
  id: t.id,
  name: t.name,
  status: t.status,
  points: pointsOf(t),
  completedAt: t.completedAt || null,
  assignee: t.assignee ? { id: t.assignee.id, name: userName(t.assignee) } : null,
});

function burndown(sprint, tasks) {
  const total = tasks.reduce((a, t) => a + pointsOf(t), 0);
  const days = [];
  const start = new Date(`${sprint.startDate}T00:00:00Z`);
  const end = new Date(`${sprint.endDate}T00:00:00Z`);
  const today = new Date();
  const n = Math.max(1, Math.round((end - start) / 86400000));
  for (let i = 0; i <= n; i++) {
    const d = new Date(start.getTime() + i * 86400000);
    const key = d.toISOString().slice(0, 10);
    const dayEnd = new Date(d.getTime() + 86400000);
    const ideal = r1(total - (total * i) / n);
    let actual = null;
    if (d <= today) {
      const done = tasks.filter((t) => t.status === 'COMPLETED' && t.completedAt && new Date(t.completedAt) < dayEnd).reduce((a, t) => a + pointsOf(t), 0);
      actual = r1(total - done);
    }
    days.push({ date: key, ideal, actual });
  }
  return { total: r1(total), days };
}

function summarize(sprint, tasks) {
  const total = tasks.reduce((a, t) => a + pointsOf(t), 0);
  const done = tasks.filter((t) => t.status === 'COMPLETED').reduce((a, t) => a + pointsOf(t), 0);
  return {
    id: sprint.id,
    name: sprint.name,
    goal: sprint.goal || '',
    startDate: sprint.startDate,
    endDate: sprint.endDate,
    status: sprint.status,
    startedAt: sprint.startedAt,
    completedAt: sprint.completedAt,
    committedPoints: sprint.committedPoints == null ? null : Number(sprint.committedPoints),
    completedPoints: sprint.completedPoints == null ? null : Number(sprint.completedPoints),
    taskCount: tasks.length,
    doneCount: tasks.filter((t) => t.status === 'COMPLETED').length,
    unpointed: tasks.filter((t) => !pointsOf(t)).length,
    points: r1(total),
    pointsDone: r1(done),
  };
}

function normalize(body, creating) {
  const data = {};
  if (creating || body.name !== undefined) {
    const name = String(body.name || '').trim().slice(0, 100);
    if (!name) return { error: 'Give the sprint a name' };
    data.name = name;
  }
  if (body.goal !== undefined) data.goal = String(body.goal || '').slice(0, 1000);
  for (const k of ['startDate', 'endDate']) {
    if (body[k] === undefined && !creating) continue;
    if (!isDay(body[k])) return { error: `${k === 'startDate' ? 'Start' : 'End'} date is required` };
    data[k] = body[k];
  }
  if (data.startDate && data.endDate && data.endDate <= data.startDate) return { error: 'The sprint must end after it starts' };
  if (data.startDate && data.endDate && (new Date(data.endDate) - new Date(data.startDate)) / 86400000 > 60) return { error: 'Keep sprints to 60 days or less' };
  return { data };
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  /** GET /sprints?projectId= → sprints with stats, backlog (open tasks in no sprint), velocity history. */
  async find(ctx) {
    if (!guard(ctx)) return;
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'read');
    if (denied) return denied;
    const project = await loadProject(strapi, ctx, ctx.query?.projectId);
    if (!project) return ctx.notFound('Project not found');
    const sprints = await strapi.entityService.findMany(UID, { filters: { project: { id: project.id } }, sort: [{ startDate: 'asc' }], limit: 200 });
    const out = [];
    for (const s of sprints) out.push(summarize(s, await sprintTasks(strapi, s.id)));
    const backlog = await strapi.entityService.findMany(TASK_UID, {
      filters: { projects: { id: project.id }, sprint: { id: { $null: true } }, status: { $notIn: ['COMPLETED', 'CANCELLED'] }, parent: { id: { $null: true } } },
      fields: ['id', 'name', 'status', 'devMetadata', 'completedAt', 'taskCategory'],
      populate: { assignee: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] } },
      sort: [{ createdAt: 'asc' }],
      limit: 1000,
    });
    const completed = out.filter((s) => s.status === 'completed');
    const last3 = completed.slice(-3);
    ctx.set('Cache-Control', 'no-store');
    return {
      data: {
        sprints: out,
        backlog: backlog.map(serializeTask),
        velocity: completed.map((s) => ({ id: s.id, name: s.name, committed: s.committedPoints ?? 0, completed: s.completedPoints ?? 0 })),
        averageVelocity: last3.length ? r1(last3.reduce((a, s) => a + (s.completedPoints || 0), 0) / last3.length) : null,
      },
      meta: { canPlan: canPlan(ctx, project) },
    };
  },

  /** GET /sprints/:id → sprint, its tasks and the burndown series. */
  async findOne(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadSprint(strapi, ctx);
    if (!loaded) return ctx.notFound('Sprint not found');
    const tasks = await sprintTasks(strapi, loaded.sprint.id);
    return { data: { ...summarize(loaded.sprint, tasks), tasks: tasks.map(serializeTask), burndown: burndown(loaded.sprint, tasks) }, meta: { canPlan: canPlan(ctx, loaded.project) } };
  },

  async create(ctx) {
    if (!guard(ctx)) return;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const project = await loadProject(strapi, ctx, body.projectId);
    if (!project) return ctx.notFound('Project not found');
    if (!canPlan(ctx, project)) return ctx.forbidden('Only the project manager can plan sprints');
    const { data, error } = normalize(body, true);
    if (error) return ctx.badRequest(error);
    const entry = await strapi.entityService.create(UID, { data: { ...data, status: 'planned', project: project.id, organization: ctx.state.orgId } });
    return { data: summarize(entry, []) };
  },

  async update(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadSprint(strapi, ctx);
    if (!loaded) return ctx.notFound('Sprint not found');
    if (!canPlan(ctx, loaded.project)) return ctx.forbidden('Only the project manager can plan sprints');
    if (loaded.sprint.status === 'completed') return ctx.badRequest('This sprint is completed');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const merged = { startDate: loaded.sprint.startDate, endDate: loaded.sprint.endDate, ...body };
    const { data, error } = normalize(merged, false);
    if (error) return ctx.badRequest(error);
    const entry = await strapi.entityService.update(UID, loaded.sprint.id, { data });
    return { data: summarize(entry, await sprintTasks(strapi, entry.id)) };
  },

  async delete(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadSprint(strapi, ctx);
    if (!loaded) return ctx.notFound('Sprint not found');
    if (!canPlan(ctx, loaded.project)) return ctx.forbidden('Only the project manager can plan sprints');
    if (loaded.sprint.status !== 'planned') return ctx.badRequest('Only planned sprints can be deleted');
    for (const t of await sprintTasks(strapi, loaded.sprint.id)) await strapi.entityService.update(TASK_UID, t.id, { data: { sprint: null } });
    await strapi.entityService.delete(UID, loaded.sprint.id);
    return { data: { id: loaded.sprint.id } };
  },

  /** PUT /sprints/:id/tasks { add: [taskId], remove: [taskId] } — plan from the backlog. */
  async setTasks(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadSprint(strapi, ctx);
    if (!loaded) return ctx.notFound('Sprint not found');
    if (!canPlan(ctx, loaded.project)) return ctx.forbidden('Only the project manager can plan sprints');
    if (loaded.sprint.status === 'completed') return ctx.badRequest('This sprint is completed');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const ids = (a) => [...new Set((Array.isArray(a) ? a : []).map(Number).filter((n) => n > 0))].slice(0, 500);
    const add = ids(body.add);
    const remove = ids(body.remove);
    if (add.length) {
      const ok = await strapi.entityService.findMany(TASK_UID, { filters: { id: { $in: add }, projects: { id: loaded.project.id } }, fields: ['id'], limit: add.length });
      if (ok.length !== add.length) return ctx.badRequest('Only tasks from this project can join the sprint');
      for (const id of add) await strapi.entityService.update(TASK_UID, id, { data: { sprint: loaded.sprint.id } });
    }
    for (const id of remove) {
      const t = await strapi.entityService.findOne(TASK_UID, id, { populate: { sprint: { fields: ['id'] } } });
      if (t?.sprint?.id === loaded.sprint.id) await strapi.entityService.update(TASK_UID, id, { data: { sprint: null } });
    }
    const tasks = await sprintTasks(strapi, loaded.sprint.id);
    return { data: { ...summarize(loaded.sprint, tasks), tasks: tasks.map(serializeTask) } };
  },

  async start(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadSprint(strapi, ctx);
    if (!loaded) return ctx.notFound('Sprint not found');
    if (!canPlan(ctx, loaded.project)) return ctx.forbidden('Only the project manager can start sprints');
    if (loaded.sprint.status !== 'planned') return ctx.badRequest(`This sprint is already ${loaded.sprint.status}`);
    const active = await strapi.db.query(UID).count({ where: { project: loaded.project.id, status: 'active' } });
    if (active) return ctx.badRequest('Complete the active sprint first');
    const tasks = await sprintTasks(strapi, loaded.sprint.id);
    if (!tasks.length) return ctx.badRequest('Add tasks from the backlog before starting');
    const entry = await strapi.entityService.update(UID, loaded.sprint.id, {
      data: { status: 'active', startedAt: new Date().toISOString(), committedPoints: r1(tasks.reduce((a, t) => a + pointsOf(t), 0)) },
    });
    return { data: summarize(entry, tasks) };
  },

  /** POST /sprints/:id/complete { carryTo: <sprintId> | 'backlog' } */
  async complete(ctx) {
    if (!guard(ctx)) return;
    const loaded = await loadSprint(strapi, ctx);
    if (!loaded) return ctx.notFound('Sprint not found');
    if (!canPlan(ctx, loaded.project)) return ctx.forbidden('Only the project manager can complete sprints');
    if (loaded.sprint.status !== 'active') return ctx.badRequest('Only the active sprint can be completed');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    let carryTo = null;
    if (body.carryTo && body.carryTo !== 'backlog') {
      const target = await strapi.entityService.findOne(UID, parseInt(body.carryTo, 10), { populate: { project: { fields: ['id'] } } });
      if (!target || target.project?.id !== loaded.project.id || target.status !== 'planned') return ctx.badRequest('Carry unfinished work to a planned sprint of this project');
      carryTo = target.id;
    }
    const tasks = await sprintTasks(strapi, loaded.sprint.id);
    const unfinished = tasks.filter((t) => !['COMPLETED', 'CANCELLED'].includes(t.status));
    for (const t of unfinished) await strapi.entityService.update(TASK_UID, t.id, { data: { sprint: carryTo } });
    const completedPoints = r1(tasks.filter((t) => t.status === 'COMPLETED').reduce((a, t) => a + pointsOf(t), 0));
    const entry = await strapi.entityService.update(UID, loaded.sprint.id, { data: { status: 'completed', completedAt: new Date().toISOString(), completedPoints } });
    return { data: summarize(entry, tasks.filter((t) => !unfinished.includes(t))), meta: { carried: unfinished.length, carryTo: carryTo || 'backlog' } };
  },
}));
