'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import {
  KPICard,
  Card,
  Table,
  TableResultsCount,
  TableEmptyBelow,
  TabsWithActions,
  Modal,
  Button,
  Badge,
  Avatar,
  Input,
  Textarea,
  Select,
  LoadingSpinner,
  TableSkeleton,
} from '@webfudge/ui'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Trash2,
  Edit3,
  AlertCircle,
  Calendar,
  ChevronRight,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react'
import PMPageHeader from '../../components/PMPageHeader'
import taskService from '../../lib/api/taskService'
import projectService from '../../lib/api/projectService'
import strapiClient from '../../lib/strapiClient'
import {
  transformTask,
  formatDate,
} from '../../lib/api/dataTransformers'

const STATUS_TABS = [
  { id: 'all', label: 'All Tasks' },
  { id: 'SCHEDULED', label: 'To Do' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'INTERNAL_REVIEW', label: 'In Review' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'OVERDUE', label: 'Overdue' },
]

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'To Do' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'INTERNAL_REVIEW', label: 'In Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

function getStatusBadge(s) {
  const map = {
    SCHEDULED: { variant: 'primary', label: 'To Do' },
    IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
    INTERNAL_REVIEW: { variant: 'purple', label: 'In Review' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
  }
  return map[s] || { variant: 'default', label: s || '—' }
}

function getPriorityBadge(p) {
  const map = {
    high: { variant: 'danger', label: 'High' },
    medium: { variant: 'warning', label: 'Medium' },
    low: { variant: 'success', label: 'Low' },
  }
  return map[(p || '').toLowerCase()] || { variant: 'default', label: p || '—' }
}

export default function MyTasksPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projects, setProjects] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [activeTab, setActiveTab] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTasks, setExpandedTasks] = useState(new Set())
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState({ priority: '', project: '' })
  const [bulkEditMode, setBulkEditMode] = useState(false)

  // Modals
  const [taskModal, setTaskModal] = useState({ open: false, task: null })
  const [deleteModal, setDeleteModal] = useState({ open: false, task: null })
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false)
  const [confetti, setConfetti] = useState(null)

  const [taskForm, setTaskForm] = useState({
    name: '', description: '', status: 'SCHEDULED', priority: 'medium',
    dueDate: '', projectId: '', assigneeId: '',
  })

  const getDefaultStatusForAdd = () => {
    // Create new task should default to the selected tab.
    // "All Tasks" and "Overdue" map to "SCHEDULED" because those are UI-derived groups.
    if (activeTab === 'all' || activeTab === 'OVERDUE') return 'SCHEDULED'
    return activeTab
  }

  const isTaskOverdue = (t) => {
    if (!t?.dueDate) return false
    if (!t?.strapiStatus) return false
    const due = new Date(t.dueDate)
    if (Number.isNaN(due.getTime())) return false
    return due < new Date() && t.strapiStatus !== 'COMPLETED' && t.strapiStatus !== 'CANCELLED'
  }

  const getUserId = useCallback(() => {
    if (!user) return null
    const u = user.attributes || user
    return u.id || user.id || null
  }, [user])

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true)
      const userId = getUserId()
      const params = { pageSize: 200, sort: 'updatedAt:desc' }
      if (activeTab !== 'all' && activeTab !== 'OVERDUE') params.status = activeTab
      if (filters.priority) params.priority = filters.priority
      if (filters.project) params.project = filters.project

      let res
      if (userId) {
        res = await taskService.getPMTasksByAssignee(userId, params)
      } else {
        res = await taskService.getAllTasks(params)
      }

      let rawTasks = (res?.data || []).map(transformTask).filter(Boolean)

      if (activeTab === 'OVERDUE') {
        rawTasks = rawTasks.filter(isTaskOverdue)
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        rawTasks = rawTasks.filter(
          (t) =>
            t.name?.toLowerCase().includes(q) ||
            t.project?.toLowerCase().includes(q) ||
            t.assigneeName?.toLowerCase().includes(q)
        )
      }

      setTasks(rawTasks)
    } catch (err) {
      console.error('Load tasks error:', err)
    } finally {
      setLoading(false)
    }
  }, [getUserId, activeTab, filters, searchQuery])

  const handleExport = () => {
    const rows = tasks.map((t) => [
      t.name,
      t.strapiStatus,
      t.priority,
      t.dueDate,
      t.project,
    ])
    const csv = [
      ['Task', 'Status', 'Priority', 'Due Date', 'Project'],
      ...rows,
    ]
      .map((r) => r.map((cell) => (cell == null ? '' : String(cell).replaceAll(',', ' '))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'tasks.csv'
    a.click()
  }

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectService.getAllProjects({ pageSize: 100 })
      setProjects((res?.data || []).map((p) => {
        const attrs = p.attributes || p
        return { id: p.id, name: attrs.name || `Project ${p.id}` }
      }))
    } catch {}
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const res = await strapiClient.getXtrawrkxUsers({ pageSize: 200 })
      setAllUsers(Array.isArray(res) ? res : res?.data || [])
    } catch {}
  }, [])

  useEffect(() => { loadTasks() }, [loadTasks])
  useEffect(() => { loadProjects(); loadUsers() }, [loadProjects, loadUsers])

  const handleCreateOrUpdateTask = async () => {
    if (!taskForm.name.trim()) return
    try {
      setSaving(true)
      const payload = {
        name: taskForm.name.trim(),
        description: taskForm.description.trim() || null,
        status: taskForm.status,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate || null,
      }
      if (taskForm.projectId) payload.project = Number(taskForm.projectId)
      if (taskForm.assigneeId) payload.assignee = Number(taskForm.assigneeId)

      if (taskModal.task) {
        await taskService.updateTask(taskModal.task.id, payload)
      } else {
        await taskService.createTask(payload)
      }

      setTaskModal({ open: false, task: null })
      setTaskForm({ name: '', description: '', status: 'SCHEDULED', priority: 'medium', dueDate: '', projectId: '', assigneeId: '' })
      loadTasks()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!deleteModal.task) return
    try {
      setSaving(true)
      await taskService.deleteTask(deleteModal.task.id)
      setDeleteModal({ open: false, task: null })
      loadTasks()
    } catch {}
    finally { setSaving(false) }
  }

  const handleBulkDelete = async () => {
    try {
      setSaving(true)
      await Promise.all([...selectedTasks].map((id) => taskService.deleteTask(id)))
      setSelectedTasks(new Set())
      setBulkDeleteModal(false)
      loadTasks()
    } catch {}
    finally { setSaving(false) }
  }

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTask(taskId, { status: newStatus })
      if (newStatus === 'COMPLETED') {
        try {
          const confettiModule = await import('canvas-confetti')
          confettiModule.default({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
        } catch {}
      }
      loadTasks()
    } catch {}
  }

  const openEditModal = (task) => {
    setTaskForm({
      name: task.name || '',
      description: task.description || '',
      status: task.strapiStatus || 'SCHEDULED',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      projectId: task.projectId ? String(task.projectId) : '',
      assigneeId: task.assigneeId ? String(task.assigneeId) : '',
    })
    setTaskModal({ open: true, task })
  }

  const toggleSelect = (id) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set())
    } else {
      setSelectedTasks(new Set(tasks.map((t) => t.id)))
    }
  }

  const toggleBulkEditMode = () => {
    setBulkEditMode((prev) => {
      if (prev) setSelectedTasks(new Set())
      return !prev
    })
  }

  const toggleExpand = (id) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const tabsWithBadges = STATUS_TABS.map((tab) => ({
    ...tab,
    badge:
      tab.id === 'all'
        ? tasks.length
        : tab.id === 'OVERDUE'
          ? tasks.filter((t) => isTaskOverdue(t)).length
          : tasks.filter((t) => t.strapiStatus === tab.id).length,
  }))

  const stats = [
    {
      title: 'All Tasks',
      value: String(tasks.length),
      icon: CheckSquare,
      colorScheme: 'blue',
    },
    {
      title: 'In Progress',
      value: String(tasks.filter((t) => t.strapiStatus === 'IN_PROGRESS').length),
      icon: Clock,
      colorScheme: 'yellow',
    },
    {
      title: 'Completed',
      value: String(tasks.filter((t) => t.strapiStatus === 'COMPLETED').length),
      icon: CheckCircle2,
      colorScheme: 'green',
    },
    {
      title: 'Overdue',
      value: String(
        tasks.filter(
          (t) =>
            t.dueDate &&
            new Date(t.dueDate) < new Date() &&
            t.strapiStatus !== 'COMPLETED'
        ).length
      ),
      icon: AlertTriangle,
      colorScheme: 'red',
    },
  ]

  // Table columns (row selection via Bulk edit + row click — no checkbox column)
  const columns = [
    {
      key: 'name',
      title: 'Task',
      render: (value, row) => (
        <div className="flex items-center gap-2">
          {row.subtasks?.length > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(row.id) }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expandedTasks.has(row.id)
                ? <ChevronDown className="w-4 h-4" />
                : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <div>
            <p className="font-medium text-gray-900 text-sm">{value}</p>
            {row.project && (
              <p className="text-xs text-gray-500">{row.project}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) => {
        const s = getStatusBadge(row.strapiStatus)
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <select
              value={row.strapiStatus || ''}
              onChange={(e) => handleStatusChange(row.id, e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white cursor-pointer"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        )
      },
    },
    {
      key: 'priority',
      title: 'Priority',
      render: (value) => {
        const p = getPriorityBadge(value)
        return <Badge variant={p.variant}>{p.label}</Badge>
      },
    },
    {
      key: 'assignee',
      title: 'Assignee',
      render: (_, row) => {
        const name = row.assigneeName || 'Unassigned'
        if (!row.assigneeName) return <span className="text-xs text-gray-400">Unassigned</span>
        return (
          <div className="flex items-center gap-2">
            <Avatar fallback={name.charAt(0).toUpperCase()} size="sm" />
            <span className="text-sm text-gray-700 truncate max-w-[100px]">{name}</span>
          </div>
        )
      },
    },
    {
      key: 'dueDate',
      title: 'Due',
      render: (value, row) => {
        const isOverdue =
          value &&
          new Date(value) < new Date() &&
          row.strapiStatus !== 'COMPLETED'
        return (
          <span className={`text-xs flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
            <Calendar className="w-3 h-3" />
            {formatDate(value, 'short') || '—'}
          </span>
        )
      },
    },
    {
      key: 'actions',
      title: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEditModal(row)}>
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteModal({ open: true, task: row })}
            className="text-red-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }))
  const userOptions = allUsers.map((u) => ({
    value: String(u.id),
    label: u.name || u.username || u.email || `User ${u.id}`,
  }))

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="My Tasks"
        subtitle="Track and manage all your assigned tasks"
        showProfile
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'My Tasks', href: '/my-tasks' },
        ]}
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <KPICard key={s.title} title={s.title} value={s.value} icon={s.icon} colorScheme={s.colorScheme} />
        ))}
      </div>

      {/* Tabs + Search + Filter */}
      <TabsWithActions
        tabs={tabsWithBadges}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id)}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search tasks..."
        showAdd
        onAddClick={(e) => {
          e?.preventDefault?.()
          const defaultStatus = getDefaultStatusForAdd()
          router.push(`/my-tasks/add?status=${encodeURIComponent(defaultStatus)}`)
        }}
        addTitle="New Task"
        showFilter
        onFilterClick={() => setFilterOpen(true)}
        filterTitle="Filter"
        showExport
        onExportClick={handleExport}
        exportTitle="Export CSV"
        showBulkEdit
        bulkEditActive={bulkEditMode}
        onBulkEditClick={toggleBulkEditMode}
        bulkEditTitle={bulkEditMode ? 'Done' : 'Bulk edit'}
        variant="glass"
      />

      {/* Bulk edit: select-all (replaces header checkbox) + row-click selection */}
      {bulkEditMode && tasks.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 bg-amber-50/90 border border-amber-200 rounded-xl">
          <p className="text-sm text-gray-700 flex-1 min-w-[200px]">
            <span className="font-semibold text-gray-900">Bulk edit on</span>
            {' — '}
            click rows to select or deselect.
          </p>
          <Button variant="outline" size="sm" onClick={toggleSelectAll}>
            {selectedTasks.size === tasks.length && tasks.length > 0 ? 'Deselect all' : 'Select all'}
          </Button>
        </div>
      )}
      {selectedTasks.size > 0 && (
        <div className="flex items-center gap-3 flex-wrap px-4 py-2 bg-orange-50 border border-orange-200 rounded-xl">
          <span className="text-sm font-medium text-orange-700">
            {selectedTasks.size} task{selectedTasks.size > 1 ? 's' : ''} selected
          </span>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setBulkDeleteModal(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete Selected
          </Button>
          <button
            type="button"
            onClick={() => setSelectedTasks(new Set())}
            className="ml-auto text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Clear
          </button>
        </div>
      )}

      {/* Task Table */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-12 flex justify-center">
            <TableSkeleton rows={5} columns={5} />
          </div>
        </div>
      ) : (
        <>
          <TableResultsCount count={tasks.length} />
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {tasks.length === 0 ? (
              <TableEmptyBelow
                icon={CheckSquare}
                title={
                  activeTab !== 'all' || searchQuery || filters.priority || filters.project
                    ? 'No tasks found for the selected status'
                    : 'No tasks found'
                }
                action={
                  <Button
                    variant="primary"
                    rounded="pill"
                    type="button"
                    onClick={(e) => {
                      e?.preventDefault?.()
                      const defaultStatus = getDefaultStatusForAdd()
                      router.push(`/my-tasks/add?status=${encodeURIComponent(defaultStatus)}`)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" /> Add Task
                  </Button>
                }
              />
            ) : (
              <Table
                columns={columns}
                data={tasks}
                keyField="id"
                variant="modernEmbedded"
                onRowClick={
                  bulkEditMode
                    ? (row) => {
                        toggleSelect(row.id)
                      }
                    : undefined
                }
                getRowClassName={(row) =>
                  bulkEditMode && selectedTasks.has(row.id)
                    ? 'bg-orange-50/90 ring-1 ring-inset ring-orange-200'
                    : undefined
                }
              />
            )}
          </div>
        </>
      )}

      {/* Create / Edit Task Modal */}
      <Modal
        isOpen={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null })}
        title={taskModal.task ? 'Edit Task' : 'New Task'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Task Name"
            required
            value={taskForm.name}
            onChange={(e) => setTaskForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="What needs to be done?"
          />
          <Textarea
            label="Description"
            value={taskForm.description}
            onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Add more details (optional)"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={taskForm.status}
              options={STATUS_OPTIONS}
              onChange={(val) => setTaskForm((p) => ({ ...p, status: val }))}
            />
            <Select
              label="Priority"
              value={taskForm.priority}
              options={PRIORITY_OPTIONS}
              onChange={(val) => setTaskForm((p) => ({ ...p, priority: val }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
            <Select
              label="Project"
              value={taskForm.projectId}
              options={[{ value: '', label: 'No project' }, ...projectOptions]}
              onChange={(val) => setTaskForm((p) => ({ ...p, projectId: val }))}
              placeholder="Select project"
            />
          </div>
          <Select
            label="Assignee"
            value={taskForm.assigneeId}
            options={[{ value: '', label: 'Unassigned' }, ...userOptions]}
            onChange={(val) => setTaskForm((p) => ({ ...p, assigneeId: val }))}
            placeholder="Assign to..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setTaskModal({ open: false, task: null })}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateOrUpdateTask}
              disabled={saving || !taskForm.name.trim()}
            >
              {saving ? 'Saving...' : taskModal.task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Task Modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, task: null })}
        title="Delete Task"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Are you sure you want to delete <strong>{deleteModal.task?.name}</strong>?
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteModal({ open: false, task: null })}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteTask} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={bulkDeleteModal}
        onClose={() => setBulkDeleteModal(false)}
        title="Delete Selected Tasks"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              You are about to delete <strong>{selectedTasks.size}</strong> task{selectedTasks.size > 1 ? 's' : ''}. This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setBulkDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleBulkDelete} disabled={saving}>
              {saving ? 'Deleting...' : `Delete ${selectedTasks.size} Tasks`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Filter Drawer */}
      <Modal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Tasks"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Priority"
            value={filters.priority}
            options={[{ value: '', label: 'All Priorities' }, ...PRIORITY_OPTIONS]}
            onChange={(val) => setFilters((p) => ({ ...p, priority: val }))}
            placeholder="All Priorities"
          />
          <Select
            label="Project"
            value={filters.project}
            options={[{ value: '', label: 'All Projects' }, ...projectOptions]}
            onChange={(val) => setFilters((p) => ({ ...p, project: val }))}
            placeholder="All Projects"
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => { setFilters({ priority: '', project: '' }); setFilterOpen(false) }}
            >
              Clear
            </Button>
            <Button variant="primary" onClick={() => setFilterOpen(false)}>
              Apply Filters
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
