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
} from '@webfudge/ui'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Users,
  Calendar,
  Menu,
  ChevronUp,
  ChevronDown,
  ArrowRight,
  Plus,
  FileText,
  Search,
  MoreHorizontal,
  Loader2,
} from 'lucide-react'
import PMPageHeader from '../components/PMPageHeader'
import projectService from '../lib/api/projectService'
import taskService from '../lib/api/taskService'
import strapiClient from '../lib/strapiClient'
import {
  transformTask,
  transformUser,
  transformProject,
  getStatusColor,
  formatDate,
} from '../lib/api/dataTransformers'

const colorSchemes = ['blue', 'yellow', 'green', 'red']

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
  const userName = userAttrs?.firstName || userAttrs?.name?.split?.(' ')[0] || 'User'

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
          projectService.getAllProjects({ pageSize: 10, sort: 'updatedAt:desc' }),
          userId
            ? taskService.getPMTasksByAssignee(userId, { pageSize: 100 })
            : taskService.getAllTasks({ pageSize: 100 }),
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
          } catch {}
        }
      } catch (error) {
        console.error('Dashboard load error:', error)
      } finally {
        setLoading(false)
      }
    }

    if (user) loadData()
  }, [user, getUserId])

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

  if (loading) {
    return (
      <div className="p-4 space-y-4 bg-white min-h-full">
        <PMPageHeader
          title="Dashboard"
          subtitle={`${getGreeting()}, ${userName} • ${getCurrentDate()}`}
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

  return (
    <div className="p-4 space-y-4 bg-white min-h-full">
      <PMPageHeader
        title="Dashboard"
        subtitle={`${getGreeting()}, ${userName} • ${getCurrentDate()}`}
        breadcrumb={[{ label: 'Dashboard', href: '/' }]}
        showSearch
        searchPlaceholder="Search anything..."
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card, index) => (
            <KPICard
              key={card.title}
              title={card.title}
              value={card.value}
              subtitle={card.subtitle}
              icon={card.icon}
              colorScheme={colorSchemes[index] || colorSchemes[0]}
              iconColorScheme="orange"
            />
          ))}
        </div>
      </div>

      {/* My Tasks + Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* My Tasks */}
        <div className="lg:col-span-3">
          <Card
            padding={false}
            glass={true}
            title="My Tasks"
            subtitle="Tasks where you are a collaborator"
          >
            <div className="px-6 pb-4">
              {collaboratorTasks.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                    <Menu className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="mt-6 text-sm font-semibold text-gray-900">
                    You don't have any tasks
                  </h3>
                  <p className="mt-2 text-xs text-gray-500 max-w-[240px]">
                    Tasks where you are a collaborator will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-1 pt-2">
                  {collaboratorTasks.slice(0, 8).map((task) => {
                    const sc = getStatusColor(task.status)
                    return (
                      <button
                        key={task.id}
                        onClick={() => router.push(`/my-tasks?task=${task.id}`)}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-brand-hover cursor-pointer transition-colors group text-left"
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-foreground truncate">{task.name}</p>
                          {task.project && (
                            <p className="text-xs text-brand-text-light truncate">{task.project}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.text}`}>
                            {task.status}
                          </span>
                          {task.dueDate && (
                            <span className="text-xs text-brand-text-muted flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(task.dueDate, 'short')}
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Projects */}
        <div className="lg:col-span-2">
          <Card
            padding={false}
            glass={true}
            title="Projects"
            subtitle="Track your current projects"
            actions={
              <Button variant="ghost" size="sm" onClick={() => router.push('/projects')}>
                View All <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
              </Button>
            }
          >
            <div className="px-4 pb-4 space-y-3">
              <Button
                variant="primary"
                rounded="pill"
                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600"
                onClick={() => router.push('/projects/add')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>

              {projects.length > 0 && (
                <div className="pt-1">
                  <div className="grid grid-cols-[1fr_auto] gap-4 px-4 pb-2">
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
                        className="w-full grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors text-left border-b border-gray-100"
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
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-primary" />
            </div>
          }
        >
          {people.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">
              No team members yet.
            </p>
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
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <button
                type="button"
                className="w-10 h-10 rounded-xl hover:bg-green-50 transition-colors flex items-center justify-center"
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
                <div className="bg-white/60 border border-gray-100 rounded-xl p-4">
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
                        className="text-[11px] border border-gray-200 rounded-md px-2 py-0.5 bg-white/50 focus:outline-none focus:ring-2 focus:ring-orange-200"
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
