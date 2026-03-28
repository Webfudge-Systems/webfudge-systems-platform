'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@webfudge/auth'
import {
  KPICard,
  Card,
  LoadingSpinner,
  EmptyState,
} from '@webfudge/ui'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Users,
  TrendingUp,
  BarChart2,
  Target,
  Activity,
} from 'lucide-react'
import PMPageHeader from '../../components/PMPageHeader'
import taskService from '../../lib/api/taskService'
import projectService from '../../lib/api/projectService'
import strapiClient from '../../lib/strapiClient'
import { transformTask, transformProject } from '../../lib/api/dataTransformers'

function SimpleBar({ value, max, colorClass = 'bg-orange-500', label }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      {label && (
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>{label}</span>
          <span className="font-medium">{value}</span>
        </div>
      )}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [peopleCount, setPeopleCount] = useState(0)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [tasksRes, projectsRes, usersRes] = await Promise.allSettled([
        taskService.getAllTasks({ pageSize: 500 }),
        projectService.getAllProjects({ pageSize: 200 }),
        strapiClient.getXtrawrkxUsers({ pageSize: 200 }),
      ])

      if (tasksRes.status === 'fulfilled') {
        setTasks((tasksRes.value?.data || []).map(transformTask).filter(Boolean))
      }
      if (projectsRes.status === 'fulfilled') {
        setProjects((projectsRes.value?.data || []).map(transformProject).filter(Boolean))
      }
      if (usersRes.status === 'fulfilled') {
        const u = usersRes.value
        setPeopleCount(Array.isArray(u) ? u.length : u?.meta?.pagination?.total || 0)
      }
    } catch (err) {
      console.error('Analytics load error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 30000)
    return () => clearInterval(interval)
  }, [loadData])

  // Derived stats
  const taskStats = {
    total: tasks.length,
    todo: tasks.filter((t) => t.strapiStatus === 'SCHEDULED').length,
    inProgress: tasks.filter((t) => t.strapiStatus === 'IN_PROGRESS').length,
    inReview: tasks.filter((t) => t.strapiStatus === 'INTERNAL_REVIEW').length,
    completed: tasks.filter((t) => t.strapiStatus === 'COMPLETED').length,
    cancelled: tasks.filter((t) => t.strapiStatus === 'CANCELLED').length,
    overdue: tasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < new Date() && t.strapiStatus !== 'COMPLETED'
    ).length,
    high: tasks.filter((t) => (t.priority || '').toLowerCase() === 'high').length,
    medium: tasks.filter((t) => (t.priority || '').toLowerCase() === 'medium').length,
    low: tasks.filter((t) => (t.priority || '').toLowerCase() === 'low').length,
  }

  const projectStats = {
    total: projects.length,
    scheduled: projects.filter((p) => p.strapiStatus === 'SCHEDULED').length,
    inProgress: projects.filter((p) => p.strapiStatus === 'IN_PROGRESS').length,
    completed: projects.filter((p) => p.strapiStatus === 'COMPLETED').length,
    cancelled: projects.filter((p) => p.strapiStatus === 'CANCELLED').length,
  }

  const completionRate =
    taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0

  const projectCompletionRate =
    projectStats.total > 0
      ? Math.round((projectStats.completed / projectStats.total) * 100)
      : 0

  const kpiCards = [
    {
      title: 'Total Tasks',
      value: String(taskStats.total),
      subtitle: `${completionRate}% completion rate`,
      icon: CheckSquare,
      colorScheme: 'blue',
    },
    {
      title: 'In Progress',
      value: String(taskStats.inProgress),
      subtitle: 'Active tasks',
      icon: Clock,
      colorScheme: 'yellow',
    },
    {
      title: 'Completed',
      value: String(taskStats.completed),
      subtitle: `${completionRate}% of all tasks`,
      icon: CheckCircle2,
      colorScheme: 'green',
    },
    {
      title: 'Overdue',
      value: String(taskStats.overdue),
      subtitle: taskStats.overdue === 0 ? 'On track!' : 'Needs attention',
      icon: AlertTriangle,
      colorScheme: taskStats.overdue > 0 ? 'red' : 'green',
    },
    {
      title: 'Total Projects',
      value: String(projectStats.total),
      subtitle: `${projectCompletionRate}% completed`,
      icon: FolderOpen,
      colorScheme: 'purple',
    },
    {
      title: 'Active Projects',
      value: String(projectStats.inProgress),
      subtitle: 'Currently in progress',
      icon: Activity,
      colorScheme: 'orange',
    },
    {
      title: 'Team Members',
      value: String(peopleCount),
      subtitle: 'Across all projects',
      icon: Users,
      colorScheme: 'indigo',
    },
    {
      title: 'Completion Rate',
      value: `${completionRate}%`,
      subtitle: 'Task completion',
      icon: Target,
      colorScheme: completionRate >= 70 ? 'green' : completionRate >= 40 ? 'yellow' : 'red',
    },
  ]

  if (loading) {
    return (
      <div className="p-6">
        <PMPageHeader
          title="Analytics"
          subtitle="Project and task performance overview"
          showProfile
        />
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" message="Loading analytics..." />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PMPageHeader
        title="Analytics"
        subtitle="Project and task performance overview"
        showProfile
      />

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <KPICard
            key={card.title}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            colorScheme={card.colorScheme}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Breakdown */}
        <Card
          title="Task Status Breakdown"
          subtitle="Distribution across all task statuses"
          variant="default"
          actions={<BarChart2 className="w-5 h-5 text-gray-400" />}
        >
          <div className="space-y-4">
            {taskStats.total === 0 ? (
              <EmptyState icon={CheckSquare} title="No tasks yet" description="Tasks will appear here once created." />
            ) : (
              <>
                <SimpleBar value={taskStats.todo} max={taskStats.total} colorClass="bg-blue-500" label="To Do" />
                <SimpleBar value={taskStats.inProgress} max={taskStats.total} colorClass="bg-yellow-500" label="In Progress" />
                <SimpleBar value={taskStats.inReview} max={taskStats.total} colorClass="bg-purple-500" label="In Review" />
                <SimpleBar value={taskStats.completed} max={taskStats.total} colorClass="bg-green-500" label="Completed" />
                <SimpleBar value={taskStats.cancelled} max={taskStats.total} colorClass="bg-gray-400" label="Cancelled" />
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 text-right">
                  {taskStats.total} total tasks
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Task Priority Breakdown */}
        <Card
          title="Task Priority Breakdown"
          subtitle="High, medium and low priority tasks"
          variant="default"
          actions={<TrendingUp className="w-5 h-5 text-gray-400" />}
        >
          <div className="space-y-4">
            {taskStats.total === 0 ? (
              <EmptyState icon={CheckSquare} title="No tasks yet" description="Tasks will appear here once created." />
            ) : (
              <>
                <SimpleBar value={taskStats.high} max={taskStats.total} colorClass="bg-red-500" label="High Priority" />
                <SimpleBar value={taskStats.medium} max={taskStats.total} colorClass="bg-yellow-500" label="Medium Priority" />
                <SimpleBar value={taskStats.low} max={taskStats.total} colorClass="bg-green-500" label="Low Priority" />
                <div className="pt-3 grid grid-cols-3 gap-3">
                  {[
                    { label: 'High', value: taskStats.high, color: 'text-red-600 bg-red-50' },
                    { label: 'Medium', value: taskStats.medium, color: 'text-yellow-600 bg-yellow-50' },
                    { label: 'Low', value: taskStats.low, color: 'text-green-600 bg-green-50' },
                  ].map((item) => (
                    <div key={item.label} className={`text-center p-3 rounded-xl ${item.color}`}>
                      <p className="text-2xl font-bold">{item.value}</p>
                      <p className="text-xs font-medium mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Project Status Breakdown */}
        <Card
          title="Project Status Breakdown"
          subtitle="Overall project health"
          variant="default"
          actions={<FolderOpen className="w-5 h-5 text-gray-400" />}
        >
          <div className="space-y-4">
            {projectStats.total === 0 ? (
              <EmptyState icon={FolderOpen} title="No projects yet" description="Projects will appear here once created." />
            ) : (
              <>
                <SimpleBar value={projectStats.scheduled} max={projectStats.total} colorClass="bg-blue-500" label="Scheduled" />
                <SimpleBar value={projectStats.inProgress} max={projectStats.total} colorClass="bg-yellow-500" label="In Progress" />
                <SimpleBar value={projectStats.completed} max={projectStats.total} colorClass="bg-green-500" label="Completed" />
                <SimpleBar value={projectStats.cancelled} max={projectStats.total} colorClass="bg-gray-400" label="Cancelled" />
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-500 text-right">
                  {projectStats.total} total projects
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Overview Summary */}
        <Card
          title="Performance Overview"
          subtitle="Key metrics at a glance"
          variant="default"
          actions={<Activity className="w-5 h-5 text-gray-400" />}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Overdue Tasks', value: taskStats.overdue, color: taskStats.overdue > 0 ? 'text-red-600' : 'text-green-600' },
                { label: 'Completion Rate', value: `${completionRate}%`, color: completionRate >= 70 ? 'text-green-600' : 'text-yellow-600' },
                { label: 'Active Projects', value: projectStats.inProgress, color: 'text-orange-600' },
                { label: 'Team Members', value: peopleCount, color: 'text-purple-600' },
              ].map((item) => (
                <div key={item.label} className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                  <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>
            <div className="p-4 bg-orange-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-800">Overall Progress</span>
                <span className="text-sm font-bold text-orange-800">{completionRate}%</span>
              </div>
              <div className="h-3 bg-orange-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-700"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
