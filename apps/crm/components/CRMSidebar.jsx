'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarTrialUpsell, LoadingSpinner } from '@webfudge/ui'
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Briefcase,
  Building2,
  UserCheck,
  FileText,
  Receipt,
  Phone,
  CheckSquare,
  BarChart3,
  Calendar,
  GitBranch,
  MessageSquare,
  FolderOpen,
  FileStack,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Plus,
  DollarSign,
  Pencil,
  Trash2,
  Activity,
  MessageCircle,
  CalendarDays,
} from 'lucide-react'
import SubSidebar from './SubSidebar'
import { fetchGlobalActivityFeed } from '../lib/api/crmActivityService'

function formatRelativeTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return ''
  const now = Date.now()
  const diffMs = now - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHour < 24) return `${diffHour}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function activityDetailHref(row) {
  const st = String(row?.subjectType || '').toLowerCase()
  const id = row?.subjectId
  if (id == null || id === '') return null
  if (st === 'contact') return `/sales/contacts/${id}`
  if (st === 'lead_company') return `/sales/lead-companies/${id}`
  if (st === 'deal') return `/sales/deals/${id}`
  return null
}

function activityIconFor(row) {
  const action = String(row?.action || '').toLowerCase()
  if (action === 'comment') return MessageSquare
  if (action === 'create') return Plus
  if (action === 'update') return Pencil
  if (action === 'delete') return Trash2
  return Activity
}

const comingSoonHref = (feature) => `/coming-soon?feature=${encodeURIComponent(feature)}`

const SIDEBAR_ACTIVITY_LIMIT = 10

export default function CRMSidebar({ collapsed = false, onToggle }) {
  const [subSidebarOpen, setSubSidebarOpen] = useState(false)
  const [currentSection, setCurrentSection] = useState(null)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [feedItems, setFeedItems] = useState([])
  const [loadingFeed, setLoadingFeed] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const quickActionsRef = useRef(null)

  const trialDaysRemaining = (() => {
    const n = Number(process.env.NEXT_PUBLIC_TRIAL_DAYS_REMAINING)
    return Number.isFinite(n) ? n : 12
  })()

  const isActive = (href) => {
    if (!href || href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const isSalesActive = () => pathname.startsWith('/sales/')
  /** Proposals / tasks live under /clients/* URLs but belong to Workspace in the nav. */
  const isWorkspaceClientRoute = () =>
    pathname.startsWith('/clients/proposals') || pathname.startsWith('/clients/tasks')
  const isWorkspaceActive = () =>
    pathname.startsWith('/workspace') ||
    pathname.startsWith('/calendar') ||
    pathname.startsWith('/meetings') ||
    pathname.startsWith('/threads') ||
    pathname.startsWith('/activities') ||
    isWorkspaceClientRoute()
  const isClientsActive = () => pathname.startsWith('/clients/') && !isWorkspaceClientRoute()
  const isAnalyticsActive = () => pathname.startsWith('/analytics')

  const handleTopLevelClick = (sectionId) => {
    setCurrentSection(sectionId)
    setSubSidebarOpen(true)
  }

  const closeSubSidebar = () => {
    setSubSidebarOpen(false)
    setCurrentSection(null)
  }

  const handleNavigate = () => {
    closeSubSidebar()
  }

  const toggleQuickActions = () => setQuickActionsOpen((o) => !o)

  const quickActionItems = [
    {
      label: 'Add Lead',
      icon: Users,
      href: '/sales/lead-companies/new',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      label: 'Log Call',
      icon: Phone,
      href: comingSoonHref('Log Call'),
      color: 'text-sky-600',
      bgColor: 'bg-sky-50',
      borderColor: 'border-sky-200',
    },
    {
      label: 'Send WhatsApp',
      icon: MessageCircle,
      href: comingSoonHref('Send WhatsApp'),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
    },
    {
      label: 'Create Proposal',
      icon: FileText,
      href: '/clients/proposals',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
    },
    {
      label: 'Schedule Meeting',
      icon: Calendar,
      href: '/meetings/new',
      color: 'text-violet-600',
      bgColor: 'bg-violet-50',
      borderColor: 'border-violet-200',
    },
    {
      label: 'Add Task',
      icon: CheckSquare,
      href: '/clients/tasks',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
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

  const loadFeed = useCallback(async () => {
    try {
      setLoadingFeed(true)
      const { data } = await fetchGlobalActivityFeed({ limit: SIDEBAR_ACTIVITY_LIMIT })
      setFeedItems(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error('Sidebar activity feed:', e)
      setFeedItems([])
    } finally {
      setLoadingFeed(false)
    }
  }, [])

  useEffect(() => {
    loadFeed()
    const interval = setInterval(loadFeed, 30000)
    return () => clearInterval(interval)
  }, [loadFeed])

  const onActivityClick = (row) => {
    const href = activityDetailHref(row)
    if (href) router.push(href)
  }

  const mainNavigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/',
      hasSubNav: false,
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: DollarSign,
      hasSubNav: true,
    },
    {
      id: 'workspace',
      label: 'Workspace',
      icon: FolderKanban,
      hasSubNav: true,
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: Building2,
      hasSubNav: true,
    },
  ]

  const navigationData = [
    {
      id: 'sales',
      label: 'Sales',
      children: [
        {
          id: 'lead-companies',
          label: 'Lead Companies',
          icon: Users,
          href: '/sales/lead-companies',
        },
        {
          id: 'contacts',
          label: 'Contacts',
          icon: UserCheck,
          href: '/sales/contacts',
        },
        {
          id: 'opportunities',
          label: 'Deals',
          icon: Briefcase,
          href: '/sales/deals',
        },
        {
          id: 'pipeline',
          label: 'Pipeline Board',
          icon: BarChart3,
          href: '/sales/deals/pipeline',
        },
      ],
    },
    {
      id: 'workspace',
      label: 'Workspace',
      children: [
        {
          id: 'threads',
          label: 'Threads',
          icon: MessageSquare,
          href: '/threads',
        },
        {
          id: 'activity-log',
          label: 'Activity log',
          icon: Activity,
          href: '/activities',
        },
        {
          id: 'proposals',
          label: 'Proposals',
          icon: FileText,
          href: '/clients/proposals',
        },
        {
          id: 'tasks',
          label: 'Tasks',
          icon: CheckSquare,
          href: '/clients/tasks',
        },
        {
          id: 'meetings',
          label: 'Meetings',
          icon: Calendar,
          href: '/meetings',
        },
        {
          id: 'calendar',
          label: 'Calendar',
          icon: CalendarDays,
          href: '/calendar',
        },
        {
          id: 'documents',
          label: 'Documents',
          icon: FileStack,
          href: comingSoonHref('Documents'),
        },
      ],
    },
    {
      id: 'clients',
      label: 'Clients',
      children: [
        {
          id: 'client-accounts',
          label: 'Client Accounts',
          icon: Building2,
          href: '/clients/accounts',
        },
        {
          id: 'invoices',
          label: 'Invoices',
          icon: Receipt,
          href: '/clients/invoices',
        },
        {
          id: 'projects',
          label: 'Projects',
          icon: FolderOpen,
          href: '/clients/projects',
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      children: [
        {
          id: 'analytics-home',
          label: 'Overview',
          icon: BarChart3,
          href: '/analytics',
        },
        {
          id: 'reports',
          label: 'Reports & Forecasts',
          icon: BarChart3,
          href: comingSoonHref('Analytics'),
        },
      ],
    },
  ]

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
    <>
      <div
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } h-full min-h-0 bg-white backdrop-blur-xl border-r border-white/30 flex flex-col shadow-xl overflow-hidden transition-[width] duration-300 flex-shrink-0`}
      >
        <div className="shrink-0 p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            {!collapsed && (
              <span className="font-bold text-xl text-brand-foreground">Webfudge CRM</span>
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

          {/* Quick Actions — directly under header */}
          <div className="relative mt-3" ref={quickActionsRef}>
            <button
              type="button"
              onClick={toggleQuickActions}
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
                  <span className="text-sm font-semibold text-gray-800 truncate">
                    Quick Actions
                  </span>
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
                  {quickActionItems.map((item, index) => {
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

        {/* Scrollable main column */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {/* Navigation */}
          <div className="px-3 pt-3 pb-2">
            {sectionRule('Navigate')}
            <div className={`grid gap-3 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {mainNavigationItems.map((item) => {
                const Icon = item.icon
                const sectionActive =
                  (item.id === 'sales' && isSalesActive()) ||
                  (item.id === 'workspace' && isWorkspaceActive()) ||
                  (item.id === 'clients' && isClientsActive())
                const linkActive = item.href ? isActive(item.href) : false

                if (item.hasSubNav) {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleTopLevelClick(item.id)}
                      className={`rounded-2xl px-2 py-4 sm:py-5 flex flex-col items-center justify-center gap-2 min-h-[5.25rem] transition-all shadow-md border ${
                        sectionActive
                          ? 'bg-gradient-to-br from-amber-400/35 to-amber-500/20 border-amber-300/50 text-amber-950'
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
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={`rounded-2xl px-2 py-4 sm:py-5 flex flex-col items-center justify-center gap-2 min-h-[5.25rem] transition-all shadow-md border ${
                      linkActive
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

          {!collapsed && (
            <div className="px-3 pt-2 pb-2">
              <Link
                href="/automations"
                className={`w-full rounded-2xl px-4 py-4 flex items-center justify-center gap-2.5 text-base font-semibold shadow-md border transition-colors ${
                  pathname.startsWith('/automations')
                    ? 'bg-gradient-to-br from-amber-400/35 to-amber-500/20 border-amber-300/50 text-amber-950'
                    : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-foreground hover:bg-white/30'
                }`}
              >
                <GitBranch className="w-5 h-5" />
                Automation
              </Link>
            </div>
          )}

          {/* Activity feed — match list-table chrome (lead companies / contacts): border + shadow-md */}
          {!collapsed && (
            <div className="px-3 py-2 relative z-0">
              {sectionRule('Activity')}
              <div className="rounded-xl border border-gray-300 bg-white shadow-md overflow-hidden relative z-0 ring-1 ring-black/[0.04]">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <Activity className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                    <span className="truncate">Latest activity</span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <Link
                      href="/activities"
                      className="text-[10px] font-medium text-brand-primary hover:underline"
                    >
                      Full log
                    </Link>
                    <button
                      type="button"
                      onClick={() => loadFeed()}
                      className="text-[10px] text-gray-500 hover:text-gray-800"
                    >
                      Refresh
                    </button>
                  </span>
                </div>
                <div className="max-h-72 overflow-y-auto overscroll-contain divide-y divide-gray-100">
                  {loadingFeed ? (
                    <div className="flex justify-center py-6">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : feedItems.length === 0 ? (
                    <p className="text-center py-6 px-3 text-[11px] text-gray-500">
                      No activity yet
                    </p>
                  ) : (
                    feedItems.slice(0, SIDEBAR_ACTIVITY_LIMIT).map((row) => {
                      const AIcon = activityIconFor(row)
                      const href = activityDetailHref(row)
                      const summary = String(row.summary || 'Activity').trim() || 'Activity'
                      const ts = formatRelativeTime(row.createdAt)
                      return (
                        <button
                          key={row.id}
                          type="button"
                          disabled={!href}
                          onClick={() => onActivityClick(row)}
                          className={`w-full flex items-start gap-2.5 px-3 py-2.5 text-left text-[11px] transition-colors ${
                            href
                              ? 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                              : 'text-gray-500 cursor-default'
                          }`}
                        >
                          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <AIcon className="w-3.5 h-3.5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 line-clamp-2 leading-snug">
                              {summary}
                            </div>
                            {ts && <div className="text-[10px] text-gray-500 mt-0.5">{ts}</div>}
                          </div>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* System + profile scroll with the rest (not pinned to viewport bottom) */}
          {!collapsed && (
            <div className="px-3 pt-2 pb-2 space-y-2">
              <div className="flex items-center gap-2 px-1">
                <div className="flex-1 h-px bg-white/25" />
                <span className="text-[10px] uppercase tracking-wider text-brand-text-light font-semibold">
                  System
                </span>
                <div className="flex-1 h-px bg-white/25" />
              </div>
              <button
                type="button"
                onClick={() => handleTopLevelClick('analytics')}
                className={`w-full rounded-xl p-3 flex flex-col items-center gap-2 shadow-md border transition-colors ${
                  isAnalyticsActive()
                    ? 'bg-gradient-to-br from-amber-400/35 to-amber-500/20 border-amber-300/50 text-amber-950'
                    : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-text-light hover:bg-white/30'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs font-medium text-center">Analytics</span>
              </button>
            </div>
          )}

          {collapsed && (
            <div className="px-2 py-2 flex justify-center">
              <button
                type="button"
                onClick={() => handleTopLevelClick('analytics')}
                className={`p-3 rounded-xl border shadow-md ${
                  isAnalyticsActive()
                    ? 'bg-amber-400/30 border-amber-300/50'
                    : 'bg-white/20 border-white/30'
                }`}
                title="Analytics"
              >
                <BarChart3 className="w-5 h-5 text-brand-foreground" />
              </button>
            </div>
          )}

          <SidebarTrialUpsell
            collapsed={collapsed}
            daysRemaining={trialDaysRemaining}
            upgradeHref="/coming-soon?feature=upgrade"
          />
        </div>
      </div>

      <SubSidebar
        isOpen={subSidebarOpen}
        onClose={closeSubSidebar}
        currentSection={currentSection}
        navigationData={navigationData}
        onNavigate={handleNavigate}
      />
    </>
  )
}
