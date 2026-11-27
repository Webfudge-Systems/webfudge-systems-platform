/**
 * Client-side helpers for editing an AI project plan (W16). The backend normalizes the plan again
 * on create (apps/backend/src/utils/ai/work-planner.js); these keep the preview consistent while
 * the person edits: role keys, finish-to-start start days, totals.
 */

export const TASK_TYPE_OPTIONS = [
  { value: 'task', label: 'Task' },
  { value: 'deliverable', label: 'Deliverable' },
  { value: 'milestone', label: 'Milestone' },
  { value: 'bug', label: 'Bug' },
]

// Same labels as the W4 template roles (utils/project-templates.js ROLES).
const KNOWN_ROLES = {
  'project manager': 'projectManager',
  designer: 'designer',
  developer: 'developer',
  copywriter: 'copywriter',
  'performance marketer': 'marketer',
  videographer: 'videographer',
  'video editor': 'editor',
  'account manager': 'accountManager',
}

export function roleKey(label) {
  const clean = String(label || '').replace(/\s+/g, ' ').trim() || 'Project manager'
  const known = KNOWN_ROLES[clean.toLowerCase()]
  if (known) return known
  const words = clean.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean)
  if (!words.length) return 'projectManager'
  return words.map((w, i) => (i ? w[0].toUpperCase() + w.slice(1) : w)).join('').slice(0, 40)
}

export function allTasks(plan) {
  return (plan?.phases || []).flatMap((p) => p.tasks || [])
}

export function nextRef(plan) {
  const used = new Set(allTasks(plan).map((t) => t.ref))
  let n = 1
  while (used.has(`T${n}`)) n += 1
  return `T${n}`
}

/**
 * Drops dependencies on missing or later tasks and moves start days so no task starts before the
 * tasks it depends on finish. Returns a new plan with roles and totals recomputed.
 */
export function reflow(plan) {
  const seen = new Map()
  const phases = (plan?.phases || []).map((p) => ({
    ...p,
    tasks: (p.tasks || []).map((t0) => {
      const t = { ...t0 }
      t.roleKey = roleKey(t.role)
      if (t.type === 'milestone') {
        t.estimateHours = 0
        t.durationDays = 0
      }
      t.estimateHours = Math.max(0, Number(t.estimateHours) || 0)
      t.durationDays = Math.max(0, Math.round(Number(t.durationDays) || 0))
      t.startDay = Math.max(0, Math.round(Number(t.startDay) || 0))
      t.dependsOn = (t.dependsOn || []).filter((r, i, arr) => seen.has(r) && arr.indexOf(r) === i)
      for (const r of t.dependsOn) {
        const pred = seen.get(r)
        t.startDay = Math.max(t.startDay, pred.startDay + pred.durationDays)
      }
      seen.set(t.ref, t)
      return t
    }),
  }))

  const roles = new Map()
  let hours = 0
  let end = 0
  let tasks = 0
  for (const t of phases.flatMap((p) => p.tasks)) {
    const r = roles.get(t.roleKey) || { key: t.roleKey, label: t.role || 'Project manager', taskCount: 0, hours: 0 }
    r.taskCount += 1
    r.hours += t.estimateHours
    roles.set(t.roleKey, r)
    hours += t.estimateHours
    end = Math.max(end, t.startDay + t.durationDays)
    tasks += 1
  }
  return {
    ...plan,
    phases,
    roles: [...roles.values()],
    totals: { tasks, hours: Math.round(hours * 100) / 100, durationDays: end },
  }
}

/** YYYY-MM-DD + n days (calendar days, same as the backend). */
export function dayToDate(startDate, days) {
  if (!startDate) return ''
  const d = new Date(`${startDate}T09:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return ''
  d.setUTCDate(d.getUTCDate() + (Number(days) || 0))
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}
