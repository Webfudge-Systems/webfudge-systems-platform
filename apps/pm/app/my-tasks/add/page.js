'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  LoadingSpinner,
} from '@webfudge/ui'
import { ArrowLeft, CalendarDays, Plus, CheckSquare, Target } from 'lucide-react'
import { useAuth } from '@webfudge/auth'
import PMPageHeader from '../../../components/PMPageHeader'
import projectService from '../../../lib/api/projectService'
import taskService from '../../../lib/api/taskService'
import strapiClient from '../../../lib/strapiClient'
import { transformProject } from '../../../lib/api/dataTransformers'

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

export default function AddTaskPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // Ensures auth is loaded; used only for consistent behavior with other PM pages.
  useAuth()

  const statusParam = searchParams?.get?.('status') || ''

  const allowedStatus = useMemo(() => new Set(STATUS_OPTIONS.map((s) => s.value)), [])

  const initialStatus = useMemo(() => {
    // Keep it simple: map unknown values to To Do / SCHEDULED.
    if (!statusParam) return 'SCHEDULED'
    if (statusParam === 'all' || statusParam === 'OVERDUE') return 'SCHEDULED'
    return allowedStatus.has(statusParam) ? statusParam : 'SCHEDULED'
  }, [allowedStatus, statusParam])

  const [loading, setLoading] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [projects, setProjects] = useState([])
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'SCHEDULED',
    priority: 'medium',
    dueDate: '',
    projectId: '',
    assigneeId: '',
  })

  useEffect(() => {
    setForm((p) => ({ ...p, status: initialStatus }))
  }, [initialStatus])

  const loadData = useCallback(async () => {
    try {
      const [projectsRes, usersRes] = await Promise.allSettled([
        projectService.getAllProjects({ pageSize: 100 }),
        strapiClient.getXtrawrkxUsers({ pageSize: 200 }),
      ])

      if (projectsRes.status === 'fulfilled') {
        const raw = projectsRes.value?.data || []
        setProjects(raw.map(transformProject).filter(Boolean))
      }

      if (usersRes.status === 'fulfilled') {
        const rawUsers = Array.isArray(usersRes.value)
          ? usersRes.value
          : usersRes.value?.data || usersRes.value?.users || []
        setAllUsers(rawUsers)
      }
    } catch {
      // silent
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const projectOptions = projects.map((p) => ({ value: String(p.id), label: p.name }))
  const userOptions = allUsers.map((u) => ({
    value: String(u.id),
    label: u.name || u.username || u.email || `User ${u.id}`,
  }))

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Task name is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    try {
      setLoading(true)
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        priority: form.priority,
        // Keep the same field name the existing modal uses.
        dueDate: form.dueDate || null,
      }

      if (form.projectId) payload.project = Number(form.projectId)
      if (form.assigneeId) payload.assignee = Number(form.assigneeId)

      await taskService.createTask(payload)
      router.push('/my-tasks')
    } catch (err) {
      console.error('Create task error:', err)
      setErrors({ submit: 'Failed to create task. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Add New Task"
        subtitle="Create a new task and assign team members"
        showProfile
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'My Tasks', href: '/my-tasks' },
          { label: 'Add New' },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Task Information */}
        <Card
          title={
            <span className="inline-flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center flex-shrink-0">
                <CheckSquare className="w-4 h-4 text-white" />
              </span>
              <span>Task Information</span>
            </span>
          }
          subtitle="Basic information about the task"
          variant="default"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Input
                label="Task Name"
                required
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                error={errors.name}
                placeholder="Enter task name"
              />
              <Select
                label="Status"
                value={form.status}
                options={STATUS_OPTIONS}
                onChange={(val) => setForm((p) => ({ ...p, status: val }))}
              />
            </div>
            <Textarea
              label="Task Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Describe the task goals and requirements..."
            />
          </div>
        </Card>

        {/* Task Timeline */}
        <Card
          title={
            <span className="inline-flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <CalendarDays className="w-4 h-4 text-white" />
              </span>
              <span>Task Timeline</span>
            </span>
          }
          subtitle="Set the due date for the task"
          variant="default"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
          </div>
        </Card>

        {/* Assignment */}
        <Card
          title={
            <span className="inline-flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Target className="w-4 h-4 text-white" />
              </span>
              <span>Assignment</span>
            </span>
          }
          subtitle="Set priority and assign a project + assignee"
          variant="default"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Priority"
                value={form.priority}
                options={PRIORITY_OPTIONS}
                onChange={(val) => setForm((p) => ({ ...p, priority: val }))}
              />
              <Select
                label="Project"
                value={form.projectId}
                options={[{ value: '', label: 'No project' }, ...projectOptions]}
                onChange={(val) => setForm((p) => ({ ...p, projectId: val }))}
                placeholder="Select a project"
              />
            </div>

            <Select
              label="Assignee"
              value={form.assigneeId}
              options={[{ value: '', label: 'Unassigned' }, ...userOptions]}
              onChange={(val) => setForm((p) => ({ ...p, assigneeId: val }))}
              placeholder="Assign to..."
            />
          </div>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            rounded="default"
            className="!border-gray-300 !text-gray-700 hover:!bg-gray-50 px-5"
            onClick={() => router.push('/my-tasks')}
            disabled={loading}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Cancel
          </Button>

          <Button
            type="submit"
            variant="primary"
            rounded="pill"
            className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-lg px-6"
            disabled={loading}
          >
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Creating...</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Create Task
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

