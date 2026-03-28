'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import {
  Card,
  Table,
  EmptyState,
  TableResultsCount,
  TableEmptyBelow,
  Modal,
  Button,
  Badge,
  Avatar,
  LoadingSpinner,
  TableSkeleton,
  Input,
  Textarea,
  Select,
} from '@webfudge/ui'
import {
  FolderOpen,
  CheckSquare,
  Users,
  MessageSquare,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Send,
  AlertCircle,
  Calendar,
  Target,
  UserPlus,
} from 'lucide-react'
import PMPageHeader from '../../../components/PMPageHeader'
import projectService from '../../../lib/api/projectService'
import taskService from '../../../lib/api/taskService'
import strapiClient from '../../../lib/strapiClient'
import {
  transformProject,
  transformTask,
  formatDate,
} from '../../../lib/api/dataTransformers'

const PROJECT_STATUS_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'INTERNAL_REVIEW', label: 'Internal Review' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const TASK_STATUS_OPTIONS = [
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

function getStatusBadge(strapiStatus) {
  const map = {
    SCHEDULED: { variant: 'primary', label: 'To Do' },
    IN_PROGRESS: { variant: 'warning', label: 'In Progress' },
    INTERNAL_REVIEW: { variant: 'purple', label: 'In Review' },
    COMPLETED: { variant: 'success', label: 'Completed' },
    CANCELLED: { variant: 'danger', label: 'Cancelled' },
  }
  return map[strapiStatus] || { variant: 'default', label: strapiStatus || '—' }
}

function getPriorityBadge(priority) {
  const map = {
    high: { variant: 'danger', label: 'High' },
    medium: { variant: 'warning', label: 'Medium' },
    low: { variant: 'success', label: 'Low' },
  }
  return map[(priority || '').toLowerCase()] || { variant: 'default', label: priority || '—' }
}

export default function ProjectDetailPage() {
  const { slug } = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const messagesEndRef = useRef(null)

  const [activeTab, setActiveTab] = useState('overview')
  const [project, setProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [messages, setMessages] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  // Modals
  const [taskModal, setTaskModal] = useState({ open: false, task: null })
  const [memberModal, setMemberModal] = useState(false)
  const [deleteTaskModal, setDeleteTaskModal] = useState({ open: false, task: null })

  // Forms
  const [taskForm, setTaskForm] = useState({
    name: '', description: '', status: 'SCHEDULED', priority: 'medium',
    dueDate: '', assignee: '',
  })
  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState('')

  const loadProject = useCallback(async () => {
    try {
      setLoading(true)
      let projectData = null
      const projectsRes = await projectService.getAllProjects({ pageSize: 100 })
      const allProjects = (projectsRes?.data || []).map(transformProject).filter(Boolean)
      projectData = allProjects.find((p) => p.slug === slug || String(p.id) === String(slug))
      if (!projectData && allProjects.length > 0) projectData = allProjects[0]
      setProject(projectData)
    } catch (err) {
      console.error('Load project error:', err)
    } finally {
      setLoading(false)
    }
  }, [slug])

  const loadTasks = useCallback(async () => {
    if (!project) return
    try {
      setLoadingTasks(true)
      const res = await taskService.getAllTasks({ pageSize: 100, project: project.id })
      setTasks((res?.data || []).map(transformTask).filter(Boolean))
    } catch {}
    finally { setLoadingTasks(false) }
  }, [project])

  const loadMessages = useCallback(async () => {
    if (!project) return
    try {
      const client = strapiClient
      const res = await client.request('GET', `/api/messages?filters[project][id][$eq]=${project.id}&populate[sender]=true&sort=createdAt:asc&pagination[pageSize]=100`)
      setMessages(res?.data || [])
    } catch {}
  }, [project])

  const loadAllUsers = useCallback(async () => {
    try {
      const res = await strapiClient.getXtrawrkxUsers({ pageSize: 200 })
      setAllUsers(Array.isArray(res) ? res : res?.data || [])
    } catch {}
  }, [])

  useEffect(() => { loadProject() }, [loadProject])
  useEffect(() => { if (project) { loadTasks(); loadMessages(); loadAllUsers() } }, [project, loadTasks, loadMessages, loadAllUsers])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleStatusChange = async (newStatus) => {
    if (!project) return
    try {
      setSaving(true)
      await projectService.updateProject(project.id, { status: newStatus })
      setProject((prev) => ({ ...prev, strapiStatus: newStatus }))
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleAddTask = async () => {
    if (!taskForm.name.trim() || !project) return
    try {
      setSaving(true)
      const payload = {
        name: taskForm.name,
        description: taskForm.description,
        status: taskForm.status,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate || null,
        project: project.id,
      }
      if (taskForm.assignee) payload.assignee = taskForm.assignee
      if (taskModal.task) {
        await taskService.updateTask(taskModal.task.id, payload)
      } else {
        await taskService.createTask(payload)
      }
      setTaskModal({ open: false, task: null })
      setTaskForm({ name: '', description: '', status: 'SCHEDULED', priority: 'medium', dueDate: '', assignee: '' })
      loadTasks()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTask = async () => {
    if (!deleteTaskModal.task) return
    try {
      setSaving(true)
      await taskService.deleteTask(deleteTaskModal.task.id)
      setDeleteTaskModal({ open: false, task: null })
      loadTasks()
    } catch {}
    finally { setSaving(false) }
  }

  const handleAddMember = async () => {
    if (!selectedMemberToAdd || !project) return
    try {
      setSaving(true)
      const existingTeam = (project.team || []).map((m) => m.id)
      if (existingTeam.includes(Number(selectedMemberToAdd))) { setMemberModal(false); return }
      await projectService.addTeamMember(project.id, Number(selectedMemberToAdd))
      setMemberModal(false)
      setSelectedMemberToAdd('')
      loadProject()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveMember = async (memberId) => {
    if (!project) return
    try {
      await projectService.removeTeamMember(project.id, memberId)
      loadProject()
    } catch {}
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !project || !user) return
    try {
      setSendingMessage(true)
      const userId = user.id || user.attributes?.id
      await strapiClient.request('POST', '/api/messages', {
        data: { content: newMessage.trim(), project: project.id, sender: userId },
      })
      setNewMessage('')
      loadMessages()
    } catch {}
    finally { setSendingMessage(false) }
  }

  const openEditTaskModal = (task) => {
    setTaskForm({
      name: task.name || '',
      description: task.description || '',
      status: task.strapiStatus || 'SCHEDULED',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      assignee: task.assigneeId ? String(task.assigneeId) : '',
    })
    setTaskModal({ open: true, task })
  }

  const taskColumns = [
    {
      key: 'name',
      title: 'Task',
      render: (value, row) => (
        <div>
          <p className="text-sm font-medium text-gray-900">{value}</p>
          {row.description && (
            <p className="text-xs text-gray-500 truncate max-w-xs">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) => {
        const s = getStatusBadge(row.strapiStatus)
        return <Badge variant={s.variant}>{s.label}</Badge>
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
      key: 'dueDate',
      title: 'Due Date',
      render: (value) => (
        <span className="text-sm text-gray-600 flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {formatDate(value, 'short') || '—'}
        </span>
      ),
    },
    {
      key: 'assignee',
      title: 'Assignee',
      render: (value, row) => {
        if (!row.assigneeName && !value) return <span className="text-xs text-gray-400">Unassigned</span>
        const name = row.assigneeName || value || 'Unassigned'
        return (
          <div className="flex items-center gap-2">
            <Avatar fallback={name.charAt(0).toUpperCase()} size="sm" />
            <span className="text-sm text-gray-700">{name}</span>
          </div>
        )
      },
    },
    {
      key: 'actions',
      title: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditTaskModal(row) }}>
            <Edit3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => { e.stopPropagation(); setDeleteTaskModal({ open: true, task: row }) }}
            className="text-red-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const memberColumnsEmpty = [
    { key: 'name', title: 'Member' },
    { key: 'email', title: 'Email' },
    { key: 'role', title: 'Role' },
    { key: 'actions', title: 'Actions' },
  ]

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'tasks', label: 'Tasks', badge: tasks.length },
    { id: 'members', label: 'Members', badge: (project?.team || []).length },
    { id: 'discussion', label: 'Discussion', badge: messages.length },
  ]

  if (loading) {
    return (
      <div className="p-6">
        <PMPageHeader title="Project Detail" showProfile />
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" message="Loading project..." />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-6">
        <PMPageHeader title="Project Not Found" showProfile />
        <EmptyState
          icon={FolderOpen}
          title="Project not found"
          description="The project you're looking for doesn't exist or has been deleted."
          action={<Button variant="primary" onClick={() => router.push('/projects')}>Back to Projects</Button>}
        />
      </div>
    )
  }

  const statusBadge = getStatusBadge(project.strapiStatus)
  const nonMembers = allUsers.filter(
    (u) => !(project.team || []).some((m) => m.id === u.id)
  )

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title={project.name}
        subtitle={project.clientName ? `Client: ${project.clientName}` : 'Project Details'}
        showProfile
        breadcrumbs={[
          { label: 'Projects', href: '/projects' },
          { label: project.name },
        ]}
        actions={
          <Button variant="outline" size="sm" onClick={() => router.push('/projects')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                activeTab === tab.id ? 'bg-orange-100 text-orange-600' : 'bg-gray-200 text-gray-600'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card title="Project Details" variant="default">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 font-medium mb-1">Status</p>
                  <div className="flex items-center gap-3">
                    <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>
                    <select
                      value={project.strapiStatus || ''}
                      onChange={(e) => handleStatusChange(e.target.value)}
                      disabled={saving}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      {PROJECT_STATUS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1">Client</p>
                  <p className="text-gray-900">{project.clientName || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Start Date
                  </p>
                  <p className="text-gray-900">{formatDate(project.startDate) || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500 font-medium mb-1 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5" /> End Date
                  </p>
                  <p className="text-gray-900">{formatDate(project.endDate) || '—'}</p>
                </div>
              </div>
              {project.description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-gray-500 font-medium mb-2 text-sm">Description</p>
                  <p className="text-gray-700 text-sm">{project.description}</p>
                </div>
              )}
            </Card>

            <Card
              title="Quick Task Overview"
              variant="default"
              actions={
                <Button variant="primary" size="sm" onClick={() => {
                  setActiveTab('tasks')
                  setTaskModal({ open: true, task: null })
                  setTaskForm({ name: '', description: '', status: 'SCHEDULED', priority: 'medium', dueDate: '', assignee: '' })
                }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Task
                </Button>
              }
            >
              {loadingTasks ? (
                <TableSkeleton rows={3} columns={3} />
              ) : tasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="No tasks yet"
                  description="Add tasks to track project progress."
                />
              ) : (
                <div className="space-y-2">
                  {tasks.slice(0, 5).map((task) => {
                    const s = getStatusBadge(task.strapiStatus)
                    return (
                      <div key={task.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                        </div>
                        <Badge variant={s.variant} size="sm">{s.label}</Badge>
                      </div>
                    )
                  })}
                  {tasks.length > 5 && (
                    <button onClick={() => setActiveTab('tasks')} className="w-full text-center text-sm text-orange-600 hover:underline py-1">
                      View all {tasks.length} tasks
                    </button>
                  )}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card title="Team Members" variant="default" actions={
              <Button variant="ghost" size="sm" onClick={() => setMemberModal(true)}>
                <UserPlus className="w-4 h-4" />
              </Button>
            }>
              {(project.team || []).length === 0 ? (
                <EmptyState icon={Users} title="No team members" description="Add members to collaborate." />
              ) : (
                <div className="space-y-3">
                  {(project.team || []).map((member) => (
                    <div key={member.id} className="flex items-center gap-3">
                      <Avatar
                        fallback={(member.name || member.username || '?').charAt(0).toUpperCase()}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {member.name || member.username}
                        </p>
                        <p className="text-xs text-gray-500">{member.email || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Tasks Tab */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Tasks ({tasks.length})</h2>
            <Button variant="primary" size="sm" onClick={() => {
              setTaskForm({ name: '', description: '', status: 'SCHEDULED', priority: 'medium', dueDate: '', assignee: '' })
              setTaskModal({ open: true, task: null })
            }}>
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>
          {loadingTasks ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-12 flex justify-center">
                <TableSkeleton rows={5} columns={5} />
              </div>
            </div>
          ) : (
            <>
              <TableResultsCount count={tasks.length} />
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Table columns={taskColumns} data={tasks} keyField="id" variant="modernEmbedded" />
                {tasks.length === 0 && (
                  <TableEmptyBelow
                    icon={CheckSquare}
                    title="No tasks yet"
                    description="Create tasks to track your project progress."
                    action={
                      <Button
                        variant="primary"
                        onClick={() => {
                          setTaskForm({
                            name: '',
                            description: '',
                            status: 'SCHEDULED',
                            priority: 'medium',
                            dueDate: '',
                            assignee: '',
                          })
                          setTaskModal({ open: true, task: null })
                        }}
                      >
                        <Plus className="w-4 h-4 mr-2" /> Add First Task
                      </Button>
                    }
                  />
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Team Members ({(project.team || []).length})
            </h2>
            <Button variant="primary" size="sm" onClick={() => setMemberModal(true)}>
              <UserPlus className="w-4 h-4 mr-1" /> Add Member
            </Button>
          </div>
          {(project.team || []).length === 0 ? (
            <>
              <TableResultsCount count={0} />
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <Table
                  columns={memberColumnsEmpty}
                  data={[]}
                  keyField="id"
                  variant="modernEmbedded"
                />
                <TableEmptyBelow
                  icon={Users}
                  title="No team members"
                  description="Add team members to collaborate on this project."
                  action={
                    <Button variant="primary" onClick={() => setMemberModal(true)}>
                      <UserPlus className="w-4 h-4 mr-2" /> Add Member
                    </Button>
                  }
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(project.team || []).map((member) => (
                <Card key={member.id} padding variant="default">
                  <div className="flex items-center gap-3">
                    <Avatar
                      fallback={(member.name || member.username || '?').charAt(0).toUpperCase()}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {member.name || member.username}
                      </p>
                      <p className="text-sm text-gray-500 truncate">{member.email || '—'}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      className="text-red-400 hover:text-red-600 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Discussion Tab */}
      {activeTab === 'discussion' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Discussion ({messages.length})
          </h2>
          <Card padding={false} variant="default">
            <div className="h-96 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No messages yet"
                  description="Start the conversation with your team."
                />
              ) : (
                messages.map((msg, i) => {
                  const attrs = msg.attributes || msg
                  const senderAttrs = attrs.sender?.data?.attributes || attrs.sender || {}
                  const senderName = senderAttrs.name || senderAttrs.username || 'Unknown'
                  const isCurrentUser =
                    (user?.id || user?.attributes?.id) ===
                    (attrs.sender?.data?.id || attrs.senderId)
                  return (
                    <div
                      key={msg.id || i}
                      className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar fallback={senderName.charAt(0).toUpperCase()} size="sm" />
                      <div className={`max-w-xs ${isCurrentUser ? 'items-end' : 'items-start'} flex flex-col`}>
                        <p className="text-xs text-gray-500 mb-1">{senderName}</p>
                        <div className={`px-3 py-2 rounded-2xl text-sm ${
                          isCurrentUser
                            ? 'bg-orange-500 text-white rounded-tr-none'
                            : 'bg-gray-100 text-gray-800 rounded-tl-none'
                        }`}>
                          {attrs.content}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(attrs.createdAt, 'datetime') || ''}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-gray-100 p-3 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSendMessage}
                disabled={sendingMessage || !newMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Task Create/Edit Modal */}
      <Modal
        isOpen={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null })}
        title={taskModal.task ? 'Edit Task' : 'Add Task'}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Task Name"
            required
            value={taskForm.name}
            onChange={(e) => setTaskForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Enter task name"
          />
          <Textarea
            label="Description"
            value={taskForm.description}
            onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            placeholder="Task description (optional)"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Status"
              value={taskForm.status}
              options={TASK_STATUS_OPTIONS}
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
              label="Assignee"
              value={taskForm.assignee}
              options={[
                { value: '', label: 'Unassigned' },
                ...(project.team || []).map((m) => ({
                  value: String(m.id),
                  label: m.name || m.username || `User ${m.id}`,
                })),
              ]}
              onChange={(val) => setTaskForm((p) => ({ ...p, assignee: val }))}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setTaskModal({ open: false, task: null })}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddTask} disabled={saving || !taskForm.name.trim()}>
              {saving ? 'Saving...' : taskModal.task ? 'Update Task' : 'Create Task'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Task Modal */}
      <Modal
        isOpen={deleteTaskModal.open}
        onClose={() => setDeleteTaskModal({ open: false, task: null })}
        title="Delete Task"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              Are you sure you want to delete <strong>{deleteTaskModal.task?.name}</strong>? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTaskModal({ open: false, task: null })}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteTask} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete Task'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={memberModal}
        onClose={() => { setMemberModal(false); setSelectedMemberToAdd('') }}
        title="Add Team Member"
        size="sm"
      >
        <div className="space-y-4">
          <Select
            label="Select Member"
            value={selectedMemberToAdd}
            options={nonMembers.map((u) => ({
              value: String(u.id),
              label: u.name || u.username || u.email || `User ${u.id}`,
            }))}
            onChange={setSelectedMemberToAdd}
            placeholder="Choose a team member"
          />
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => { setMemberModal(false); setSelectedMemberToAdd('') }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddMember} disabled={saving || !selectedMemberToAdd}>
              {saving ? 'Adding...' : 'Add Member'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
