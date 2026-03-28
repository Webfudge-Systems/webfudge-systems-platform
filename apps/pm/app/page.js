'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import {
  KPICard,
  Card,
  EmptyState,
  Button,
  Avatar,
  LoadingSpinner,
} from '@webfudge/ui'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  Users,
  Calendar,
  ArrowRight,
  Plus,
  FileText,
  ChevronRight,
} from 'lucide-react'
import PMPageHeader from '../components/PMPageHeader'
import projectService from '../lib/api/projectService'
import taskService from '../lib/api/taskService'
import strapiClient from '../lib/strapiClient'
import {
  transformTask,
  transformProject,
  getStatusColor,
  formatDate,
} from '../lib/api/dataTransformers'

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

export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [collaboratorTasks, setCollaboratorTasks] = useState([])
  const [peopleCount, setPeopleCount] = useState(0)
  const [notepad, setNotepad] = useState('')
  const [stats, setStats] = useState({ todo: 0, inProgress: 0, done: 0, overdue: 0 })
  const [notepadSaved, setNotepadSaved] = useState(false)

  const getUserId = useCallback(() => {
    if (!user) return null
    const u = user.attributes || user
    return u.id || user.id || null
  }, [user])

  const getUserDisplayName = useCallback(() => {
    if (!user) return 'Admin'
    const u = user.attributes || user
    if (u.firstName) return u.firstName
    if (u.name) return u.name.split(' ')[0]
    if (u.username) return u.username
    return 'Admin'
  }, [user])

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
          strapiClient.getXtrawrkxUsers({ pageSize: 100 }),
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
          setPeopleCount(
            Array.isArray(users) ? users.length : users?.meta?.pagination?.total || 0
          )
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

  const kpiCards = [
    {
      title: 'To Do Tasks',
      value: String(stats.todo),
      subtitle: stats.todo === 0 ? 'No tasks' : `${stats.todo} task${stats.todo !== 1 ? 's' : ''}`,
      icon: CheckSquare,
      colorScheme: 'blue',
    },
    {
      title: 'In Progress',
      value: String(stats.inProgress),
      subtitle: stats.inProgress === 0 ? 'No tasks' : `${stats.inProgress} active`,
      icon: Clock,
      colorScheme: 'yellow',
    },
    {
      title: 'Done Tasks',
      value: String(stats.done),
      subtitle: stats.done === 0 ? 'No tasks' : `${stats.done} completed`,
      icon: CheckCircle2,
      colorScheme: 'green',
    },
    {
      title: 'Overdue Tasks',
      value: String(stats.overdue),
      subtitle: stats.overdue === 0 ? 'No tasks' : `${stats.overdue} overdue`,
      icon: AlertCircle,
      colorScheme: 'red',
    },
  ]

  if (loading) {
    return (
      <div className="p-6">
        <PMPageHeader
          title="Dashboard"
          subtitle={`${getGreeting()}, ${getUserDisplayName()} • ${getCurrentDate()}`}
          showProfile
        />
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" message="Loading dashboard..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-white min-h-full">
      <PMPageHeader
        title="Dashboard"
        subtitle={`${getGreeting()}, ${getUserDisplayName()} • ${getCurrentDate()}`}
        showProfile
        showSearch
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KPICard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            colorScheme={card.colorScheme}
            onClick={() => router.push('/my-tasks')}
          />
        ))}
      </div>

      {/* My Tasks + Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* My Tasks */}
        <div className="lg:col-span-3">
          <Card
            padding={false}
            variant="default"
            title="My Tasks"
            subtitle="Tasks where you are a collaborator"
            actions={
              <Button variant="ghost" size="sm" onClick={() => router.push('/my-tasks')}>
                View All <ArrowRight className="w-3.5 h-3.5 ml-1 inline" />
              </Button>
            }
          >
            <div className="px-6 pb-4">
              {collaboratorTasks.length === 0 ? (
                <EmptyState
                  icon={CheckSquare}
                  title="You don't have any tasks"
                  description="Tasks where you are a collaborator will appear here."
                  action={
                    <Button variant="outline" size="sm" onClick={() => router.push('/my-tasks?action=new')}>
                      <Plus className="w-4 h-4 mr-1 inline" />
                      Create Task
                    </Button>
                  }
                />
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
            variant="default"
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
                className="w-full"
                onClick={() => router.push('/projects/add')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Project
              </Button>

              {projects.length > 0 && (
                <div className="space-y-1">
                  {projects.slice(0, 6).map((project) => {
                    const colors = [
                      'bg-orange-500', 'bg-blue-500', 'bg-green-500',
                      'bg-purple-500', 'bg-pink-500', 'bg-yellow-500',
                    ]
                    const color = colors[(project.name?.charCodeAt(0) || 0) % colors.length]
                    return (
                      <button
                        key={project.id}
                        onClick={() => router.push(`/projects/${project.slug || project.id}`)}
                        className="w-full flex items-center gap-2 px-1 py-2 rounded-lg hover:bg-brand-hover transition-colors text-left"
                      >
                        <span
                          className={`w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${color}`}
                        >
                          {(project.name || 'P').charAt(0).toUpperCase()}
                        </span>
                        <span className="flex-1 text-xs font-medium text-brand-foreground truncate">
                          {project.name}
                        </span>
                        <span className="text-xs text-brand-text-muted flex items-center gap-1 flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {project.endDate ? formatDate(project.endDate, 'short') : '—'}
                        </span>
                      </button>
                    )
                  })}
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
          variant="default"
          title={`People (${peopleCount})`}
          subtitle="Team members and collaborators"
          actions={
            <div className="w-10 h-10 bg-brand-primary/10 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-brand-primary" />
            </div>
          }
        >
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push('/coming-soon?feature=people')}
          >
            View all team members <ChevronRight className="w-4 h-4 ml-1 inline" />
          </Button>
        </Card>

        {/* Private Notepad */}
        <Card
          variant="default"
          title="Private Notepad"
          subtitle="Your personal notes"
          actions={
            <div className="flex items-center gap-2">
              {notepadSaved && (
                <span className="text-xs text-green-600 font-medium">Saved!</span>
              )}
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            </div>
          }
        >
          <textarea
            value={notepad}
            onChange={(e) => setNotepad(e.target.value)}
            onBlur={handleSaveNotepad}
            placeholder="Write your private notes here..."
            className="w-full h-24 text-sm text-brand-foreground placeholder:text-brand-text-muted bg-brand-hover rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-primary/20 border border-transparent focus:border-brand-primary/20 transition-all"
          />
          <button
            onClick={handleSaveNotepad}
            className="mt-2 text-xs text-brand-primary hover:underline"
          >
            Save note
          </button>
        </Card>
      </div>
    </div>
  )
}
