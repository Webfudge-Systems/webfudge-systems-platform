'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, CalendarRange } from 'lucide-react'

const DAY = 86400000
const ROW_H = 40
const LEFT_W = 260
const ZOOMS = { day: 34, week: 14 }

function dayStart(v) {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
}

function fmt(ms) {
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** Rows: parents first by start, each followed by its subtasks. Undated tasks are listed separately. */
function buildRows(tasks) {
  const dated = []
  const undated = []
  for (const t of tasks) {
    const s = dayStart(t.startDate) ?? dayStart(t.dueDate)
    const e = dayStart(t.dueDate) ?? s
    if (s == null) undated.push(t)
    else dated.push({ ...t, _s: s, _e: Math.max(e, s) })
  }
  const byStart = (a, b) => a._s - b._s || a._e - b._e
  const childrenOf = new Map()
  const roots = []
  const ids = new Set(dated.map((t) => String(t.id)))
  for (const t of dated) {
    const pid = t.parentTask?.id ?? t.parentId
    if (pid != null && ids.has(String(pid)) && String(pid) !== String(t.id)) {
      const list = childrenOf.get(String(pid)) || []
      list.push(t)
      childrenOf.set(String(pid), list)
    } else roots.push(t)
  }
  const rows = []
  for (const r of roots.sort(byStart)) {
    rows.push({ ...r, _depth: 0 })
    for (const c of (childrenOf.get(String(r.id)) || []).sort(byStart)) rows.push({ ...c, _depth: 1 })
  }
  return { rows, undated }
}

/** Critical path: walk back from the latest-finishing task through its binding predecessors. */
function criticalPath(rows) {
  const byId = new Map(rows.map((r) => [String(r.id), r]))
  if (!rows.length) return new Set()
  let cur = rows.reduce((a, b) => (b._e > a._e ? b : a))
  const path = new Set()
  let guard = 0
  while (cur && guard++ < 500) {
    path.add(String(cur.id))
    const deps = (cur.dependsOn || []).map((d) => ({ d, p: byId.get(String(d.taskId)) })).filter((x) => x.p)
    if (!deps.length) break
    deps.sort((a, b) => (b.d.type === 'SS' ? b.p._s : b.p._e) - (a.d.type === 'SS' ? a.p._s : a.p._e))
    cur = deps[0].p
  }
  return path.size > 1 ? path : new Set()
}

/**
 * Project Gantt / timeline (ticket W2): bars from start → due, dependency arrows (finish→start and
 * start→start), critical path, drag to move, drag the right edge to change the due date.
 * @param {{ tasks: object[], canEditTask?: (task) => boolean, onReschedule: (task, startIso, dueIso) => Promise<void> }} props
 */
export default function ProjectGantt({ tasks, canEditTask = () => false, onReschedule }) {
  const [zoom, setZoom] = useState('day')
  const [drag, setDrag] = useState(null) // { id, mode, startX, delta }
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const dragRef = useRef(null)
  const dayW = ZOOMS[zoom]

  const { rows, undated } = useMemo(() => buildRows(tasks || []), [tasks])
  const critical = useMemo(() => criticalPath(rows), [rows])

  const range = useMemo(() => {
    if (!rows.length) return null
    const min = Math.min(...rows.map((r) => r._s)) - 3 * DAY
    const max = Math.max(...rows.map((r) => r._e)) + 10 * DAY
    return { min, days: Math.round((max - min) / DAY) + 1 }
  }, [rows])

  const effective = useCallback(
    (r) => {
      if (!drag || String(drag.id) !== String(r.id)) return { s: r._s, e: r._e }
      if (drag.mode === 'resize') return { s: r._s, e: Math.max(r._s, r._e + drag.delta * DAY) }
      return { s: r._s + drag.delta * DAY, e: r._e + drag.delta * DAY }
    },
    [drag]
  )

  const onPointerDown = (e, r, mode) => {
    if (!canEditTask(r) || busyId) return
    e.preventDefault()
    e.stopPropagation()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const next = { id: r.id, mode, startX: e.clientX, delta: 0 }
    dragRef.current = next
    setDrag(next)
    setError('')
  }

  const onPointerMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const delta = Math.round((e.clientX - d.startX) / dayW)
    if (delta !== d.delta) {
      dragRef.current = { ...d, delta }
      setDrag(dragRef.current)
    }
  }

  const onPointerUp = async () => {
    const d = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (!d || d.delta === 0) return
    const r = rows.find((x) => String(x.id) === String(d.id))
    if (!r) return
    const s = d.mode === 'resize' ? r._s : r._s + d.delta * DAY
    const e = d.mode === 'resize' ? Math.max(r._s, r._e + d.delta * DAY) : r._e + d.delta * DAY
    setBusyId(r.id)
    try {
      // Keep the original time of day (09:00 UTC) used by the rest of PM.
      await onReschedule(r, new Date(s + 9 * 3600000).toISOString(), new Date(e + 9 * 3600000).toISOString())
    } catch (err) {
      setError(err?.message || 'Could not reschedule the task')
    } finally {
      setBusyId(null)
    }
  }

  if (!rows.length) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 p-8 text-center">
        <CalendarRange className="mb-3 h-8 w-8 text-gray-300" aria-hidden />
        <p className="text-sm text-gray-600">No dated tasks yet. Add start and due dates to tasks to see the timeline.</p>
      </div>
    )
  }

  const width = range.days * dayW
  const today = dayStart(new Date())
  const x = (ms) => ((ms - range.min) / DAY) * dayW
  const rowIndex = new Map(rows.map((r, i) => [String(r.id), i]))

  const arrows = []
  for (const r of rows) {
    for (const d of r.dependsOn || []) {
      const pi = rowIndex.get(String(d.taskId))
      if (pi == null) continue
      const p = rows[pi]
      const pe = effective(p)
      const re = effective(r)
      const x1 = d.type === 'SS' ? x(pe.s) : x(pe.e) + dayW
      const y1 = pi * ROW_H + ROW_H / 2
      const x2 = x(re.s)
      const y2 = rowIndex.get(String(r.id)) * ROW_H + ROW_H / 2
      const crit = critical.has(String(r.id)) && critical.has(String(p.id))
      const elbow = Math.max(x1 + 8, Math.min(x2 - 8, x1 + 8))
      arrows.push({ key: `${p.id}-${r.id}`, d: `M ${x1} ${y1} H ${elbow} V ${y2} H ${x2 - 2}`, crit })
    }
  }

  // Header: month labels + day ticks.
  const ticks = []
  for (let i = 0; i < range.days; i++) {
    const ms = range.min + i * DAY
    const d = new Date(ms)
    ticks.push({ i, ms, day: d.getUTCDate(), weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6, monthStart: d.getUTCDate() === 1 || i === 0 })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Drag a bar to move it; drag its right edge to change the due date. Dependent tasks move with it.
          {critical.size ? <span className="ml-1 font-medium text-red-600">Red = critical path.</span> : null}
        </p>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-semibold" role="group" aria-label="Zoom">
          {Object.keys(ZOOMS).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              aria-pressed={zoom === z}
              className={`rounded-md px-3 py-1 capitalize ${zoom === z ? 'bg-orange-500 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              {z}
            </button>
          ))}
        </div>
      </div>
      {error ? (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex">
          {/* Names */}
          <div className="shrink-0 border-r border-gray-200 bg-white" style={{ width: LEFT_W }}>
            <div className="flex h-12 items-end border-b border-gray-200 px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Task
            </div>
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 border-b border-gray-50 px-3 text-sm"
                style={{ height: ROW_H, paddingLeft: 12 + r._depth * 18 }}
              >
                <Link
                  href={`/tasks/${r.id}`}
                  className={`truncate hover:text-orange-600 hover:underline ${r._depth ? 'text-gray-700' : 'font-semibold text-gray-900'}`}
                  title={r.name}
                >
                  {r.name}
                </Link>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div className="min-w-0 flex-1 overflow-x-auto" onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp}>
            <div className="relative" style={{ width }}>
              <div className="relative h-12 border-b border-gray-200">
                {ticks.map((t) => (
                  <div key={t.i} className="absolute bottom-0 top-0" style={{ left: t.i * dayW, width: dayW }}>
                    {t.monthStart ? (
                      <span className="absolute left-1 top-1 whitespace-nowrap text-[11px] font-semibold text-gray-700">
                        {new Date(t.ms).toLocaleDateString(undefined, { month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      </span>
                    ) : null}
                    {zoom === 'day' || t.day % 7 === 1 ? (
                      <span className={`absolute bottom-1.5 left-0 right-0 text-center text-[10px] ${t.weekend ? 'text-gray-400' : 'text-gray-500'}`}>
                        {t.day}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div className="relative" style={{ height: rows.length * ROW_H }}>
                {/* Weekend shading + today */}
                {ticks
                  .filter((t) => t.weekend)
                  .map((t) => (
                    <div key={t.i} className="absolute bottom-0 top-0 bg-gray-50" style={{ left: t.i * dayW, width: dayW }} />
                  ))}
                {today >= range.min && today <= range.min + range.days * DAY ? (
                  <div className="absolute bottom-0 top-0 w-px bg-orange-400" style={{ left: x(today) + dayW / 2 }} title="Today" />
                ) : null}

                {/* Arrows */}
                <svg className="pointer-events-none absolute inset-0" width={width} height={rows.length * ROW_H} aria-hidden>
                  <defs>
                    <marker id="gantt-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M0,0 L8,4 L0,8 z" fill="#9ca3af" />
                    </marker>
                    <marker id="gantt-arrow-crit" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                      <path d="M0,0 L8,4 L0,8 z" fill="#dc2626" />
                    </marker>
                  </defs>
                  {arrows.map((a) => (
                    <path
                      key={a.key}
                      d={a.d}
                      fill="none"
                      stroke={a.crit ? '#dc2626' : '#9ca3af'}
                      strokeWidth={a.crit ? 2 : 1.5}
                      markerEnd={`url(#${a.crit ? 'gantt-arrow-crit' : 'gantt-arrow'})`}
                    />
                  ))}
                </svg>

                {/* Bars */}
                {rows.map((r, i) => {
                  const { s, e } = effective(r)
                  const left = x(s)
                  const w = Math.max(dayW, ((e - s) / DAY + 1) * dayW)
                  const crit = critical.has(String(r.id))
                  const milestone = r.taskType === 'milestone' || (r._depth > 0 && e === s && r.taskType !== 'task')
                  const editable = canEditTask(r)
                  const done = r.strapiStatus === 'COMPLETED'
                  const top = i * ROW_H + 8
                  const title = `${r.name}: ${fmt(s)} → ${fmt(e)}`
                  if (milestone) {
                    return (
                      <div
                        key={r.id}
                        role="img"
                        aria-label={title}
                        title={title}
                        onPointerDown={(ev) => onPointerDown(ev, r, 'move')}
                        className={`absolute h-5 w-5 rotate-45 rounded-sm border-2 ${crit ? 'border-red-600 bg-red-500' : 'border-amber-600 bg-amber-400'} ${editable ? 'cursor-grab' : ''}`}
                        style={{ left: x(e) + dayW / 2 - 10, top: top + 2 }}
                      />
                    )
                  }
                  return (
                    <div
                      key={r.id}
                      title={title}
                      onPointerDown={(ev) => onPointerDown(ev, r, 'move')}
                      className={`absolute flex items-center rounded-md px-2 text-[11px] font-medium text-white shadow-sm select-none ${
                        r._depth ? 'h-6' : 'h-6 opacity-95'
                      } ${done ? 'bg-emerald-500' : r._depth ? 'bg-orange-500' : 'bg-slate-600'} ${crit ? 'ring-2 ring-red-500 ring-offset-1' : ''} ${
                        editable ? 'cursor-grab active:cursor-grabbing' : ''
                      } ${String(busyId) === String(r.id) ? 'animate-pulse' : ''}`}
                      style={{ left, width: w, top }}
                    >
                      <span className="truncate">{w > 70 ? r.name : ''}</span>
                      {editable ? (
                        <span
                          onPointerDown={(ev) => onPointerDown(ev, r, 'resize')}
                          className="absolute bottom-0 right-0 top-0 w-2 cursor-ew-resize rounded-r-md bg-black/20"
                          aria-label="Change due date"
                        />
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {undated.length ? (
        <p className="text-xs text-gray-500">
          {undated.length} task{undated.length === 1 ? '' : 's'} without dates {undated.length === 1 ? 'is' : 'are'} not shown.
        </p>
      ) : null}
    </div>
  )
}
