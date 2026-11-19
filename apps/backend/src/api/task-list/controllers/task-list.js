'use strict';

/**
 * Task lists / sections inside a project (W1).
 * Anyone who can see the project and has Work → Tasks write access can manage its lists.
 * The default list can be renamed but not deleted; deleting another list moves its tasks
 * to the default list (nothing is lost).
 */

const { requireModuleAccess } = require('../../../utils/rbac');
const {
  TASK_LIST_UID,
  relId,
  idList,
  ensureDefaultTaskList,
  loadProjectForAccess,
} = require('../../../utils/workspaces');

const TASK_UID = 'api::task.task';

function guard(ctx, level = 'read') {
  if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
  if (!ctx.state.orgId) return ctx.forbidden('No active organization');
  return requireModuleAccess(ctx, 'pm', 'tasks', level);
}

function readBody(ctx) {
  const body = ctx.request?.body || {};
  const payload = body.data || body;
  return payload && typeof payload === 'object' ? payload : {};
}

/** The project's lists in order, each with the ids of its tasks (the UI groups tasks it already loaded). */
async function listsForProject(strapi, projectId) {
  const rows = await strapi.entityService.findMany(TASK_LIST_UID, {
    filters: { project: { id: projectId } },
    fields: ['id', 'name', 'sortOrder', 'isDefault', 'color'],
    populate: { tasks: { fields: ['id'] } },
    sort: [{ sortOrder: 'asc' }, { id: 'asc' }],
    limit: 500,
  });
  return rows.map(({ tasks, ...l }) => ({ ...l, taskIds: (tasks || []).map((t) => t.id) }));
}

/** Load a list the caller may manage, with its project. */
async function loadList(strapi, ctx, id) {
  const listId = relId(id);
  if (!listId) return null;
  const list = await strapi.entityService.findOne(TASK_LIST_UID, listId, {
    populate: { organization: { fields: ['id'] }, project: { fields: ['id'] } },
  });
  if (!list || relId(list.organization) !== Number(ctx.state.orgId)) return null;
  const project = await loadProjectForAccess(strapi, ctx, relId(list.project));
  if (!project) return null;
  return { list, project };
}

module.exports = {
  /** GET /task-lists?project=ID — the project's lists (the default list is created if missing). */
  async find(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const projectId = ctx.query?.project ?? ctx.query?.projectId ?? ctx.query?.filters?.project;
    const project = await loadProjectForAccess(strapi, ctx, projectId);
    if (!project) return ctx.notFound('Project not found');
    await ensureDefaultTaskList(strapi, project.id, ctx.state.orgId);
    ctx.set('Cache-Control', 'no-store');
    return { data: await listsForProject(strapi, project.id) };
  },

  async create(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const input = readBody(ctx);
    const name = String(input.name || '').trim();
    if (!name) return ctx.badRequest('List name is required');
    const project = await loadProjectForAccess(strapi, ctx, input.project ?? input.projectId);
    if (!project) return ctx.badRequest('Project not found');
    await ensureDefaultTaskList(strapi, project.id, ctx.state.orgId);
    const last = await strapi.db.query(TASK_LIST_UID).findOne({
      where: { project: { id: project.id } },
      orderBy: { sortOrder: 'desc' },
      select: ['sortOrder'],
    });
    const created = await strapi.entityService.create(TASK_LIST_UID, {
      data: {
        name: name.slice(0, 120),
        color: input.color ? String(input.color).slice(0, 32) : null,
        sortOrder: (Number(last?.sortOrder) || 0) + 1,
        isDefault: false,
        project: project.id,
        organization: ctx.state.orgId,
      },
    });
    return { data: created };
  },

  async update(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const found = await loadList(strapi, ctx, ctx.params.id);
    if (!found) return ctx.notFound('List not found');
    const input = readBody(ctx);
    const data = {};
    if (input.name !== undefined) {
      const name = String(input.name || '').trim();
      if (!name) return ctx.badRequest('List name is required');
      data.name = name.slice(0, 120);
    }
    if (input.color !== undefined) data.color = input.color ? String(input.color).slice(0, 32) : null;
    const updated = await strapi.entityService.update(TASK_LIST_UID, found.list.id, { data });
    return { data: updated };
  },

  async delete(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const found = await loadList(strapi, ctx, ctx.params.id);
    if (!found) return ctx.notFound('List not found');
    if (found.list.isDefault) return ctx.badRequest('The default list cannot be deleted');
    const fallback = await ensureDefaultTaskList(strapi, found.project.id, ctx.state.orgId);
    const tasks = await strapi.db.query(TASK_UID).findMany({
      where: { taskList: { id: found.list.id } },
      select: ['id'],
    });
    for (const t of tasks) {
      await strapi.entityService.update(TASK_UID, t.id, { data: { taskList: fallback } });
    }
    await strapi.entityService.delete(TASK_LIST_UID, found.list.id);
    return { data: { id: found.list.id, movedTasks: tasks.length, movedTo: fallback } };
  },

  /** POST /task-lists/reorder { project, order: [listId, ...] } */
  async reorder(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const input = readBody(ctx);
    const project = await loadProjectForAccess(strapi, ctx, input.project ?? input.projectId);
    if (!project) return ctx.badRequest('Project not found');
    const order = idList(input.order);
    const lists = await listsForProject(strapi, project.id);
    const known = new Set(lists.map((l) => l.id));
    if (order.some((id) => !known.has(id))) return ctx.badRequest('Unknown list in order');
    const rest = lists.map((l) => l.id).filter((id) => !order.includes(id));
    const final = [...order, ...rest];
    for (let i = 0; i < final.length; i += 1) {
      await strapi.entityService.update(TASK_LIST_UID, final[i], { data: { sortOrder: i } });
    }
    return { data: await listsForProject(strapi, project.id) };
  },

  /** POST /task-lists/:id/tasks { taskIds: [...] } — move tasks of the same project into this list. */
  async moveTasks(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const found = await loadList(strapi, ctx, ctx.params.id);
    if (!found) return ctx.notFound('List not found');
    const taskIds = [...new Set(idList(readBody(ctx).taskIds))];
    if (!taskIds.length) return ctx.badRequest('No tasks to move');
    if (taskIds.length > 500) return ctx.badRequest('Too many tasks');
    const rows = await strapi.entityService.findMany(TASK_UID, {
      filters: { id: { $in: taskIds }, organization: ctx.state.orgId, projects: { id: found.project.id } },
      fields: ['id'],
      limit: taskIds.length,
    });
    if (rows.length !== taskIds.length) return ctx.badRequest('Some tasks are not in this project');
    for (const t of rows) {
      await strapi.entityService.update(TASK_UID, t.id, { data: { taskList: found.list.id } });
    }
    return { data: { listId: found.list.id, moved: rows.map((r) => r.id) } };
  },
};
