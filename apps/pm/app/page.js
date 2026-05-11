'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import {
  KPICard,
  Card,
  Button,
  Avatar,
  Input,
  EmptyState,
  Table,
  TableCellTitleSubtitle,
  TableCellCreated,
} from '@webfudge/ui'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  FolderKanban,
  Users,
  Calendar,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Plus,
  FileText,
  Search,
  MoreHorizontal,
  Loader2,
} from 'lucide-react'
import PMPageHeader from '../components/PMPageHeader'
import { getTaskStatusMeta } from '../components/PMStatusBadge'
import projectService from '../lib/api/projectService'
import taskService from '../lib/api/taskService'
import strapiClient from '../lib/strapiClient'
import { canReadPM, canWritePM } from '../lib/rbac'
import { canCreateProjectsInPm } from '../lib/pmOrgRoles'
import {
  transformTask,
  transformUser,
  transformProject,
} from '../lib/api/dataTransformers'

/** Matches `apps/pm/app/my-tasks/page.js` status Select chrome (read-only on dashboard). */
const TASK_STATUS_READONLY_CLASS = {
  primary: 'border-blue-200 bg-blue-50 text-blue-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  purple: 'border-purple-200 bg-purple-50 text-purple-800',
  success: 'border-green-200 bg-green-50 text-green-800',
  danger: 'border-red-200 bg-red-50 text-red-800',
  default: 'border-gray-200 bg-gray-50 text-gray-800',
}

function isTaskOverdue(task) {
  if (!task?.dueDate) return false
  const due = new Date(task.dueDate)
  if (Number.isNaN(due.getTime())) return false
  return due < new Date() && task.strapiStatus !== 'COMPLETED' && task.strapiStatus !== 'CANCELLED'
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}

function getCurrentDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMonthDay(dateString) {
  if (!dateString) return '—'
  const d = new Date(dateString)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [collaboratorTasks, setCollaboratorTasks] = useState([])
  const [peopleCount, setPeopleCount] = useState(0)
  const [people, setPeople] = useState([])
  const [peopleSearch, setPeopleSearch] = useState('')
  const [peopleExpanded, setPeopleExpanded] = useState(false)
  const [notepad, setNotepad] = useState('')
  const [stats, setStats] = useState({ todo: 0, inProgress: 0, done: 0, overdue: 0 })
  const [notepadSaved, setNotepadSaved] = useState(false)

  const getUserId = useCallback(() => {
    if (!user) return null
    const u = user.attributes || user
    return u.id || user.id || null
  }, [user])

  const userAttrs = user?.attributes || user
  const email = userAttrs?.email || ''
  const userName = email.split('@')[0] || 'User'
  const canViewDashboard = canReadPM('dashboard')
  const canViewProjects = canReadPM('projects')
  const canCreateProjects = canWritePM('projects') && canCreateProjectsInPm()
  const canViewTasks = canReadPM('tasks') || canReadPM('my_tasks')

  useEffect(() => {
    const savedNote = localStorage.getItem('pm-private-notepad')
    if (savedNote) setNotepad(savedNote)
  }, [])

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true)
        const userId = getUserId()

        const [projectsRes, allTasksRes, usersRes] = await Promise.allSettled([
          canViewProjects
            ? projectService.getAllProjects({ pageSize: 10, sort: 'updatedAt:desc' })
            : Promise.resolve({ data: [] }),
          canViewTasks
            ? userId
              ? taskService.getPMTasksByAssignee(userId, { pageSize: 100 })
              : taskService.getAllTasks({ pageSize: 100 })
            : Promise.resolve({ data: [] }),
          strapiClient.getXtrawrkxUsers({ pageSize: 200 }),
        ])

        if (projectsRes.status === 'fulfilled') {
          const rawProjects = projectsRes.value?.data || []
          setProjects(rawProjects.map(transformProject).filter(Boolean))
        }

        if (allTasksRes.status === 'fulfilled') {
          const rawTasks = allTasksRes.value?.data || []
          const transformed = rawTasks.map(transformTask).filter(Boolean)
          const now = new Date()
          setStats({
            todo: transformed.filter((t) => t.strapiStatus === 'SCHEDULED').length,
            inProgress: transformed.filter((t) => t.strapiStatus === 'IN_PROGRESS').length,
            done: transformed.filter((t) => t.strapiStatus === 'COMPLETED').length,
            overdue: transformed.filter(
              (t) => t.dueDate && new Date(t.dueDate) < now && t.strapiStatus !== 'COMPLETED'
            ).length,
          })
        }

        if (usersRes.status === 'fulfilled') {
          const users = usersRes.value
          const rawUsers = Array.isArray(users)
            ? users
            : Array.isArray(users?.data)
              ? users.data
              : users?.data || users?.users || []

          const transformed = (Array.isArray(rawUsers) ? rawUsers : []).map(transformUser).filter(Boolean)
          setPeople(transformed)
          setPeopleCount(Array.isArray(rawUsers) ? rawUsers.length : users?.meta?.pagination?.total || 0)
        }

        if (userId) {
          try {
            const collabRes = await taskService.getCollaboratorTasks(userId, { pageSize: 20 })
            setCollaboratorTasks((collabRes?.data || []).map(transformTask).filter(Boolean))
          } catch { }
        }
      } catch (error) {
        console.error('Dashboard load error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user && canViewDashboard) loadData()
  }, [user, getUserId, canViewDashboard, canViewProjects, canViewTasks])

  const handleSaveNotepad = () => {
    localStorage.setItem('pm-private-notepad', notepad)
    setNotepadSaved(true)
    setTimeout(() => setNotepadSaved(false), 2000)
  }

  const filteredPeople = useMemo(() => {
    const q = peopleSearch.trim().toLowerCase()
    if (!q) return people
    return people.filter(
      (p) =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
    )
  }, [people, peopleSearch])

  const visiblePeople = useMemo(() => {
    if (peopleExpanded) return filteredPeople
    return filteredPeople.slice(0, 6)
  }, [filteredPeople, peopleExpanded])

  const kpiCards = [
    {
      title: 'To Do Tasks',
      value: String(stats.todo),
      subtitle: stats.todo === 0 ? 'No tasks' : `${stats.todo} task${stats.todo !== 1 ? 's' : ''}`,
      icon: CheckSquare,
    },
    {
      title: 'In Progress Tasks',
      value: String(stats.inProgress),
      subtitle: stats.inProgress === 0 ? 'No tasks' : `${stats.inProgress} active`,
      icon: Clock,
    },
    {
      title: 'Done Tasks',
      value: String(stats.done),
      subtitle: stats.done === 0 ? 'No tasks' : `${stats.done} completed`,
      icon: CheckCircle2,
    },
    {
      title: 'Overdue Tasks',
      value: String(stats.overdue),
      subtitle: stats.overdue === 0 ? 'No tasks' : `${stats.overdue} overdue`,
      icon: AlertCircle,
    },
  ]

  const dashboardTasksColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'TASK NAME',
        headerClassName: 'max-w-[min(18rem,40vw)]',
        className: 'max-w-[min(18rem,40vw)] align-top',
        render: (_, row) => {
          const initial = (row.name || 'T').trim().charAt(0).toUpperCase() || 'T'
          const subtitle = `${row.description || 'No description'}${row.recurrenceSummary ? ` · ${row.recurrenceSummary}` : ''}`
          return (
            <div className="flex min-w-0 max-w-full items-start gap-3">
              <Avatar fallback={initial} alt={row.name} size="sm" className="flex-shrink-0 bg-gray-600 text-white" />
              <div className="min-w-0 flex-1">
                <TableCellTitleSubtitle title={row.name} subtitle={subtitle} />
              </div>
            </div>
          )
        },
      },
      {
        key: 'project',
        label: 'PROJECT',
        className: 'align-middle',
        headerClassName: 'align-middle',
        render: (_, row) =>
          row.project ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation()
                const slugOrId = row.projectSlug || row.projectId
                if (slugOrId != null && slugOrId !== '') {
                  router.push(`/projects/${slugOrId}`)
                }
              }}
              title={`Open project: ${row.project}`}
              className="inline-flex w-full min-w-[140px] max-w-[240px] items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 py-1.5 pl-2.5 pr-2 text-left text-xs font-semibold text-orange-900 shadow-sm transition hover:border-orange-300 hover:bg-orange-100/90"
            >
              <FolderKanban className="h-3.5 w-3.5 shrink-0 text-orange-600" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{row.project}</span>
              {row.projectSlug || row.projectId ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-orange-400" aria-hidden />
              ) : null}
            </button>
          ) : (
            <span
              className="inline-flex w-full min-w-[140px] max-w-[240px] items-center gap-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 py-1.5 px-2.5 text-xs font-medium text-gray-500"
              title="No project linked"
            >
              <FolderKanban className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
              No project
            </span>
          ),
      },
      {
        key: 'dueDate',
        label: 'DUE DATE',
        render: (_, row) => (
          <div
            className={
              isTaskOverdue(row) ? '[&_.font-semibold]:text-red-700 [&_.text-gray-500]:text-red-600/90' : ''
            }
          >
            <TableCellCreated dateString={row.dueDate} />
          </div>
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => {
          const meta = getTaskStatusMeta(row.strapiStatus)
          const chrome =
            TASK_STATUS_READONLY_CLASS[meta.variant] || TASK_STATUS_READONLY_CLASS.default
          return (
            <span
              className={`inline-flex min-w-[130px] items-center justify-center rounded-md border px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide ${chrome}`}
            >
              {meta.label}
            </span>
          )
        },
      },
    ],
    [router]
  )

  if (loading) {
    return (
      <div className="p-4 space-y-4 bg-white min-h-full">
        <PMPageHeader
          title={`${getGreeting()}, ${userName}`}
          subtitle={getCurrentDate()}
          breadcrumb={[{ label: 'Dashboard', href: '/' }]}
          showSearch
          searchPlaceholder="Search anything..."
        />
        <div className="flex justify-center items-center h-64">
          <div className="flex items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
            <span className="text-gray-600">Loading dashboard...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!canViewDashboard) {
    return (
      <div className="p-8 bg-white min-h-full">
        <EmptyState
          icon={AlertCircle}
          title="PM dashboard unavailable"
          description="Your current role does not have read access to the Project Management dashboard."
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 bg-white min-h-full">
      <PMPageHeader
        title={`${getGreeting()}, ${userName}`}
        subtitle={getCurrentDate()}
        breadcrumb={[{ label: 'Dashboard', href: '/' }]}
        showSearch
        searchPlaceholder="Search anything..."
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <KPICard
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              colorScheme="orange"
            />
          ))}
        </div>
      </div>

      {/* My Tasks + Projects — match People/Notepad padding (p-6); equal height on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6 lg:items-stretch">
        {/* My Tasks */}
        <div className="lg:col-span-3 flex h-full min-h-0">
          <Card
            glass={true}
            className="w-full h-full flex flex-col"
            title="My Tasks"
            subtitle="Tasks where you are a collaborator"
          >
            <div className="flex flex-1 flex-col min-h-[min(320px,50vh)]">
              {collaboratorTasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="No tasks yet"
                  description="Tasks where you are a collaborator will appear here."
                  className="flex flex-1 flex-col justify-center py-10 px-2"
                />
              ) : (
                <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <Table
                    columns={dashboardTasksColumns}
                    data={collaboratorTasks.slice(0, 8)}
                    keyField="id"
                    variant="modern"
                    onRowClick={(row) => router.push(`/tasks/${row.id}`)}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Projects */}
        <div className="lg:col-span-2 flex h-full min-h-0">
          <Card
            glass={true}
            className="w-full h-full flex flex-col"
            title="Projects"
            subtitle="Track your current projects"
            actions={
              canViewProjects ? (
              <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
                View All <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
              </Button>
              ) : null
            }
          >
            <div className="flex flex-1 flex-col min-h-[min(320px,50vh)]">
              {projects.length === 0 ? (
                <EmptyState
                  icon={FolderOpen}
                  title="No projects yet"
                  description="Projects you have access to will appear here."
                  className="flex flex-1 flex-col justify-center py-10 px-2"
                  action={
                    canCreateProjects ? (
                    <Button
                      variant="primary"
                      className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                      onClick={() => router.push('/projects/add')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Project
                    </Button>
                    ) : null
                  }
                />
              ) : (
                <div className="flex flex-1 flex-col min-h-0 space-y-3">
                  {canCreateProjects ? (
                    <Button
                      variant="primary"
                      className="w-full shrink-0 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                      onClick={() => router.push('/projects/add')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Project
                    </Button>
                  ) : null}
                  <div className="pt-1 flex-1 min-h-0">
                    <div className="grid grid-cols-[1fr_auto] gap-4 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Project
                        </span>
                        <div className="flex flex-col -space-y-1 text-gray-300">
                          <ChevronUp className="w-3 h-3" />
                          <ChevronDown className="w-3 h-3" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Due Date
                        </span>
                        <div className="flex flex-col -space-y-1 text-gray-300">
                          <ChevronUp className="w-3 h-3" />
                          <ChevronDown className="w-3 h-3" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-100">
                      {projects.slice(0, 4).map((project) => (
                        <button
                          key={project.id}
                          onClick={() => router.push(`/projects/${project.slug || project.id}`)}
                          className="w-full grid grid-cols-[1fr_auto] items-center gap-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                              size="md"
                              fallback={project.name?.charAt(0) || 'P'}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {project.name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 justify-end text-sm text-gray-600">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span>{formatMonthDay(project.endDate)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* People + Private Notepad */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* People */}
        <Card
          glass={true}
          title={`People (${peopleCount || people.length})`}
          subtitle="Team members and collaborators"
          actions={
            <div className="w-10 h-10 bg-brand-primary/10 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-primary" />
            </div>
          }
        >
          {people.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description="People in your workspace will appear here."
              className="py-10 px-4"
            />
          ) : (
            <div className="space-y-4">
              <Input
                icon={Search}
                type="search"
                placeholder="Search people..."
                value={peopleSearch}
                onChange={(e) => setPeopleSearch(e.target.value)}
                aria-label="Search people"
                className="!bg-white/80 border-gray-200"
                containerClassName="!mb-0"
              />
              {filteredPeople.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">
                  No people match your search.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {visiblePeople.map((p) => (
                      <div
                        key={p.id}
                        className="border border-gray-100 rounded-xl p-3 flex flex-col items-center text-center bg-white/90 shadow-sm"
                      >
                        <Avatar
                          size="lg"
                          src={p.avatar || undefined}
                          alt={p.name}
                          fallback={p.initials || 'U'}
                          className={`${p.color} text-white font-semibold`}
                        />
                        <p
                          className="font-semibold text-gray-900 text-sm mt-2 w-full truncate"
                          title={p.name}
                        >
                          {p.name}
                        </p>
                        <p
                          className="text-xs text-gray-500 w-full truncate mt-0.5"
                          title={p.email || ''}
                        >
                          {p.email || '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                  {filteredPeople.length > 6 && (
                    <button
                      type="button"
                      onClick={() => setPeopleExpanded((v) => !v)}
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-medium text-brand-primary hover:text-orange-600 transition-colors pt-1"
                    >
                      <span>{peopleExpanded ? 'Show less' : 'Show More'}</span>
                      {peopleExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </Card>

        {/* Private Notepad */}
        <Card
          glass={true}
          title="Private Notepad"
          subtitle="Your personal notes"
          actions={
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <button
                type="button"
                className="w-10 h-10 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center"
                aria-label="Notepad menu"
              >
                <MoreHorizontal className="w-5 h-5 text-green-600" />
              </button>
            </div>
          }
        >
          {/*
            Visual-only "editor" layout to match the dashboard reference.
            Formatting actions are present as UI affordances (no-op).
          */}
          {(() => {
            const trimmed = notepad.trim()
            const words = trimmed ? trimmed.split(/\s+/).filter(Boolean).length : 0
            const chars = notepad.length
            return (
              <div className="space-y-3">
                <div className="bg-white/60 border border-gray-100 rounded-lg p-4">
                  <textarea
                    value={notepad}
                    onChange={(e) => setNotepad(e.target.value)}
                    onBlur={handleSaveNotepad}
                    placeholder="Write down anything here..."
                    className="w-full h-28 text-sm text-brand-foreground placeholder:text-brand-text-muted bg-transparent resize-none outline-none"
                  />

                  <div className="mt-4 flex items-center gap-2 text-gray-500">
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold"
                      aria-label="Bold"
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold italic"
                      aria-label="Italic"
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold underline decoration-gray-600"
                      aria-label="Underline"
                    >
                      U
                    </button>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors text-xs font-semibold line-through"
                      aria-label="Strikethrough"
                    >
                      S
                    </button>
                  </div>
                  <div className="pt-3 flex items-center justify-end gap-6 text-[11px] text-gray-500">
                    <span>
                      {words} words
                    </span>
                    <span>
                      {chars} characters
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-gray-400">Priority</span>
                      <select
                        defaultValue="medium"
                        className="text-[11px] border border-gray-200 rounded-lg px-2 py-0.5 bg-white/50 focus:outline-none focus:ring-2 focus:ring-orange-200"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </span>
                  </div>
                </div>
              </div>
            )
          })()}
        </Card>
      </div>
    </div>
  )
}
