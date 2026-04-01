'use client'
export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@webfudge/auth'
import {
  KPICard,
  Card,
  LoadingSpinner,
} from '@webfudge/ui'
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Users,
  Target,
  Activity,
  SlidersHorizontal,
  MoreHorizontal,
  User,
} from 'lucide-react'
import PMPageHeader from '../../components/PMPageHeader'
import taskService from '../../lib/api/taskService'
import projectService from '../../lib/api/projectService'
import strapiClient from '../../lib/strapiClient'
import { transformTask, transformProject } from '../../lib/api/dataTransformers'

function PieLegend({ items, className = '' }) {
  return (
    <div className={`flex items-center gap-4 text-xs text-gray-600 ${className}`}>
      {items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${it.color}`} />
          <span>{it.label}</span>
        </div>
      ))}
    </div>
  )
}

function ChartEmpty({
  icon: Icon,
  title = 'No tasks yet',
  description = 'Data will appear when you have activity to analyze.',
}) {
  return (
    <div className="py-20 flex flex-col items-center justify-center text-center px-4">
      {Icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center text-gray-400">
          <Icon className="h-10 w-10" strokeWidth={1.25} />
        </div>
      ) : null}
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">{description}</p>
      ) : null}
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

  const tasksByProject = (() => {
    const map = new Map()
    for (const t of tasks) {
      const name = t.project || t.projects?.[0]?.name || 'Unknown'
      if (!map.has(name)) map.set(name, { total: 0, completed: 0 })
      const cur = map.get(name)
      cur.total += 1
      if (t.strapiStatus === 'COMPLETED') cur.completed += 1
    }
    const items = [...map.entries()].map(([name, v]) => ({
      name,
      total: v.total,
      completed: v.completed,
      incomplete: Math.max(0, v.total - v.completed),
    }))
    items.sort((a, b) => b.total - a.total)
    return items.slice(0, 2)
  })()

  const tasksByAssignee = (() => {
    const map = new Map()
    for (const t of tasks) {
      const a = t.assignee
      if (!a) continue
      const name = a.name || a.email || 'Unassigned'
      if (!map.has(name)) map.set(name, { total: 0, completed: 0 })
      const cur = map.get(name)
      cur.total += 1
      if (t.strapiStatus === 'COMPLETED') cur.completed += 1
    }
    const items = [...map.entries()].map(([name, v]) => ({
      name,
      total: v.total,
      completed: v.completed,
    }))
    items.sort((a, b) => b.total - a.total)
    return items.slice(0, 3)
  })()

  const completionBuckets = (() => {
    // 5 buckets: last 5 weeks
    const buckets = Array.from({ length: 5 }, (_, i) => ({
      label: `W${i + 1}`,
      completed: 0,
      incomplete: 0,
    }))
    const now = Date.now()
    for (const t of tasks) {
      const raw = t.updatedAt || t.createdAt || t.dueDate
      const dt = new Date(raw)
      if (Number.isNaN(dt.getTime())) continue
      const diffDays = Math.floor((now - dt.getTime()) / (1000 * 60 * 60 * 24))
      const weekIndex = Math.floor(diffDays / 7)
      const bucketIdx = 4 - weekIndex
      if (bucketIdx < 0 || bucketIdx > 4) continue
      const done = t.strapiStatus === 'COMPLETED'
      if (done) buckets[bucketIdx].completed += 1
      else buckets[bucketIdx].incomplete += 1
    }
    return buckets
  })()

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
          breadcrumb={[
            { label: 'Dashboard', href: '/' },
            { label: 'Analytics' },
          ]}
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
        subtitle={
          taskStats.total === 0
            ? 'Project and task performance overview'
            : 'Analyze and manage your projects and tasks'
        }
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Analytics' },
        ]}
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
            iconBgColorScheme="orange"
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          glass={true}
          title="Tasks by Status"
          variant="default"
          actions={
            <div className="flex items-center gap-2 text-gray-400">
              <SlidersHorizontal className="w-4 h-4" />
              <MoreHorizontal className="w-4 h-4" />
            </div>
          }
        >
          {taskStats.total === 0 ? (
            <ChartEmpty icon={CheckSquare} title="No tasks yet" />
          ) : (
            <div className="px-2 py-2">
              <div className="flex items-end gap-5 h-32">
                <div className="flex-1">
                  <div
                    className="w-full bg-blue-500 rounded-lg"
                    style={{
                      height: (() => {
                        const maxStatus = Math.max(1, taskStats.todo, taskStats.completed)
                        return `${Math.max(14, Math.round((taskStats.todo / maxStatus) * 120))}px`
                      })(),
                    }}
                  />
                  <p className="mt-2 text-[11px] text-gray-500 text-center">To Do</p>
                </div>
                <div className="flex-1">
                  <div
                    className="w-full bg-green-500 rounded-lg"
                    style={{
                      height: (() => {
                        const maxStatus = Math.max(1, taskStats.todo, taskStats.completed)
                        return `${Math.max(14, Math.round((taskStats.completed / maxStatus) * 120))}px`
                      })(),
                    }}
                  />
                  <p className="mt-2 text-[11px] text-gray-500 text-center">Done</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card
          glass={true}
          title="Tasks by Project"
          variant="default"
          actions={
            <div className="flex items-center gap-2">
              <>
                <PieLegend
                  items={[
                    { label: 'Completed', color: 'bg-green-500' },
                    { label: 'Incomplete', color: 'bg-yellow-500' },
                  ]}
                  className="gap-2"
                />
                <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </>
            </div>
          }
        >
          {taskStats.total === 0 ? (
            <ChartEmpty icon={CheckSquare} title="No tasks yet" />
          ) : (
            <div className="px-2 py-2">
              <div className="flex items-end gap-10 h-32">
                {tasksByProject.slice(0, 2).map((p) => {
                  const maxProject = Math.max(1, ...tasksByProject.map((x) => x.total || 0))
                  const height = Math.max(16, Math.round(((p.total || 0) / maxProject) * 120))
                  const pctCompleted = p.total > 0 ? p.completed / p.total : 0
                  const isCompletedMajor = pctCompleted >= 0.5
                  const barColor = isCompletedMajor ? 'bg-green-500' : 'bg-yellow-500'
                  return (
                    <div key={p.name} className="flex-1 flex flex-col items-center">
                      <div className={`w-full ${barColor} rounded-lg`} style={{ height: `${height}px` }} />
                      <div className={`mt-5 w-3 h-3 rounded-full ${barColor}`} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </Card>

        <Card
            glass={true}
            title="Tasks by Assignee"
            variant="default"
            actions={
              <div className="flex items-center gap-2 text-gray-400">
                <SlidersHorizontal className="w-4 h-4" />
                <MoreHorizontal className="w-4 h-4" />
              </div>
            }
          >
            {taskStats.total === 0 || tasksByAssignee.length === 0 ? (
              <ChartEmpty icon={CheckSquare} title="No tasks yet" />
            ) : (
              (() => {
                const top = tasksByAssignee.slice(0, 3)
                const max = Math.max(1, ...top.map((a) => a.total || 0))
                return (
                  <div className="px-2 py-2">
                    <div className="flex items-end justify-between h-40">
                      {top.map((a) => {
                        const lineH = Math.max(32, Math.round(((a.total || 0) / max) * 110))
                        return (
                          <div key={a.name} className="flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                              <User className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="w-px bg-blue-500 mt-3 rounded-full" style={{ height: `${lineH}px` }} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()
            )}
          </Card>

        <Card
            glass={true}
            title="Task Completion Over Time"
            variant="default"
            actions={
              <div className="flex items-center gap-2">
                <PieLegend
                  items={[
                    { label: 'Completed', color: 'bg-green-500' },
                    { label: 'Incomplete', color: 'bg-yellow-500' },
                  ]}
                  className="gap-2"
                />
                <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                <MoreHorizontal className="w-4 h-4 text-gray-400" />
              </div>
            }
          >
            {taskStats.total === 0 ? (
              <ChartEmpty icon={CheckSquare} title="No tasks yet" />
            ) : (
              <div className="px-2 py-2">
                {(() => {
                const series = completionBuckets || []
                const W = 320
                const H = 132
                const left = 34
                const right = 10
                const top = 10
                const bottom = 22
                const chartW = W - left - right
                const chartH = H - top - bottom
                const len = Math.max(2, series.length)
                const dx = chartW / (len - 1)
                const maxTotal = Math.max(
                  1,
                  ...series.map((b) => (b.completed || 0) + (b.incomplete || 0))
                )
                const baselineY = top + chartH

                const ptsInc = series.map((b, i) => {
                  const x = left + i * dx
                  const y = top + (1 - (b.incomplete || 0) / maxTotal) * chartH
                  return { x, y }
                })
                const ptsTot = series.map((b, i) => {
                  const x = left + i * dx
                  const total = (b.completed || 0) + (b.incomplete || 0)
                  const y = top + (1 - total / maxTotal) * chartH
                  return { x, y }
                })

                const incompletePoly = [
                  `${left},${baselineY}`,
                  ...ptsInc.map((p) => `${p.x},${p.y}`),
                  `${left + (len - 1) * dx},${baselineY}`,
                ].join(' ')

                const completedPoly = [
                  ...ptsTot.map((p) => `${p.x},${p.y}`),
                  ...ptsInc
                    .slice()
                    .reverse()
                    .map((p) => `${p.x},${p.y}`),
                ].join(' ')

                const tickCount = 3
                const ticks = Array.from({ length: tickCount }, (_, i) => {
                  const value = tickCount - i
                  const y = top + ((i + 0) / tickCount) * chartH
                  return { value, y }
                })

                const xEnd = left + (len - 1) * dx

                return (
                  <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="132" preserveAspectRatio="none">
                    {ticks.map((tk, i) => (
                      <g key={i}>
                        <line x1={left} x2={xEnd} y1={tk.y} y2={tk.y} stroke="#E5E7EB" strokeWidth="1" />
                        <text x={left - 14} y={tk.y + 4} fontSize="10" fill="#6B7280">
                          {tk.value}
                        </text>
                      </g>
                    ))}

                    <polygon points={incompletePoly} fill="#F59E0B" opacity="0.35" />
                    <polygon points={completedPoly} fill="#22C55E" opacity="0.45" />
                  </svg>
                )
                })()}
              </div>
            )}
          </Card>
      </div>
    </div>
  )
}
