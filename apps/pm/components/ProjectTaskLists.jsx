'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@webfudge/ui'
import { ArrowDown, ArrowUp, Check, ChevronDown, FolderInput, Pencil, Plus, Trash2, X } from 'lucide-react'
import taskListService from '../lib/api/taskListService'
import taskService from '../lib/api/taskService'
import { filterMajorTasks } from '../lib/taskListUtils'

const STATUS_TONE = {
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  IN_PROGRESS: 'bg-sky-50 text-sky-700 ring-sky-200',
  INTERNAL_REVIEW: 'bg-violet-50 text-violet-700 ring-violet-200',
  ON_HOLD: 'bg-amber-50 text-amber-700 ring-amber-200',
  CANCELLED: 'bg-gray-100 text-gray-500 ring-gray-200',
  OVERDUE: 'bg-rose-50 text-rose-700 ring-rose-200',
}

/**
 * W1: project tasks grouped into lists / sections.
 * Create, rename, reorder and delete lists; move tasks between them; add a task straight into a list.
 * Tasks without a list (or in a list of another project) show in the project's default list.
 */
export default function ProjectTaskLists({ projectId, tasks = [], tasksLoading = false, canEdit = false, onTasksChanged }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [renaming, setRenaming] = useState({ id: null, name: '' })
  const [newListName, setNewListName] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [newTask, setNewTask] = useState({ listId: null, name: '' })
  const [collapsed, setCollapsed] = useState({})
  const [confirmDelete, setConfirmDelete] = useState(null)

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      setError('')
      setLists(await taskListService.listForProject(projectId))
    } catch (e) {
      setError(e?.message || 'Could not load lists')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const grouped = useMemo(() => {
    const top = filterMajorTasks(tasks)
    const listOf = new Map()
    for (const l of lists) for (const id of l.taskIds || []) listOf.set(String(id), l.id)
    const fallback = lists.find((l) => l.isDefault)?.id ?? lists[0]?.id
    const byList = new Map(lists.map((l) => [l.id, []]))
    for (const t of top) {
      const lid = listOf.get(String(t.id))
      const key = byList.has(lid) ? lid : fallback
      if (byList.has(key)) byList.get(key).push(t)
    }
    return byList
  }, [tasks, lists])

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e?.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  const createList = () =>
    run(async () => {
      const name = newListName.trim()
      if (!name) return
      await taskListService.create(projectId, name)
      setNewListName('')
      setAddingList(false)
      await load()
    })

  const saveRename = () =>
    run(async () => {
      const name = renaming.name.trim()
      if (!name) return
      await taskListService.rename(renaming.id, name)
      setRenaming({ id: null, name: '' })
      await load()
    })

  const move = (index, dir) =>
    run(async () => {
      const ids = lists.map((l) => l.id)
      const j = index + dir
      if (j < 0 || j >= ids.length) return
      ;[ids[index], ids[j]] = [ids[j], ids[index]]
      setLists(await taskListService.reorder(projectId, ids))
    })

  const removeList = (list) =>
    run(async () => {
      await taskListService.remove(list.id)
      setConfirmDelete(null)
      await load()
    })

  const moveTask = (task, listId) =>
    run(async () => {
      await taskListService.moveTasks(listId, [task.id])
      await load()
    })

  const addTask = () =>
    run(async () => {
      const name = newTask.name.trim()
      if (!name) return
      await taskService.createTask({ name, projectId, taskList: newTask.listId, status: 'SCHEDULED' })
      setNewTask({ listId: null, name: '' })
      await Promise.all([load(), onTasksChanged?.()])
    })

  if (loading || tasksLoading) {
    return <p className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading lists…</p>
  }

  const inputClass =
    'min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-200'

  return (
    <div className="space-y-3">
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      {lists.map((list, index) => {
        const rows = grouped.get(list.id) || []
        const isCollapsed = Boolean(collapsed[list.id])
        const isRenaming = renaming.id === list.id
        return (
          <section key={list.id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-gray-50/80 px-3 py-2">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [list.id]: !c[list.id] }))}
                className="rounded-md p-1 text-gray-500 hover:bg-gray-200/60"
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? `Expand ${list.name}` : `Collapse ${list.name}`}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              {isRenaming ? (
                <form
                  className="flex min-w-0 flex-1 items-center gap-1.5"
                  onSubmit={(e) => {
                    e.preventDefault()
                    saveRename()
                  }}
                >
                  <input
                    className={inputClass}
                    value={renaming.name}
                    onChange={(e) => setRenaming((r) => ({ ...r, name: e.target.value }))}
                    maxLength={120}
                    autoFocus
                    aria-label="List name"
                  />
                  <button type="submit" disabled={busy} className="rounded-md p-1.5 text-emerald-600 hover:bg-emerald-50" aria-label="Save name">
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenaming({ id: null, name: '' })}
                    className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                    aria-label="Cancel rename"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
              ) : (
                <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-900">
                  {list.name}
                  <span className="ml-2 text-xs font-normal text-gray-500">{rows.length}</span>
                </h3>
              )}
              {canEdit && !isRenaming ? (
                <div className="flex items-center gap-0.5">
                  <button type="button" disabled={busy || index === 0} onClick={() => move(index, -1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/60 disabled:opacity-30" aria-label={`Move ${list.name} up`}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={busy || index === lists.length - 1} onClick={() => move(index, 1)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/60 disabled:opacity-30" aria-label={`Move ${list.name} down`}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setRenaming({ id: list.id, name: list.name })} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-200/60" aria-label={`Rename ${list.name}`}>
                    <Pencil className="h-4 w-4" />
                  </button>
                  {!list.isDefault ? (
                    <button type="button" onClick={() => setConfirmDelete(list.id)} className="rounded-md p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${list.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              ) : null}
            </header>

            {confirmDelete === list.id ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-red-100 bg-red-50 px-3 py-2 text-sm text-red-800">
                <span className="flex-1">Delete “{list.name}”? Its {rows.length} task(s) move to the default list.</span>
                <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(null)} disabled={busy}>Keep</Button>
                <Button type="button" size="sm" onClick={() => removeList(list)} disabled={busy} className="!bg-red-600 hover:!bg-red-700">Delete list</Button>
              </div>
            ) : null}

            {!isCollapsed ? (
              <ul className="divide-y divide-gray-100">
                {rows.length === 0 ? (
                  <li className="px-4 py-4 text-center text-xs text-gray-500">No tasks in this list</li>
                ) : (
                  rows.map((task) => (
                    <li key={task.id} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-3">
                      <Link href={`/tasks/${task.id}`} className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-900 hover:text-orange-700">{task.name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {[task.assigneeName, task.formattedDueDate && `Due ${task.formattedDueDate}`, task.subtasks?.length ? `${task.subtasks.length} subtask(s)` : null]
                            .filter(Boolean)
                            .join(' · ') || 'Unassigned'}
                        </span>
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${STATUS_TONE[task.strapiStatus] || 'bg-gray-50 text-gray-700 ring-gray-200'}`}>
                          {task.status}
                        </span>
                        {canEdit && lists.length > 1 ? (
                          <label className="relative flex items-center">
                            <FolderInput className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-gray-400" />
                            <select
                              value={list.id}
                              disabled={busy}
                              onChange={(e) => moveTask(task, Number(e.target.value))}
                              className="max-w-[11rem] rounded-lg border border-gray-200 bg-white py-1 pl-7 pr-2 text-xs text-gray-700 hover:border-gray-300 focus:border-orange-400 focus:outline-none"
                              aria-label={`Move ${task.name} to list`}
                            >
                              {lists.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.id === list.id ? `In: ${l.name}` : `Move to ${l.name}`}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </div>
                    </li>
                  ))
                )}
                {canEdit ? (
                  <li className="px-3 py-2">
                    {newTask.listId === list.id ? (
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault()
                          addTask()
                        }}
                      >
                        <input
                          className={inputClass}
                          value={newTask.name}
                          onChange={(e) => setNewTask((n) => ({ ...n, name: e.target.value }))}
                          placeholder="Task name"
                          autoFocus
                          aria-label="New task name"
                        />
                        <Button type="submit" size="sm" disabled={busy || !newTask.name.trim()}>Add</Button>
                        <button type="button" onClick={() => setNewTask({ listId: null, name: '' })} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100" aria-label="Cancel">
                          <X className="h-4 w-4" />
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNewTask({ listId: list.id, name: '' })}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-700 hover:text-orange-800"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add task
                      </button>
                    )}
                  </li>
                ) : null}
              </ul>
            ) : null}
          </section>
        )
      })}

      {canEdit ? (
        addingList ? (
          <form
            className="flex flex-col gap-2 rounded-xl border border-dashed border-gray-300 bg-white p-3 sm:flex-row sm:items-center"
            onSubmit={(e) => {
              e.preventDefault()
              createList()
            }}
          >
            <input
              className={inputClass}
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="List name, e.g. Design, Build, QA"
              maxLength={120}
              autoFocus
              aria-label="New list name"
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAddingList(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy || !newListName.trim()}>Create list</Button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAddingList(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-600 hover:border-orange-300 hover:bg-orange-50/50 hover:text-orange-700"
          >
            <Plus className="h-4 w-4" />
            Add list
          </button>
        )
      ) : null}
    </div>
  )
}
