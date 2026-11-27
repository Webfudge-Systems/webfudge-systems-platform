'use strict';

/**
 * W21 My Day: deterministic day planner (pure, no I/O).
 *
 * Times are minutes from local midnight. Ranking: overdue → due today → priority → due date → id.
 * A manual `order` puts those tasks first. Dependencies (W2 `dependsOn`): a task waits for every
 * open predecessor; a predecessor that is on today's list is placed first, any other open one
 * blocks the task. Meetings and pinned tasks are fixed; the rest fill the free gaps first-fit until
 * the daily capacity (W6 weekly capacity / 5) is used. The last task may be split (partial) when at
 * least 30 minutes of capacity are left.
 */

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };
const MIN_PARTIAL = 30;
const STEP = 15;

const num = (v) => (v == null || v === '' ? null : Number(v));
const ceilStep = (m) => Math.ceil(m / STEP) * STEP;

function predIds(t) {
  return (Array.isArray(t.dependsOn) ? t.dependsOn : [])
    .map((d) => Number(d && typeof d === 'object' ? d.taskId : d))
    .filter((n) => Number.isFinite(n));
}

function rankKey(t, date) {
  const due = t.dueDate ? String(t.dueDate).slice(0, 10) : null;
  const bucket = due && due < date ? 0 : due === date ? 1 : 2;
  return [bucket, PRIORITY_RANK[t.priority] ?? 1, due || '9999-99-99', Number(t.id)];
}

function compareKeys(a, b) {
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
}

/** Free gaps inside [from, to) given busy intervals. */
function freeGaps(busy, from, to) {
  const sorted = busy.filter((b) => b.end > from && b.start < to).sort((a, b) => a.start - b.start);
  const gaps = [];
  let cur = from;
  for (const b of sorted) {
    if (b.start > cur) gaps.push({ start: cur, end: Math.min(b.start, to) });
    cur = Math.max(cur, b.end);
  }
  if (cur < to) gaps.push({ start: cur, end: to });
  return gaps;
}

/**
 * @param {object} o
 * @param {string} o.date                 YYYY-MM-DD being planned
 * @param {Array}  o.tasks                [{ id, name, priority, dueDate, estimatedHours, dependsOn }]
 * @param {Array}  [o.meetings]           [{ id, title, start, end }] in minutes
 * @param {Array}  [o.openTaskIds]        ids of all open tasks (to tell open predecessors from done ones)
 * @param {number} [o.workStart=540] [o.workEnd=1080] [o.capacityHours=8] [o.defaultEstimateHours=1]
 * @param {number} [o.nowMinute]          when planning today: do not schedule in the past
 * @param {object} [o.overrides]          { order: [taskId], excluded: [taskId], pinned: [{ taskId, start }] }
 */
function planDay(o) {
  const date = String(o.date).slice(0, 10);
  const workStart = num(o.workStart) ?? 540;
  const workEnd = num(o.workEnd) ?? 1080;
  const capacity = Math.max(0, Math.round((num(o.capacityHours) ?? 8) * 60));
  const defaultMinutes = Math.round((num(o.defaultEstimateHours) ?? 1) * 60);
  const ov = o.overrides || {};
  const excluded = new Set((ov.excluded || []).map(Number));
  const pins = new Map((ov.pinned || []).map((p) => [Number(p.taskId), Number(p.start)]));
  const order = (ov.order || []).map(Number);

  const tasks = (o.tasks || []).map((t) => ({ ...t, id: Number(t.id) }));
  const candidates = tasks.filter((t) => !excluded.has(t.id));
  const candidateIds = new Set(candidates.map((t) => t.id));
  const openIds = new Set((o.openTaskIds || []).map(Number));
  const unscheduled = tasks.filter((t) => excluded.has(t.id)).map((t) => ({ id: t.id, reason: 'excluded' }));

  const durationOf = (t) => {
    const est = num(t.estimatedHours);
    return est != null && est > 0 ? Math.max(STEP, Math.round(est * 60)) : defaultMinutes;
  };
  const taskBlock = (t, start, end, extra = {}) => {
    const due = t.dueDate ? String(t.dueDate).slice(0, 10) : null;
    return {
      kind: 'task',
      id: t.id,
      name: t.name || `Task #${t.id}`,
      priority: t.priority || null,
      dueDate: due,
      projectName: t.projectName || null,
      start,
      end,
      estimated: num(t.estimatedHours) != null && num(t.estimatedHours) > 0,
      overdue: Boolean(due && due < date),
      partial: false,
      pinned: false,
      ...extra,
    };
  };

  const meetings = (o.meetings || [])
    .map((m) => ({ kind: 'meeting', id: m.id, title: m.title || 'Meeting', start: Math.max(workStart, Number(m.start)), end: Math.min(workEnd, Number(m.end)) }))
    .filter((m) => m.end > m.start);
  const busy = meetings.map((m) => ({ start: m.start, end: m.end }));
  const blocks = [...meetings];
  const placedEnd = new Map();
  let used = 0;

  // Pinned tasks first (the user put them there).
  for (const t of candidates) {
    if (!pins.has(t.id)) continue;
    const start = pins.get(t.id);
    const end = Math.min(workEnd, start + durationOf(t));
    if (!(end > start)) continue;
    blocks.push(taskBlock(t, start, end, { pinned: true }));
    busy.push({ start, end });
    placedEnd.set(t.id, end);
    used += end - start;
  }

  const ranked = candidates
    .filter((t) => !placedEnd.has(t.id))
    .sort((a, b) => {
      const ia = order.indexOf(a.id);
      const ib = order.indexOf(b.id);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
      return compareKeys(rankKey(a, date), rankKey(b, date));
    });

  const from = o.nowMinute != null ? Math.max(workStart, ceilStep(Number(o.nowMinute))) : workStart;
  const failed = new Set();
  const pending = [...ranked];

  // Predecessors that are open but not on today's list block their dependents up front.
  for (const t of [...pending]) {
    const outside = predIds(t).filter((p) => !candidateIds.has(p) && openIds.has(p));
    if (outside.length) {
      unscheduled.push({ id: t.id, reason: 'blocked', blockedBy: outside });
      failed.add(t.id);
      pending.splice(pending.indexOf(t), 1);
    }
  }

  while (pending.length) {
    // First task whose in-day predecessors are all placed; one whose predecessor failed is blocked.
    let idx = -1;
    for (let i = 0; i < pending.length; i += 1) {
      const preds = predIds(pending[i]).filter((p) => candidateIds.has(p));
      const bad = preds.filter((p) => failed.has(p));
      if (bad.length) {
        unscheduled.push({ id: pending[i].id, reason: 'blocked', blockedBy: bad });
        failed.add(pending[i].id);
        pending.splice(i, 1);
        idx = -2;
        break;
      }
      if (preds.every((p) => placedEnd.has(p))) {
        idx = i;
        break;
      }
    }
    if (idx === -2) continue;
    if (idx === -1) {
      // Dependency loop among today's tasks: block the rest rather than guess.
      for (const t of pending) {
        unscheduled.push({ id: t.id, reason: 'blocked', blockedBy: predIds(t).filter((p) => candidateIds.has(p) && !placedEnd.has(p)) });
      }
      break;
    }

    const t = pending.splice(idx, 1)[0];
    const earliest = Math.max(from, ...predIds(t).map((p) => placedEnd.get(p) || 0));
    const left = capacity - used;
    let dur = durationOf(t);
    let partial = false;
    if (dur > left) {
      if (left < MIN_PARTIAL) {
        unscheduled.push({ id: t.id, reason: 'no_capacity' });
        failed.add(t.id);
        continue;
      }
      dur = left;
      partial = true;
    }
    const gaps = freeGaps(busy, earliest, workEnd);
    const gap = gaps.find((g) => g.end - g.start >= dur);
    if (!gap) {
      unscheduled.push({ id: t.id, reason: 'no_capacity' });
      failed.add(t.id);
      continue;
    }
    const end = gap.start + dur;
    blocks.push(taskBlock(t, gap.start, end, { partial }));
    busy.push({ start: gap.start, end });
    placedEnd.set(t.id, end);
    used += dur;
  }

  blocks.sort((a, b) => a.start - b.start || (a.kind === b.kind ? 0 : a.kind === 'meeting' ? -1 : 1) || Number(a.id) - Number(b.id));
  const meetingMinutes = meetings.reduce((s, m) => s + (m.end - m.start), 0);
  return {
    date,
    workStart,
    workEnd,
    blocks,
    unscheduled,
    summary: { taskMinutes: used, meetingMinutes, capacityMinutes: capacity, scheduledTasks: placedEnd.size, unscheduledTasks: unscheduled.length },
  };
}

module.exports = { planDay, rankKey };
