'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { SidebarTrialUpsell, LoadingSpinner } from '@webfudge/ui'
import {
  LayoutDashboard,
  CheckSquare,
  Inbox,
  MessageCircle,
  BarChart3,
  FolderOpen,
  Plus,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  FileText,
  Calendar,
  Target,
} from 'lucide-react'
import projectService from '../lib/api/projectService'
import { transformProject } from '../lib/api/dataTransformers'
import { canReadPM, canWritePM } from '../lib/rbac'

export default function PMSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()

  const trialDaysRemaining = (() => {
    const n = Number(process.env.NEXT_PUBLIC_TRIAL_DAYS_REMAINING)
    return Number.isFinite(n) ? n : 12
  })()

  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showAllProjects, setShowAllProjects] = useState(false)
  const [expandedProjectId, setExpandedProjectId] = useState(null)

  const quickActionsRef = useRef(null)

  const isActive = (href) => {
    if (!href || href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const toggleQuickActions = () => setQuickActionsOpen((o) => !o)

  const quickActionItems = [
    {
      label: 'New Task',
      module: 'my_tasks',
      icon: CheckSquare,
      href: '/my-tasks?createTask=1',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      label: 'New Project',
      module: 'projects',
      icon: FolderOpen,
      href: '/projects/add',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  ]

  const handleQuickActionClick = (href) => {
    setQuickActionsOpen(false)
    router.push(href)
  }

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
        setQuickActionsOpen(false)
      }
    }
    if (quickActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [quickActionsOpen])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true)
        const response = await projectService.getAllProjects({
          pageSize: 20,
          sort: 'updatedAt:desc',
        })
        const items = response?.data || response || []
        setProjects(items.map(transformProject))
      } catch {
        setProjects([])
      } finally {
        setLoadingProjects(false)
      }
    }
    fetchProjects()
  }, [])

  const mainNavigationItems = [
    {
      id: 'dashboard',
      module: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/',
    },
    {
      id: 'my-tasks',
      module: 'my_tasks',
      label: 'My Tasks',
      icon: CheckSquare,
      href: '/my-tasks',
    },
    {
      id: 'inbox',
      module: 'inbox',
      label: 'Inbox',
      icon: Inbox,
      href: '/inbox',
    },
    {
      id: 'message',
      module: 'inbox',
      label: 'Message',
      icon: MessageCircle,
      href: '/message',
    },
  ]

  const pmTools = [
    {
      label: 'Documents',
      icon: FileText,
      href: '/coming-soon?feature=documents',
      comingSoonFeature: 'documents',
    },
    { label: 'Calendar', module: 'calendar', icon: Calendar, href: '/calendar' },
  ]

  const visibleQuickActions = quickActionItems.filter((item) => canWritePM(item.module))
  const visibleNavigationItems = mainNavigationItems.filter((item) => canReadPM(item.module))
  const visiblePmTools = pmTools.filter((item) => !item.module || canReadPM(item.module))
  const canReadProjects = canReadPM('projects')
  const canCreateProjects = canWritePM('projects')

  const isPmToolActive = (item) => {
    if (item.comingSoonFeature) {
      return pathname === '/coming-soon' && searchParams.get('feature') === item.comingSoonFeature
    }
    const pathOnly = item.href.split('?')[0]
    if (!pathOnly) return false
    return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`)
  }

  const displayedProjects = useMemo(() => {
    if (loadingProjects) return []
    const collapsedCount = 4
    const expandedCount = 6
    if (showAllProjects) return projects.slice(0, expandedCount)
    return projects.slice(0, collapsedCount)
  }, [projects, showAllProjects, loadingProjects])

  const PROJECT_AVATAR_PALETTE = [
    'bg-orange-500',
    'bg-sky-500',
    'bg-violet-500',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-amber-500',
    'bg-cyan-600',
    'bg-indigo-500',
    'bg-fuchsia-600',
    'bg-slate-700',
  ]

  const getProjectAvatarClass = (project) => {
    const key = project?.id ?? project?.name ?? ''
    let n = 0
    if (typeof key === 'number') n = Math.abs(key)
    else {
      const s = String(key)
      for (let i = 0; i < s.length; i += 1) n += s.charCodeAt(i)
    }
    return PROJECT_AVATAR_PALETTE[n % PROJECT_AVATAR_PALETTE.length]
  }

  const getProjectHealthStyles = (project) => {
    const s = project?.strapiStatus
    if (s === 'COMPLETED') return { icon: 'text-emerald-600', label: 'Completed' }
    if (s === 'CANCELLED') return { icon: 'text-gray-500', label: 'Cancelled' }
    if (s === 'ON_HOLD') return { icon: 'text-sky-600', label: 'On hold' }
    const total = project?.totalTasks ?? 0
    const p = project?.progress ?? 0
    if (total === 0) return { icon: 'text-slate-500', label: 'No tasks yet' }
    if (p >= 72) return { icon: 'text-emerald-600', label: 'On track' }
    if (p >= 38) return { icon: 'text-amber-500', label: 'In progress' }
    return { icon: 'text-rose-600', label: 'Needs attention' }
  }

  const sectionRule = (id) =>
    !collapsed && (
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="flex-1 h-px bg-white/25" />
        <span className="text-[10px] uppercase tracking-wider text-brand-text-light font-semibold">
          {id}
        </span>
        <div className="flex-1 h-px bg-white/25" />
      </div>
    )

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } h-full min-h-0 bg-white backdrop-blur-xl border-r border-white/30 flex flex-col shadow-xl overflow-hidden transition-[width] duration-300 flex-shrink-0`}
    >
      <div className="shrink-0 p-4 border-b border-white/20">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <span className="font-bold text-xl text-brand-foreground">Webfudge PM</span>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5 text-brand-foreground" />
            ) : (
              <ChevronLeft className="w-5 h-5 text-brand-foreground" />
            )}
          </button>
        </div>

        <div className="relative mt-3" ref={quickActionsRef}>
          <button
            type="button"
            onClick={toggleQuickActions}
            disabled={visibleQuickActions.length === 0}
            className={`w-full bg-gradient-to-r from-orange-500/20 to-orange-600/10 backdrop-blur-md border ${
              quickActionsOpen
                ? 'border-orange-300/60'
                : 'border-white/30 hover:border-orange-200/50'
            } text-brand-foreground rounded-xl py-2.5 px-3 flex items-center ${
              collapsed ? 'justify-center' : 'justify-between gap-2'
            } shadow-lg transition-all`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md flex-shrink-0">
                <Plus className="w-4 h-4 text-white" />
              </div>
              {!collapsed && (
                <span className="text-sm font-semibold text-gray-800 truncate">Quick Actions</span>
              )}
            </div>
            {!collapsed && (
              <ChevronDown
                className={`w-4 h-4 text-gray-600 flex-shrink-0 transition-transform ${
                  quickActionsOpen ? 'rotate-180' : ''
                }`}
              />
            )}
          </button>

          {quickActionsOpen && !collapsed && (
            <div className="absolute left-0 right-0 top-full mt-2 z-[100] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden max-h-[min(70vh,24rem)] overflow-y-auto">
              <div className="p-2">
                <p className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  Quick actions
                </p>
                {visibleQuickActions.map((item, index) => {
                  const QIcon = item.icon
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleQuickActionClick(item.href)}
                      className="w-full flex items-center gap-3 p-3 text-sm text-gray-800 rounded-xl hover:bg-gray-50 transition-colors group/item text-left"
                    >
                      <div
                        className={`w-9 h-9 ${item.bgColor} ${item.borderColor} border rounded-lg flex items-center justify-center flex-shrink-0`}
                      >
                        <QIcon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span className="font-medium flex-1">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover/item:opacity-100" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-3 pt-3 pb-2">
          {sectionRule('Navigate')}
          <div className={`grid gap-3 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {visibleNavigationItems.map((item) => {
              const Icon = item.icon
              const active = item.href ? isActive(item.href) : false
              return (
                <Link
                  key={item.id}
                  href={item.href || '/'}
                  className={`rounded-2xl px-2 py-4 sm:py-5 flex flex-col items-center justify-center gap-2 min-h-[5.25rem] transition-all shadow-md border ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary/40'
                      : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-foreground hover:bg-white/30'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-7 h-7 shrink-0" strokeWidth={2} />
                  {!collapsed && (
                    <span className="text-xs font-semibold text-center leading-snug px-0.5">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Projects — same list-table chrome as CRM activity feed */}
        {!collapsed && canReadProjects && (
          <div className="px-3 py-2 relative z-0">
            {sectionRule('Projects')}
            <div className="rounded-xl border border-gray-300 bg-white shadow-md overflow-hidden relative z-0 ring-1 ring-black/[0.04]">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
                <span className="flex items-center gap-1.5 min-w-0">
                  <FolderOpen className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                  <span className="truncate">Projects</span>
                </span>
                {canCreateProjects ? (
                  <button
                    type="button"
                    onClick={() => router.push('/projects/add')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:bg-gray-50 hover:text-gray-900"
                    title="New project"
                  >
                    <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>

              <div className="max-h-80 overflow-y-auto overscroll-contain px-1.5 pb-2">
                {loadingProjects ? (
                  <div className="flex justify-center py-6">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p className="text-[11px] font-medium text-gray-700">No projects yet</p>
                    <p className="mt-1 text-[11px] leading-snug text-gray-500">
                      Projects you have access to will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {displayedProjects.map((project) => {
                      const slugPath = project.slug || project.id
                      const routeActive = pathname.startsWith(`/projects/${slugPath}`)
                      const health = getProjectHealthStyles(project)
                      const isOpen = expandedProjectId === project.id
                      return (
                        <div key={project.id} className="first:border-t-0">
                          <div
                            className={`flex items-center gap-1 rounded-lg transition-colors ${
                              routeActive
                                ? 'bg-orange-50/90 ring-1 ring-orange-200/80'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => router.push(`/projects/${slugPath}`)}
                              className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-2 pr-1 text-left"
                            >
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ${getProjectAvatarClass(project)}`}
                              >
                                {(project.name || 'P').charAt(0).toUpperCase()}
                              </span>
                              <span
                                className={`truncate text-sm font-medium ${
                                  routeActive ? 'text-gray-900' : 'text-gray-800'
                                }`}
                              >
                                {project.name}
                              </span>
                            </button>
                            <span
                              className="inline-flex shrink-0 rounded-md border border-gray-200/90 bg-white p-1 shadow-sm"
                              title={`${health.label} · ${project.progress ?? 0}% complete`}
                            >
                              <BarChart3
                                className={`h-3.5 w-3.5 ${health.icon}`}
                                strokeWidth={2.5}
                              />
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedProjectId((id) =>
                                  id === project.id ? null : project.id
                                )
                              }}
                              className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/80 hover:text-gray-600"
                              aria-expanded={isOpen}
                              aria-label={
                                isOpen ? 'Collapse project details' : 'Expand project details'
                              }
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${
                                  isOpen ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                          </div>
                          {isOpen && (
                            <div className="border-t border-gray-100 bg-gray-50/80 px-3 py-2 pl-[3.25rem] text-[11px] leading-relaxed text-gray-600">
                              <span className="font-medium text-gray-700">{project.status}</span>
                              <span className="mx-1.5 text-gray-300">·</span>
                              <span>{project.progress ?? 0}% done</span>
                              {(project.totalTasks ?? 0) > 0 && (
                                <>
                                  <span className="mx-1.5 text-gray-300">·</span>
                                  <span>
                                    {project.completedTasks ?? 0}/{project.totalTasks} tasks
                                  </span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {projects.length > 4 && (
                      <div className="px-1 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAllProjects(!showAllProjects)}
                          className="flex w-full items-center justify-between rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-3 py-2 text-[11px] font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800"
                        >
                          <span>{showAllProjects ? 'Show less' : 'Load more'}</span>
                          {showAllProjects ? (
                            <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    )}
                    <div className="px-1 pb-1 pt-1">
                      <Link
                        href="/projects"
                        className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-[11px] font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                      >
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-gray-500" />
                        <span>All projects</span>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-gray-400" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tools — CRM-style panel + links */}
        {!collapsed && (
          <div className="px-3 pt-2 pb-2">
            {sectionRule('Tools')}
            <div className="rounded-xl border border-gray-300 bg-white shadow-md overflow-hidden ring-1 ring-black/[0.04]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
                <Target className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                <span>Workspace tools</span>
              </div>
              <div className="p-2 space-y-0.5">
                {visiblePmTools.map((item, index) => {
                  const Icon = item.icon
                  const active = isPmToolActive(item)
                  return (
                    <Link
                      key={index}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors group/item ${
                        active
                          ? 'bg-gray-50 text-gray-900 font-semibold'
                          : 'text-gray-800 font-medium hover:bg-gray-50'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${active ? 'text-gray-700' : 'text-gray-500'}`}
                      />
                      <span className="flex-1">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover/item:opacity-100" />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

      </div>
      <div className="shrink-0 border-t border-white/20 bg-white/90 backdrop-blur-sm">
        <SidebarTrialUpsell
          collapsed={collapsed}
          daysRemaining={trialDaysRemaining}
          upgradeHref="/coming-soon?feature=upgrade"
        />
      </div>
    </div>
  )
}
