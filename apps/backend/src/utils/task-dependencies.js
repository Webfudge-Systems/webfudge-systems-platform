'use strict';

/**
 * Task dependencies + auto-scheduling (ticket W2).
 *
 * task.dependsOn = [{ taskId, type: 'FS' | 'SS', lagDays }]
 *   FS (finish → start): this task can start once the predecessor's due date has passed (+ lag).
 *   SS (start → start): this task can start once the predecessor has started (+ lag).
 * When a task moves later, dependents that would now start too early shift forward by the same
 * amount (duration kept), recursively. Moving a task earlier never pulls dependents back.
 */

const TASK_UID = 'api::task.task';
const DAY = 86400000;
const TYPES = ['FS', 'SS'];

function relIds(rel) {
  if (!rel) return [];
  const arr = Array.isArray(rel) ? rel : [rel];
  return arr.map((r) => (typeof r === 'object' ? r?.id : r)).filter((x) => x != null).map(Number);
}

function normalizeDependsOn(input, selfId) {
  if (!Array.isArray(input)) return { error: 'dependsOn must be a list' };
  const seen = new Set();
  const out = [];
  for (const raw of input) {
    const taskId = parseInt(String(raw && typeof raw === 'object' ? raw.taskId : raw), 10);
    if (Number.isNaN(taskId)) return { error: 'Each dependency needs a taskId' };
    if (taskId === Number(selfId)) return { error: 'A task cannot depend on itself' };
    if (seen.has(taskId)) continue;
    seen.add(taskId);
    const type = TYPES.includes(raw?.type) ? raw.type : 'FS';
    const lag = Number(raw?.lagDays);
    out.push({ taskId, type, lagDays: Number.isFinite(lag) ? Math.max(-365, Math.min(365, Math.round(lag))) : 0 });
  }
  if (out.length > 50) return { error: 'A task can have at most 50 dependencies' };
  return { dependsOn: out };
}

/** Load all tasks of the given projects (id, dates, dependsOn) in this org. */
async function loadProjectTasks(strapi, orgId, projectIds) {
  if (!projectIds.length) return [];
  return strapi.entityService.findMany(TASK_UID, {
    filters: { organization: orgId, projects: { id: { $in: projectIds } } },
    fields: ['id', 'name', 'startDate', 'scheduledDate', 'dependsOn'],
    limit: 5000,
  });
}

/** True if adding `dependsOn` to `taskId` creates a cycle in `tasks`. */
function createsCycle(tasks, taskId, dependsOn) {
  const deps = new Map(tasks.map((t) => [Number(t.id), (Array.isArray(t.dependsOn) ? t.dependsOn : []).map((d) => Number(d.taskId))]));
  deps.set(Number(taskId), dependsOn.map((d) => d.taskId));
  // DFS from each predecessor: can we reach taskId?
  const stack = [...deps.get(Number(taskId))];
  const seen = new Set();
  while (stack.length) {
    const n = stack.pop();
    if (n === Number(taskId)) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const m of deps.get(n) || []) stack.push(m);
  }
  return false;
}

/**
 * Validate and save a task's dependencies. Predecessors must be in one of the task's projects.
 * Returns { dependsOn } or { error }.
 */
async function setDependencies(strapi, orgId, task, input) {
  const { dependsOn, error } = normalizeDependsOn(input, task.id);
  if (error) return { error };
  const projectIds = relIds(task.projects);
  if (dependsOn.length && !projectIds.length) return { error: 'Add the task to a project before linking dependencies' };
  const tasks = await loadProjectTasks(strapi, orgId, projectIds);
  const ids = new Set(tasks.map((t) => Number(t.id)));
  const foreign = dependsOn.find((d) => !ids.has(d.taskId));
  if (foreign) return { error: 'Dependencies must be tasks in the same project' };
  if (createsCycle(tasks, task.id, dependsOn)) return { error: 'That would create a loop of tasks waiting on each other' };
  await strapi.entityService.update(TASK_UID, task.id, { data: { dependsOn } });
  return { dependsOn };
}

function toMs(v) {
  if (!v) return null;
  const n = Date.parse(v);
  return Number.isNaN(n) ? null : n;
}

/**
 * Move a task to new dates and push dependents forward where needed.
 * @returns {Promise<Array<{ id, name, startDate, scheduledDate }>>} every task whose dates changed
 */
async function rescheduleWithDependents(strapi, orgId, task, startDate, scheduledDate) {
  const projectIds = relIds(task.projects);
  const all = projectIds.length ? await loadProjectTasks(strapi, orgId, projectIds) : [];
  const byId = new Map(all.map((t) => [Number(t.id), { ...t }]));
  if (!byId.has(Number(task.id))) byId.set(Number(task.id), { ...task });

  const dependents = new Map(); // predecessorId -> [{ taskId, type, lagDays }]
  for (const t of byId.values()) {
    for (const d of Array.isArray(t.dependsOn) ? t.dependsOn : []) {
      const list = dependents.get(Number(d.taskId)) || [];
      list.push({ taskId: Number(t.id), type: d.type === 'SS' ? 'SS' : 'FS', lagDays: Number(d.lagDays) || 0 });
      dependents.set(Number(d.taskId), list);
    }
  }

  const changed = new Map();
  const root = byId.get(Number(task.id));
  root.startDate = startDate;
  root.scheduledDate = scheduledDate;
  changed.set(root.id, root);

  const queue = [Number(task.id)];
  let guard = 0;
  while (queue.length && guard++ < 10000) {
    const predId = queue.shift();
    const pred = byId.get(predId);
    const pStart = toMs(pred.startDate) ?? toMs(pred.scheduledDate);
    const pEnd = toMs(pred.scheduledDate) ?? pStart;
    for (const link of dependents.get(predId) || []) {
      const dep = byId.get(link.taskId);
      if (!dep) continue;
      const anchor = link.type === 'SS' ? pStart : pEnd;
      if (anchor == null) continue;
      const earliest = anchor + link.lagDays * DAY;
      const dStart = toMs(dep.startDate) ?? toMs(dep.scheduledDate);
      if (dStart == null || dStart >= earliest) continue;
      const shift = earliest - dStart;
      const dEnd = toMs(dep.scheduledDate);
      dep.startDate = new Date(dStart + shift).toISOString();
      if (dEnd != null) dep.scheduledDate = new Date(dEnd + shift).toISOString();
      changed.set(dep.id, dep);
      queue.push(Number(dep.id));
    }
  }

  for (const t of changed.values()) {
    await strapi.entityService.update(TASK_UID, t.id, {
      data: { startDate: t.startDate || null, scheduledDate: t.scheduledDate || null },
    });
  }
  return [...changed.values()].map((t) => ({ id: t.id, name: t.name, startDate: t.startDate, scheduledDate: t.scheduledDate }));
}

module.exports = { setDependencies, rescheduleWithDependents, normalizeDependsOn };
