'use strict';

/**
 * Goals / OKRs (W12). Generic: objectives → key results → check-ins, scoped by organization.
 * Built for Fudge Work first; Fudge People will reuse the same types (objective.scope).
 *
 * Key result progress (0–100):
 * - number / percent: (current − start) / (target − start), clamped. Moved by manual check-ins.
 * - tasks: done / total over the linked tasks plus the top-level tasks of the linked projects
 *   (cancelled tasks are left out). Recomputed from the task lifecycle hook whenever a task's
 *   status, projects or existence changes, so completing a linked task moves the key result.
 * Objective progress = average of its key results.
 */

const OBJECTIVE_UID = 'api::goal.objective';
const KR_UID = 'api::goal.key-result';
const CHECKIN_UID = 'api::goal.check-in';
const TASK_UID = 'api::task.task';

const METRIC_TYPES = ['number', 'percent', 'tasks'];
const CONFIDENCE = ['on_track', 'at_risk', 'off_track'];
const DONE = 'COMPLETED';
const EXCLUDED = ['CANCELLED'];

const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const clamp = (n, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));
const num = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const relId = (v) => {
  if (v == null) return null;
  if (typeof v === 'object') return v.id != null ? Number(v.id) : null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Progress for a number / percent key result. */
function metricProgress(start, target, current) {
  const s = num(start);
  const t = num(target, 100);
  const c = num(current);
  if (t === s) return c >= t ? 100 : 0;
  return r1(clamp(((c - s) / (t - s)) * 100));
}

/** Pure: task-based progress from a list of { status } rows. */
function taskProgress(tasks) {
  const counted = (tasks || []).filter((t) => !EXCLUDED.includes(t.status));
  const done = counted.filter((t) => t.status === DONE).length;
  return { done, total: counted.length, progress: counted.length ? r1((done / counted.length) * 100) : 0 };
}

/** Pure: objective progress = mean of key result progress. */
function objectiveProgress(keyResults) {
  const list = (keyResults || []).filter(Boolean);
  if (!list.length) return 0;
  return r1(list.reduce((a, kr) => a + num(kr.progress), 0) / list.length);
}

/** Worst confidence across key results (for the objective's health badge). */
function objectiveHealth(keyResults) {
  const list = (keyResults || []).map((k) => k.confidence).filter(Boolean);
  if (list.includes('off_track')) return 'off_track';
  if (list.includes('at_risk')) return 'at_risk';
  return 'on_track';
}

/** All tasks counted for a task-based key result (deduplicated). */
async function tasksForKeyResult(strapi, kr) {
  const taskIds = (kr.tasks || []).map(relId).filter(Boolean);
  const projectIds = (kr.projects || []).map(relId).filter(Boolean);
  if (!taskIds.length && !projectIds.length) return [];
  const or = [];
  if (taskIds.length) or.push({ id: { $in: taskIds } });
  if (projectIds.length) or.push({ projects: { id: { $in: projectIds } }, parent: { id: { $null: true } } });
  const rows = await strapi.entityService.findMany(TASK_UID, {
    filters: { $or: or },
    fields: ['id', 'name', 'status'],
    limit: 5000,
  });
  const seen = new Map();
  for (const r of rows) seen.set(r.id, r);
  return [...seen.values()];
}

async function loadKeyResult(strapi, id) {
  return strapi.entityService.findOne(KR_UID, id, {
    populate: {
      tasks: { fields: ['id'] },
      projects: { fields: ['id'] },
      objective: { fields: ['id'] },
      organization: { fields: ['id'] },
    },
  });
}

/** Recompute and store an objective's progress from its key results. */
async function recomputeObjective(strapi, objectiveId) {
  const id = relId(objectiveId);
  if (!id) return null;
  const krs = await strapi.entityService.findMany(KR_UID, {
    filters: { objective: { id } },
    fields: ['id', 'progress', 'confidence'],
    limit: 500,
  });
  const progress = objectiveProgress(krs);
  await strapi.entityService.update(OBJECTIVE_UID, id, { data: { progress } });
  return progress;
}

/**
 * Recompute a task-based key result. Writes an automatic check-in when the value changed so the
 * history shows how linked work moved the result. Returns the updated key result (or null).
 */
async function recomputeTaskKeyResult(strapi, krOrId, { authorId = null } = {}) {
  const kr = typeof krOrId === 'object' && krOrId?.tasks ? krOrId : await loadKeyResult(strapi, relId(krOrId));
  if (!kr || kr.metricType !== 'tasks') return null;
  const { done, total, progress } = taskProgress(await tasksForKeyResult(strapi, kr));
  const changed = num(kr.currentValue) !== done || num(kr.targetValue) !== total || num(kr.progress) !== progress;
  if (!changed) return kr;
  const now = new Date().toISOString();
  const updated = await strapi.entityService.update(KR_UID, kr.id, {
    data: { startValue: 0, currentValue: done, targetValue: total, progress, lastCheckInAt: now },
  });
  await strapi.entityService.create(CHECKIN_UID, {
    data: {
      value: done,
      progress,
      source: 'auto',
      note: `${done} of ${total} linked task${total === 1 ? '' : 's'} done`,
      keyResult: kr.id,
      author: authorId || null,
      organization: relId(kr.organization),
    },
  });
  await recomputeObjective(strapi, relId(kr.objective));
  return updated;
}

/** Task-based key results affected by a task (linked directly or through one of its projects). */
async function keyResultIdsForTask(strapi, taskId, projectIds = []) {
  const or = [{ tasks: { id: taskId } }];
  const pids = projectIds.map(relId).filter(Boolean);
  if (pids.length) or.push({ projects: { id: { $in: pids } } });
  const rows = await strapi.entityService.findMany(KR_UID, {
    filters: { metricType: 'tasks', $or: or },
    fields: ['id'],
    limit: 500,
  });
  return rows.map((r) => r.id);
}

/**
 * Called from the task lifecycle hook. Never throws: a goal recompute must not break a task write.
 * `projectIds` should include the task's projects before and after the change when known.
 */
async function onTaskChanged(strapi, taskId, projectIds = []) {
  try {
    const id = relId(taskId);
    if (!id) return;
    let pids = projectIds;
    if (!pids.length) {
      const t = await strapi.entityService.findOne(TASK_UID, id, { fields: ['id'], populate: { projects: { fields: ['id'] } } });
      pids = (t?.projects || []).map((p) => p.id);
    }
    const krIds = await keyResultIdsForTask(strapi, id, pids);
    for (const krId of krIds) await recomputeTaskKeyResult(strapi, krId);
  } catch (e) {
    strapi.log.warn(`[goals] key result recompute after task ${taskId} failed: ${e?.message || e}`);
  }
}

module.exports = {
  OBJECTIVE_UID,
  KR_UID,
  CHECKIN_UID,
  METRIC_TYPES,
  CONFIDENCE,
  r1,
  num,
  relId,
  metricProgress,
  taskProgress,
  objectiveProgress,
  objectiveHealth,
  tasksForKeyResult,
  loadKeyResult,
  recomputeObjective,
  recomputeTaskKeyResult,
  keyResultIdsForTask,
  onTaskChanged,
};
