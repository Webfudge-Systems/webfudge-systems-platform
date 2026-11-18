'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { GitMerge, Plus, X } from 'lucide-react'
import { Card } from '@webfudge/ui'
import taskService from '../lib/api/taskService'

const TYPE_LABEL = { FS: 'Finish → start', SS: 'Start → start' }

/**
 * "Blocked by / Blocking" for a task (ticket W2). Predecessors must be tasks in the same project.
 * @param {{ task: object, canEdit?: boolean, onChanged?: () => void }} props
 */
export default function TaskDependenciesCard({ task, canEdit = false, onChanged }) {
  const [projectTasks, setProjectTasks] = useState([])
  const [deps, setDeps] = useState(() => (Array.isArray(task?.dependsOn) ? task.dependsOn : []))
  const [adding, setAdding] = useState({ taskId: '', type: 'FS', lagDays: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setDeps(Array.isArray(task?.dependsOn) ? task.dependsOn : [])
  }, [task?.id, task?.dependsOn])

  useEffect(() => {
    if (!task?.projectId) return
    let cancelled = false
    taskService
      .fetchAllTasksByProject(Number(task.projectId), { pageSize: 500, sort: 'startDate:asc' })
      .then((rows) => {
        if (!cancelled) setProjectTasks((rows || []).map((r) => ({ id: r.id, name: r.name || r.attributes?.name, dependsOn: r.dependsOn || r.attributes?.dependsOn || [] })))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [task?.projectId])

  const nameOf = useMemo(() => new Map(projectTasks.map((t) => [String(t.id), t.name])), [projectTasks])
  const blocking = useMemo(
    () => projectTasks.filter((t) => (t.dependsOn || []).some((d) => String(d.taskId) === String(task?.id))),
    [projectTasks, task?.id]
  )
  const options = projectTasks.filter((t) => String(t.id) !== String(task?.id) && !deps.some((d) => String(d.taskId) === String(t.id)))

  if (!task?.projectId) return null

  const save = async (next) => {
    setBusy(true)
    setError('')
    try {
      const res = await taskService.setDependencies(task.id, next)
      setDeps(res?.data?.dependsOn ?? next)
      onChanged?.()
    } catch (e) {
      setError(e?.message || 'Could not save dependencies')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card variant="elevated" className="rounded-xl">
      <div className="mb-3 flex items-center gap-2">
        <GitMerge className="h-4 w-4 text-orange-500" aria-hidden />
        <h3 className="text-sm font-semibold text-gray-900">Dependencies</h3>
      </div>

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Blocked by</p>
      {deps.length ? (
        <ul className="mb-3 space-y-1.5">
          {deps.map((d) => (
            <li key={d.taskId} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 text-sm">
              <span className="min-w-0">
                <Link href={`/tasks/${d.taskId}`} className="truncate font-medium text-gray-900 hover:text-orange-600">
                  {nameOf.get(String(d.taskId)) || `Task #${d.taskId}`}
                </Link>
                <span className="ml-1.5 text-xs text-gray-500">
                  {TYPE_LABEL[d.type] || d.type}
                  {d.lagDays ? ` · ${d.lagDays > 0 ? '+' : ''}${d.lagDays}d` : ''}
                </span>
              </span>
              {canEdit ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => save(deps.filter((x) => String(x.taskId) !== String(d.taskId)))}
                  className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-600"
                  aria-label="Remove dependency"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-gray-400">Nothing</p>
      )}

      {canEdit && options.length ? (
        <div className="mb-3 space-y-2">
          <select
            aria-label="Task this one waits on"
            className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
            value={adding.taskId}
            onChange={(e) => setAdding((a) => ({ ...a, taskId: e.target.value }))}
          >
            <option value="">Add a task this waits on…</option>
            {options.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <select
              aria-label="Dependency type"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-orange-500 focus:outline-none"
              value={adding.type}
              onChange={(e) => setAdding((a) => ({ ...a, type: e.target.value }))}
            >
              <option value="FS">Finish → start</option>
              <option value="SS">Start → start</option>
            </select>
            <input
              type="number"
              aria-label="Lag in days"
              title="Lag (days)"
              className="w-16 rounded-lg border border-gray-300 px-2 py-1.5 text-xs focus:border-orange-500 focus:outline-none"
              value={adding.lagDays}
              onChange={(e) => setAdding((a) => ({ ...a, lagDays: e.target.value }))}
            />
            <button
              type="button"
              disabled={busy || !adding.taskId}
              onClick={async () => {
                await save([...deps, { taskId: Number(adding.taskId), type: adding.type, lagDays: Number(adding.lagDays) || 0 }])
                setAdding({ taskId: '', type: 'FS', lagDays: 0 })
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Blocking</p>
      {blocking.length ? (
        <ul className="space-y-1">
          {blocking.map((t) => (
            <li key={t.id}>
              <Link href={`/tasks/${t.id}`} className="text-sm text-gray-800 hover:text-orange-600">
                {t.name}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-400">Nothing</p>
      )}
    </Card>
  )
}
