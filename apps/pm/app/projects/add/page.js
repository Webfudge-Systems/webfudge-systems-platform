'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import {
  Card,
  Button,
  Input,
  Textarea,
  Select,
  LoadingSpinner,
} from '@webfudge/ui'
import {
  ArrowLeft,
  FolderPlus,
} from 'lucide-react'
import PMPageHeader from '../../../components/PMPageHeader'
import projectService from '../../../lib/api/projectService'
import strapiClient from '../../../lib/strapiClient'

const STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'INTERNAL_REVIEW', label: 'Internal Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function AddProjectPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [allUsers, setAllUsers] = useState([])
  const [clients, setClients] = useState([])
  const [errors, setErrors] = useState({})

  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'SCHEDULED',
    startDate: '',
    endDate: '',
    clientId: '',
    projectManagerId: '',
    teamMemberIds: [],
  })

  const loadData = useCallback(async () => {
    try {
      const [usersRes, clientsRes] = await Promise.allSettled([
        strapiClient.getXtrawrkxUsers({ pageSize: 200 }),
        strapiClient.request('GET', '/api/lead-companies?pagination[pageSize]=100'),
      ])
      if (usersRes.status === 'fulfilled') {
        const u = usersRes.value
        setAllUsers(Array.isArray(u) ? u : u?.data || [])
      }
      if (clientsRes.status === 'fulfilled') {
        setClients(clientsRes.value?.data || [])
      }
    } catch {}
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Project name is required'
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      errs.endDate = 'End date must be after start date'
    }
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
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      }
      if (form.clientId) payload.client = Number(form.clientId)
      if (form.projectManagerId) payload.projectManager = Number(form.projectManagerId)
      if (form.teamMemberIds.length) payload.team = form.teamMemberIds.map(Number)

      const result = await projectService.createProject(payload)
      const newId = result?.data?.id || result?.id
      if (newId) {
        router.push(`/projects/${newId}`)
      } else {
        router.push('/projects')
      }
    } catch (err) {
      console.error('Create project error:', err)
      setErrors({ submit: 'Failed to create project. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const handleTeamToggle = (userId) => {
    setForm((prev) => {
      const ids = prev.teamMemberIds.includes(userId)
        ? prev.teamMemberIds.filter((id) => id !== userId)
        : [...prev.teamMemberIds, userId]
      return { ...prev, teamMemberIds: ids }
    })
  }

  const userOptions = allUsers.map((u) => ({
    value: String(u.id),
    label: u.name || u.username || u.email || `User ${u.id}`,
  }))

  const clientOptions = clients.map((c) => {
    const attrs = c.attributes || c
    return {
      value: String(c.id),
      label: attrs.name || attrs.companyName || `Client ${c.id}`,
    }
  })

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Create New Project"
        subtitle="Fill in the details below to create a project"
        showProfile
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: 'New Project' },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Basic Info */}
        <Card title="Basic Information" variant="default">
          <div className="space-y-4">
            <Input
              label="Project Name"
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              error={errors.name}
              placeholder="Enter project name"
            />
            <Textarea
              label="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4}
              placeholder="Describe the project objectives and scope..."
            />
            <Select
              label="Status"
              value={form.status}
              options={STATUS_OPTIONS}
              onChange={(val) => setForm((p) => ({ ...p, status: val }))}
            />
          </div>
        </Card>

        {/* Timeline */}
        <Card title="Timeline" variant="default">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
            <Input
              label="End Date / Deadline"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              error={errors.endDate}
            />
          </div>
        </Card>

        {/* Assignment */}
        <Card title="Assignment" variant="default">
          <div className="space-y-4">
            {clientOptions.length > 0 && (
              <Select
                label="Client"
                value={form.clientId}
                options={[{ value: '', label: 'No client' }, ...clientOptions]}
                onChange={(val) => setForm((p) => ({ ...p, clientId: val }))}
                placeholder="Select a client (optional)"
              />
            )}
            <Select
              label="Project Manager"
              value={form.projectManagerId}
              options={[{ value: '', label: 'Not assigned' }, ...userOptions]}
              onChange={(val) => setForm((p) => ({ ...p, projectManagerId: val }))}
              placeholder="Assign a project manager"
            />
          </div>
        </Card>

        {/* Team Members */}
        {allUsers.length > 0 && (
          <Card
            title={`Team Members (${form.teamMemberIds.length} selected)`}
            variant="default"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {allUsers.map((u) => {
                const id = String(u.id)
                const checked = form.teamMemberIds.includes(id)
                return (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${
                      checked
                        ? 'bg-orange-50 border-orange-200'
                        : 'bg-white border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleTeamToggle(id)}
                      className="w-4 h-4 accent-orange-500"
                    />
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-sm flex-shrink-0">
                        {(u.name || u.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {u.name || u.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{u.email || ''}</p>
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </Card>
        )}

        {/* Submit */}
        <div className="flex items-center gap-4">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <>
                <LoadingSpinner size="sm" />
                <span className="ml-2">Creating...</span>
              </>
            ) : (
              <>
                <FolderPlus className="w-4 h-4 mr-2" />
                Create Project
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/projects')}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
