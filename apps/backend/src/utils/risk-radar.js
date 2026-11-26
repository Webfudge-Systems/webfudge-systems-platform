'use strict';

/**
 * Risk radar (ticket W19, SaaS). Deterministic: no AI is needed to compute it.
 *
 * Inputs it combines:
 *   - sprint velocity (W7): completed points per day over the last completed sprints;
 *     falls back to task throughput (tasks completed in the last 28 days) when there are no points
 *   - dependency chains (W2): task.dependsOn [{ taskId, type: FS|SS, lagDays }]
 *   - workload / capacity (W6): weekly capacity per member vs estimated hours of their open tasks
 *   - due dates and overdue tasks
 *
 * Output (computeRiskRadar):
 *   level            low | medium | high, with reasons
 *   forecast         projected finish date from velocity / throughput, and slip vs the project end date
 *   tasks            open tasks at risk, each with a score, level, reasons and projected slip in days
 *   chains           overdue tasks that block other tasks (the whole downstream chain)
 *   reassignments    suggested moves from overloaded people to teammates with spare capacity
 *
 * Everything here is pure (no Strapi), so it is unit-tested directly (tests/risk-radar.test.js).
 */

const DAY = 86400000;
const DONE = new Set(['COMPLETED', 'CANCELLED']);
const WEEKS = 4;
const DEFAULT_CAPACITY = 40;
const DEFAULT_TASK_HOURS = 4;

const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const dateOnly = (v) => (v ? String(v instanceof Date ? v.toISOString() : v).slice(0, 10) : null);
const dayMs = (d) => (d ? Date.parse(`${dateOnly(d)}T00:00:00Z`) : null);
const msToDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((dayMs(b) - dayMs(a)) / DAY);
const isOpen = (t) => !DONE.has(String(t.status || '').toUpperCase());
const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const userName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || `User #${u.id}` : null);

function pointsOf(t) {
  const n = Number(t?.devMetadata?.storyPoints);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hoursOf(t) {
  const n = Number(t?.estimatedHours);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function mondayOf(day) {
  const ms = dayMs(day);
  const dt = new Date(ms);
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  return dt.toISOString().slice(0, 10);
}

// ---------- velocity / forecast ----------

/**
 * Delivery rate for the project.
 *   velocity:   completed points per day, averaged over the last 3 completed sprints
 *   throughput: tasks completed per week over the last 28 days
 */
function deliveryRate({ tasks, sprints = [], today }) {
  const completed = sprints
    .filter((s) => s.status === 'completed' && s.startDate && s.endDate)
    .sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)))
    .slice(0, 3);
  let pointsPerDay = null;
  if (completed.length) {
    const points = completed.reduce((a, s) => a + (Number(s.completedPoints) || 0), 0);
    const days = completed.reduce((a, s) => a + Math.max(1, daysBetween(s.startDate, s.endDate) + 1), 0);
    if (points > 0) pointsPerDay = points / days;
  }
  const since = dayMs(today) - 28 * DAY;
  const doneRecently = tasks.filter((t) => String(t.status).toUpperCase() === 'COMPLETED' && t.completedAt && Date.parse(t.completedAt) >= since).length;
  return {
    sprintsUsed: completed.length,
    pointsPerDay,
    pointsPerSprint: completed.length ? r1(completed.reduce((a, s) => a + (Number(s.completedPoints) || 0), 0) / completed.length) : null,
    tasksPerWeek: r1(doneRecently / 4),
  };
}

function forecast({ project, tasks, sprints, today }) {
  const open = tasks.filter(isOpen);
  const rate = deliveryRate({ tasks, sprints, today });
  const remainingPoints = open.reduce((a, t) => a + pointsOf(t), 0);
  let method = 'none';
  let daysNeeded = null;
  if (!open.length) {
    method = 'done';
    daysNeeded = 0;
  } else if (rate.pointsPerDay && remainingPoints > 0) {
    method = 'velocity';
    // Unpointed open tasks still need doing: count them at the average points of pointed ones.
    const pointed = open.filter((t) => pointsOf(t) > 0);
    const avg = pointed.length ? remainingPoints / pointed.length : 1;
    const total = remainingPoints + (open.length - pointed.length) * avg;
    daysNeeded = Math.ceil(total / rate.pointsPerDay);
  } else if (rate.tasksPerWeek > 0) {
    method = 'throughput';
    daysNeeded = Math.ceil((open.length / rate.tasksPerWeek) * 7);
  }
  const projectedFinish = daysNeeded == null ? null : msToDay(dayMs(today) + daysNeeded * DAY);
  const endDate = dateOnly(project?.endDate);
  const slipDays = projectedFinish && endDate ? Math.max(0, daysBetween(endDate, projectedFinish)) : null;
  return {
    method,
    openTasks: open.length,
    remainingPoints: r1(remainingPoints),
    ...rate,
    pointsPerDay: rate.pointsPerDay == null ? null : r1(rate.pointsPerDay),
    projectedFinish,
    endDate,
    slipDays,
  };
}

// ---------- workload ----------

/**
 * Hours allocated per user per week (same rule as the W6 capacity planner: estimates of open tasks
 * due that week; overdue work lands in the first week).
 * members: [{ userId, name, capacity, jobRole }], workloadTasks: open tasks of those users (any project).
 */
function buildWorkload({ members = [], workloadTasks = [], today }) {
  const weekStart = mondayOf(today);
  const weekStarts = Array.from({ length: WEEKS }, (_, i) => msToDay(dayMs(weekStart) + i * 7 * DAY));
  const byUser = new Map();
  for (const m of members) {
    byUser.set(Number(m.userId), {
      userId: Number(m.userId),
      name: m.name,
      jobRole: m.jobRole || null,
      capacity: m.capacity == null ? DEFAULT_CAPACITY : Number(m.capacity),
      allocated: weekStarts.map(() => 0),
    });
  }
  for (const t of workloadTasks) {
    if (!isOpen(t)) continue;
    const u = byUser.get(Number(relId(t.assignee)));
    if (!u) continue;
    const idx = weekIndex(weekStarts, t.scheduledDate);
    if (idx == null) continue;
    u.allocated[idx] += hoursOf(t) ?? 0;
  }
  return { weekStarts, byUser };
}

function weekIndex(weekStarts, due) {
  const d = dateOnly(due);
  if (!d) return null;
  if (d < weekStarts[0]) return 0;
  for (let i = weekStarts.length - 1; i >= 0; i -= 1) if (d >= weekStarts[i]) return d <= msToDay(dayMs(weekStarts[i]) + 6 * DAY) ? i : null;
  return null;
}

const utilization = (u, idx) => (u && u.capacity > 0 ? Math.round((u.allocated[idx] / u.capacity) * 100) : null);

// ---------- dependency chains ----------

function durationDays(t) {
  const s = dayMs(t.startDate);
  const e = dayMs(t.scheduledDate);
  if (s != null && e != null && e >= s) return Math.max(1, Math.round((e - s) / DAY));
  const h = hoursOf(t);
  return h ? Math.max(1, Math.ceil(h / 8)) : 1;
}

/**
 * Projected finish (ms) per open task: never before today when overdue, and never before its
 * predecessors' projected finish (FS) / start (SS) plus lag plus its own duration.
 */
function projectFinishes(tasks, todayMs) {
  const byId = new Map(tasks.map((t) => [Number(t.id), t]));
  const memo = new Map();
  const visiting = new Set();
  const cause = new Map(); // taskId -> predecessor id that pushes it

  function finish(id) {
    if (memo.has(id)) return memo.get(id);
    const t = byId.get(id);
    if (!t) return null;
    if (!isOpen(t)) {
      memo.set(id, null);
      return null;
    }
    if (visiting.has(id)) return dayMs(t.scheduledDate);
    visiting.add(id);
    const due = dayMs(t.scheduledDate);
    // An overdue open task cannot finish before the end of today, so its dependents start tomorrow at best.
    let best = due != null ? (due < todayMs ? todayMs + DAY : due) : null;
    const dur = durationDays(t);
    for (const d of Array.isArray(t.dependsOn) ? t.dependsOn : []) {
      const pid = Number(d.taskId);
      const p = byId.get(pid);
      if (!p || !isOpen(p)) continue;
      const pf = finish(pid);
      if (pf == null) continue;
      const lag = (Number(d.lagDays) || 0) * DAY;
      const anchor = d.type === 'SS' ? pf - durationDays(p) * DAY : pf;
      const candidate = anchor + lag + dur * DAY;
      // Tasks without a due date have nothing to slip against.
      if (best != null && candidate > best) {
        // Only blame the predecessor when it actually pushes the task past its due date.
        if (candidate > Math.max(due, todayMs)) cause.set(id, pid);
        best = candidate;
      }
    }
    visiting.delete(id);
    memo.set(id, best);
    return best;
  }

  for (const id of byId.keys()) finish(id);
  return { finishes: memo, cause };
}

function overdueChains(tasks, today) {
  const open = tasks.filter(isOpen);
  const dependents = new Map();
  for (const t of open) {
    for (const d of Array.isArray(t.dependsOn) ? t.dependsOn : []) {
      const list = dependents.get(Number(d.taskId)) || [];
      list.push(Number(t.id));
      dependents.set(Number(d.taskId), list);
    }
  }
  const byId = new Map(open.map((t) => [Number(t.id), t]));
  const chains = [];
  for (const t of open) {
    const due = dateOnly(t.scheduledDate);
    if (!due || due >= today || !dependents.has(Number(t.id))) continue;
    const seen = new Set();
    const stack = [...dependents.get(Number(t.id))];
    while (stack.length) {
      const n = stack.pop();
      if (seen.has(n) || n === Number(t.id)) continue;
      seen.add(n);
      for (const m of dependents.get(n) || []) stack.push(m);
    }
    const blocked = [...seen].map((id) => byId.get(id)).filter(Boolean);
    if (!blocked.length) continue;
    chains.push({
      root: { id: t.id, name: t.name, daysOverdue: daysBetween(due, today), assignee: t.assignee ? { id: relId(t.assignee), name: userName(t.assignee) } : null },
      blocked: blocked
        .sort((a, b) => String(a.scheduledDate || '9').localeCompare(String(b.scheduledDate || '9')))
        .map((b) => ({ id: b.id, name: b.name, due: dateOnly(b.scheduledDate) })),
    });
  }
  return chains.sort((a, b) => b.blocked.length - a.blocked.length || b.root.daysOverdue - a.root.daysOverdue);
}

// ---------- per-task risk ----------

function levelOf(score) {
  return score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
}

function scoreTasks({ tasks, today, workload }) {
  const todayMs = dayMs(today);
  const byId = new Map(tasks.map((t) => [Number(t.id), t]));
  const { finishes, cause } = projectFinishes(tasks, todayMs);
  const out = [];
  for (const t of tasks) {
    if (!isOpen(t)) continue;
    const due = dateOnly(t.scheduledDate);
    const reasons = [];
    const factors = [];
    let score = 0;
    const add = (pts, factor, why) => {
      score += pts;
      factors.push(factor);
      reasons.push(why);
    };
    const milestone = t.taskType === 'milestone' || t.taskType === 'deliverable';

    if (due && due < today) {
      const late = daysBetween(due, today);
      add(50 + Math.min(30, late * 5), 'overdue', `${late} day${late === 1 ? '' : 's'} overdue`);
    }

    const projected = finishes.get(Number(t.id));
    const dueMs = dayMs(due);
    let slipDays = 0;
    if (projected != null && dueMs != null) slipDays = Math.max(0, Math.round((projected - dueMs) / DAY));
    const blocker = cause.get(Number(t.id));
    if (blocker && slipDays > 0) {
      const p = byId.get(blocker);
      add(30 + Math.min(30, slipDays * 5), 'chain', `Waiting on "${p?.name || `#${blocker}`}", which is late; likely ${slipDays} day${slipDays === 1 ? '' : 's'} behind`);
    }

    const assigneeId = Number(relId(t.assignee)) || null;
    const idx = workload ? weekIndex(workload.weekStarts, due) : null;
    if (assigneeId && idx != null) {
      const u = workload.byUser.get(assigneeId);
      const util = utilization(u, idx);
      if (util != null && util > 100) {
        add(20 + Math.min(20, Math.round((util - 100) / 5)), 'overload', `${u.name} is at ${util}% of capacity that week`);
      }
    }
    if (!assigneeId && due && daysBetween(today, due) <= 7) add(25, 'unassigned', 'Nobody is assigned and it is due within a week');
    if (due && due >= today && daysBetween(today, due) <= 3 && String(t.status).toUpperCase() === 'SCHEDULED') {
      add(15, 'not_started', `Due in ${daysBetween(today, due)} day${daysBetween(today, due) === 1 ? '' : 's'} and not started`);
    }
    if (!score) continue;
    if (milestone) score += 10;
    score = Math.min(100, score);
    out.push({
      id: t.id,
      name: t.name,
      due,
      status: t.status,
      taskType: t.taskType || 'task',
      assignee: assigneeId ? { id: assigneeId, name: userName(t.assignee) || workload?.byUser.get(assigneeId)?.name || null } : null,
      estimatedHours: hoursOf(t),
      score,
      level: levelOf(score),
      factors,
      reasons,
      slipDays,
      projectedFinish: projected != null ? msToDay(projected) : null,
      weekIndex: idx,
    });
  }
  return out.sort((a, b) => b.score - a.score || String(a.due || '9').localeCompare(String(b.due || '9')));
}

// ---------- reassignment ----------

/**
 * For at-risk tasks whose assignee is overloaded (or that nobody owns), suggest the teammate with
 * the most spare hours that week. Prefers people on the project and with the same job role.
 * Allocations are updated as suggestions are made so one person does not get everything.
 */
function suggestReassignments({ risky, workload, candidateIds = [], max = 5 }) {
  if (!workload) return [];
  const pool = candidateIds.map((id) => workload.byUser.get(Number(id))).filter(Boolean);
  if (!pool.length) return [];
  const projectSet = new Set(candidateIds.map(Number));
  const alloc = new Map(pool.map((u) => [u.userId, [...u.allocated]]));
  const out = [];
  for (const t of risky) {
    if (out.length >= max) break;
    if (t.level === 'low' || t.weekIndex == null) continue;
    if (!t.factors.includes('overload') && !t.factors.includes('unassigned')) continue;
    const hours = t.estimatedHours ?? DEFAULT_TASK_HOURS;
    const from = t.assignee ? workload.byUser.get(t.assignee.id) : null;
    let best = null;
    for (const u of pool) {
      if (from && u.userId === from.userId) continue;
      if (u.capacity <= 0) continue;
      const a = alloc.get(u.userId);
      const spare = u.capacity - a[t.weekIndex];
      if (spare < hours) continue;
      let rank = spare;
      if (from?.jobRole && u.jobRole === from.jobRole) rank += 20;
      if (projectSet.has(u.userId)) rank += 5;
      if (!best || rank > best.rank) best = { u, rank, spare };
    }
    if (!best) continue;
    const a = alloc.get(best.u.userId);
    const before = Math.round((a[t.weekIndex] / best.u.capacity) * 100);
    a[t.weekIndex] += hours;
    const after = Math.round((a[t.weekIndex] / best.u.capacity) * 100);
    out.push({
      taskId: t.id,
      taskName: t.name,
      due: t.due,
      hours,
      from: from ? { id: from.userId, name: from.name, utilization: utilization(from, t.weekIndex) } : null,
      to: { id: best.u.userId, name: best.u.name, jobRole: best.u.jobRole, utilization: before, utilizationAfter: after },
      reason: from
        ? `${from.name} is at ${utilization(from, t.weekIndex)}% that week; ${best.u.name} has ${r1(best.spare)} h free`
        : `Unassigned; ${best.u.name} has ${r1(best.spare)} h free that week`,
    });
  }
  return out;
}

// ---------- overall ----------

function overallLevel({ fc, risky, chains }) {
  const reasons = [];
  let level = 0;
  const bump = (l, why) => {
    level = Math.max(level, l);
    reasons.push(why);
  };
  if (fc.slipDays != null && fc.slipDays > 7) bump(2, `Forecast to finish ${fc.slipDays} days after the end date`);
  else if (fc.slipDays) bump(1, `Forecast to finish ${fc.slipDays} day${fc.slipDays === 1 ? '' : 's'} after the end date`);
  const high = risky.filter((t) => t.level === 'high').length;
  const medium = risky.filter((t) => t.level === 'medium').length;
  if (high >= 3) bump(2, `${high} tasks at high risk`);
  else if (high) bump(1, `${high} task${high === 1 ? '' : 's'} at high risk`);
  else if (medium >= 2) bump(1, `${medium} tasks at medium risk`);
  const blocked = chains.reduce((a, c) => a + c.blocked.length, 0);
  if (blocked >= 3) bump(2, `${blocked} tasks blocked by overdue work`);
  else if (blocked) bump(1, `${blocked} task${blocked === 1 ? '' : 's'} blocked by overdue work`);
  return { level: ['low', 'medium', 'high'][level], reasons };
}

/**
 * @param {object} o
 * @param {object} o.project        { id, name, startDate, endDate }
 * @param {Array}  o.tasks          project tasks (open and done): id, name, status, scheduledDate, startDate,
 *                                  estimatedHours, completedAt, dependsOn, devMetadata, taskType, assignee
 * @param {Array}  [o.sprints]      project sprints: status, startDate, endDate, completedPoints
 * @param {Array}  [o.members]      [{ userId, name, capacity, jobRole }] people whose workload matters
 * @param {Array}  [o.workloadTasks] open tasks of those members across all projects (for capacity)
 * @param {Array}  [o.candidateIds] user ids that may receive reassigned work (project team)
 * @param {string} [o.today]        YYYY-MM-DD (defaults to now, UTC)
 */
function computeRiskRadar({ project, tasks = [], sprints = [], members = [], workloadTasks = [], candidateIds = [], today }) {
  const day = dateOnly(today) || new Date().toISOString().slice(0, 10);
  const workload = members.length ? buildWorkload({ members, workloadTasks, today: day }) : null;
  const fc = forecast({ project, tasks, sprints, today: day });
  const risky = scoreTasks({ tasks, today: day, workload });
  const chains = overdueChains(tasks, day);
  const reassignments = suggestReassignments({ risky, workload, candidateIds });
  const overall = overallLevel({ fc, risky, chains });
  return {
    generatedAt: new Date().toISOString(),
    today: day,
    level: overall.level,
    reasons: overall.reasons,
    forecast: fc,
    counts: {
      open: fc.openTasks,
      overdue: tasks.filter((t) => isOpen(t) && dateOnly(t.scheduledDate) && dateOnly(t.scheduledDate) < day).length,
      high: risky.filter((t) => t.level === 'high').length,
      medium: risky.filter((t) => t.level === 'medium').length,
      blocked: chains.reduce((a, c) => a + c.blocked.length, 0),
    },
    tasks: risky.filter((t) => t.level !== 'low' || t.factors.length > 1).slice(0, 25).map(({ weekIndex, ...rest }) => rest),
    chains: chains.slice(0, 10),
    reassignments,
    weekStarts: workload?.weekStarts || [],
  };
}

module.exports = { computeRiskRadar, deliveryRate, forecast, buildWorkload, scoreTasks, overdueChains, suggestReassignments, userName, dateOnly };
