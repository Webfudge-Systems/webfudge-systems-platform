'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { Card, Avatar, LoadingSpinner } from '@webfudge/ui'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Building2,
  UserCheck,
  FileText,
  Receipt,
  Mail,
  Phone,
  CheckSquare,
  FolderOpen,
  HeadphonesIcon,
  BarChart3,
  Settings,
  Calendar,
  Target,
  DollarSign,
  MessageSquare,
  GitBranch,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
} from 'lucide-react'
import SubSidebar from './SubSidebar'

export default function CRMSidebar({ collapsed = false, onToggle }) {
  const [subSidebarOpen, setSubSidebarOpen] = useState(false)
  const [currentSection, setCurrentSection] = useState(null)
  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [toolsCollapsed, setToolsCollapsed] = useState(true)
  const [threads, setThreads] = useState([])
  const [loadingThreads, setLoadingThreads] = useState(true)

  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const quickActionsRef = useRef(null)

  const isActive = (href) => {
    if (!href || href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const isSalesActive = () => {
    return pathname.startsWith('/sales/')
  }

  const isDeliveryActive = () => {
    return pathname.startsWith('/delivery/')
  }

  const isClientPortalActive = () => {
    return (
      pathname.startsWith('/clients/accounts') ||
      pathname.startsWith('/clients/proposals') ||
      pathname.startsWith('/clients/invoices')
    )
  }

  const handleTopLevelClick = (sectionId, sectionLabel) => {
    setCurrentSection(sectionId)
    setSubSidebarOpen(true)
  }

  const closeSubSidebar = () => {
    setSubSidebarOpen(false)
    setCurrentSection(null)
  }

  const handleNavigate = (href) => {
    closeSubSidebar()
  }

  const toggleQuickActions = () => {
    setQuickActionsOpen(!quickActionsOpen)
  }

  // Quick action items
  const quickActionItems = [
    {
      label: 'Add Lead Company',
      icon: Users,
      href: '/sales/lead-companies/new',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
    },
    {
      label: 'Add Deal',
      icon: Briefcase,
      href: '/sales/deals/new',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
    {
      label: 'Add Contact',
      icon: UserCheck,
      href: '/sales/contacts/new',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
    },
    {
      label: 'Add Task',
      icon: CheckSquare,
      href: '/delivery/tasks/new',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
  ]

  // Handle quick action navigation
  const handleQuickActionClick = (href) => {
    setQuickActionsOpen(false)
    router.push(href)
  }

  // Close quick actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target)) {
        setQuickActionsOpen(false)
      }
    }

    if (quickActionsOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [quickActionsOpen])

  // Mock threads data - replace with actual API call
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoadingThreads(true)
        // TODO: Implement actual API call to fetch threads/conversations
        setThreads([])
      } catch (error) {
        console.error('Error fetching conversations for sidebar:', error)
        setThreads([])
      } finally {
        setLoadingThreads(false)
      }
    }

    fetchConversations()

    // Refresh conversations every 30 seconds
    const interval = setInterval(fetchConversations, 30000)
    return () => clearInterval(interval)
  }, [])

  const handleThreadNavigation = (thread) => {
    router.push(`/threads?thread=${thread.id}`)
  }

  const mainNavigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '/',
      hasSubNav: false,
      priority: 'high',
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: DollarSign,
      hasSubNav: true,
      href: undefined,
      priority: 'high',
    },
    {
      id: 'delivery',
      label: 'Delivery',
      icon: FolderOpen,
      hasSubNav: true,
      href: undefined,
      priority: 'high',
    },
    {
      id: 'client-portal',
      label: 'Client Portal',
      icon: UserCheck,
      hasSubNav: true,
      href: undefined,
      priority: 'high',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      hasSubNav: true,
      href: undefined,
      priority: 'low',
    },
  ]

  const crmTools = [
    {
      label: 'Priority / Automation Rules',
      icon: Target,
      href: '/coming-soon?feature=Priority / Automation Rules',
    },
    { label: 'Documents', icon: FileText, href: '/coming-soon?feature=Documents' },
    {
      label: 'Invoices & Payments',
      icon: Receipt,
      href: '/coming-soon?feature=Invoices & Payments',
    },
    {
      label: 'Meetings & Calls',
      icon: Phone,
      href: '/coming-soon?feature=Meetings & Calls',
    },
    { label: 'Calendar', icon: Calendar, href: '/coming-soon?feature=Calendar' },
    {
      label: 'Integrations',
      icon: GitBranch,
      href: '/coming-soon?feature=Integrations',
    },
  ]

  // Navigation data for sub-sidebar
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
          children: [
            {
              id: 'lead-companies-list',
              label: 'All Leads',
              href: '/sales/lead-companies',
            },
            {
              id: 'lead-company-detail',
              label: 'Lead Company Detail',
              href: '/sales/lead-companies/[id]',
            },
          ],
        },
        {
          id: 'contacts',
          label: 'Contacts',
          icon: UserCheck,
          href: '/sales/contacts',
          children: [
            {
              id: 'contacts-list',
              label: 'Contacts List',
              href: '/sales/contacts',
            },
            {
              id: 'contact-detail',
              label: 'Contact Detail',
              href: '/sales/contacts/[id]',
            },
          ],
        },
        {
          id: 'opportunities',
          label: 'Opportunities / Deals',
          icon: Briefcase,
          href: '/sales/deals',
          children: [
            {
              id: 'pipeline-board',
              label: 'Pipeline Board',
              href: '/sales/deals/pipeline',
            },
            { id: 'deals-list', label: 'Deals List', href: '/sales/deals' },
            {
              id: 'deal-detail',
              label: 'Deal Detail',
              href: '/sales/deals/[id]',
            },
          ],
        },
        {
          id: 'accounts',
          label: 'Accounts',
          icon: Building2,
          href: '/sales/accounts',
        },
      ],
    },
    {
      id: 'delivery',
      label: 'Delivery',
      children: [
        {
          id: 'tasks',
          label: 'Tasks',
          icon: CheckSquare,
          href: '/delivery/tasks',
          children: [
            {
              id: 'my-tasks',
              label: 'My Tasks',
              href: '/delivery/tasks',
            },
          ],
        },
        {
          id: 'projects',
          label: 'Projects',
          icon: FolderOpen,
          href: '/delivery/projects',
          children: [
            {
              id: 'all-projects',
              label: 'All Projects',
              href: '/delivery/projects',
            },
            {
              id: 'project-board',
              label: 'Project Board',
              href: '/delivery/projects/board',
            },
          ],
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      children: [
        {
          id: 'reports',
          label: 'Reports & Forecasts',
          icon: BarChart3,
          href: '/coming-soon?feature=Analytics',
        },
      ],
    },
    {
      id: 'client-portal',
      label: 'Client Portal',
      children: [
        {
          id: 'accounts',
          label: 'Client Accounts',
          icon: Building2,
          href: '/clients/accounts',
          children: [
            {
              id: 'accounts-list',
              label: 'All Clients',
              href: '/clients/accounts',
            },
            {
              id: 'account-detail',
              label: 'Client Detail',
              href: '/clients/accounts/[id]',
            },
          ],
        },
        {
          id: 'client-proposals',
          label: 'Proposals',
          icon: FileText,
          href: '/clients/proposals',
        },
        {
          id: 'client-invoices',
          label: 'Invoices',
          icon: Receipt,
          href: '/clients/invoices',
        },
      ],
    },
  ]

  return (
    <>
      <div
        className={`${
          collapsed ? 'w-16' : 'w-64'
        } h-full bg-white backdrop-blur-xl border-r border-white/30 flex flex-col shadow-xl overflow-y-auto transition-[width] duration-300 flex-shrink-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between mb-4">
            {!collapsed && (
              <span className="font-bold text-xl text-brand-foreground">Webfudge CRM</span>
            )}
            <button
              onClick={onToggle}
              className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {collapsed ? (
                <ChevronRight className="w-5 h-5 text-brand-foreground" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-brand-foreground" />
              )}
            </button>
          </div>

          {/* Search Bar */}
          {!collapsed && (
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-light" />
              <input
                type="text"
                placeholder="Search here..."
                className="w-full pl-10 pr-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary focus:bg-white/25 transition-[background-color,border-color,box-shadow] duration-300 text-sm placeholder:text-brand-text-light shadow-lg"
              />
            </div>
          )}

          {/* Quick Actions Button */}
          <div className="relative" ref={quickActionsRef}>
            <button
              onClick={toggleQuickActions}
              className={`w-full bg-gradient-to-r from-orange-500/20 to-orange-600/10 backdrop-blur-md border ${
                quickActionsOpen
                  ? 'border-orange-300/60'
                  : 'border-white/30 hover:border-orange-200/50'
              } text-brand-foreground rounded-xl py-3 px-4 flex items-center ${
                collapsed ? 'justify-center' : 'justify-between gap-2'
              } shadow-lg hover:shadow-xl transition-all duration-300 group`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300">
                  <Plus className="w-4 h-4 text-white" />
                </div>
                {!collapsed && (
                  <span className="text-sm font-semibold text-gray-800">Quick Actions</span>
                )}
              </div>
              {!collapsed && (
                <ChevronDown
                  className={`w-4 h-4 text-gray-600 transition-transform duration-300 ${
                    quickActionsOpen ? 'rotate-180' : ''
                  }`}
                />
              )}
            </button>

            {/* Quick Actions Dropdown */}
            {quickActionsOpen && !collapsed && (
              <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
                <div className="p-2">
                  <div className="px-3 py-2 mb-1 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Quick Create
                    </p>
                  </div>
                  {quickActionItems.map((item, index) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={index}
                        onClick={() => handleQuickActionClick(item.href)}
                        className="w-full flex items-center gap-3 p-3.5 text-sm text-gray-800 rounded-xl hover:bg-gray-50 transition-all duration-200 group/item"
                      >
                        <div
                          className={`w-10 h-10 ${item.bgColor} ${item.borderColor} border rounded-xl flex items-center justify-center shadow-sm group-hover/item:scale-110 group-hover/item:shadow-md transition-all duration-200`}
                        >
                          <Icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <span className="font-medium text-gray-900 flex-1 text-left">
                          {item.label}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-400 opacity-0 group-hover/item:opacity-100 transition-opacity duration-200" />
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Navigation Grid */}
        <div className="p-4 space-y-4">
          <div className={`grid gap-3 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {mainNavigationItems
              .filter((item) => item.priority === 'high')
              .map((item) => {
                const Icon = item.icon
                const active = item.href ? isActive(item.href) : false
                const isSalesSection = item.id === 'sales' && isSalesActive()
                const isDeliverySection = item.id === 'delivery' && isDeliveryActive()
                const isClientPortalSection = item.id === 'client-portal' && isClientPortalActive()

                if (item.hasSubNav) {
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTopLevelClick(item.id, item.label)}
                      className={`${
                        isSalesSection || isDeliverySection || isClientPortalSection
                          ? 'bg-gradient-to-br from-yellow-400/30 to-yellow-500/20 border-yellow-300/50 text-yellow-800'
                          : 'bg-white/20 backdrop-blur-md border border-white/30 text-brand-foreground hover:bg-white/30 hover:border-white/40'
                      } rounded-xl p-4 flex flex-col items-center gap-3 transition-[background-color,border-color] duration-300 shadow-lg group`}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                      {!collapsed && (
                        <span className="text-xs font-medium text-center">{item.label}</span>
                      )}
                    </button>
                  )
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href || '/'}
                    className={`${
                      active
                        ? 'bg-brand-primary text-white border-brand-primary/50'
                        : 'bg-white/20 backdrop-blur-md border border-white/30 text-brand-foreground hover:bg-white/30 hover:border-white/40'
                    } 
                      rounded-xl p-4 flex flex-col items-center gap-3 transition-[background-color,border-color,color] duration-300 shadow-lg group`}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                    {!collapsed && (
                      <span className="text-xs font-medium text-center">{item.label}</span>
                    )}
                  </Link>
                )
              })}
          </div>
        </div>

        {/* Latest Threads Section */}
        {!collapsed && (
          <div className="flex-1">
            <div className="px-3 mb-2">
              <div
                className={`rounded-xl p-2.5 shadow-lg transition-all duration-200 backdrop-blur-md ${
                  pathname.startsWith('/threads')
                    ? 'bg-orange-50/90 border border-orange-200'
                    : 'bg-white/10 border border-white/30'
                }`}
              >
                <div className="flex items-center justify-between text-sm font-medium text-brand-foreground mb-2">
                  <span className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    Latest Conversations
                  </span>
                  <Link
                    href="/threads"
                    className="w-5 h-5 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 group shadow-sm border border-white/20"
                    title="View All Threads"
                  >
                    <ChevronRight className="w-2.5 h-2.5 text-gray-600 group-hover:text-gray-900 transition-colors" />
                  </Link>
                </div>

                <div className="space-y-1.5 max-h-80 overflow-y-auto">
                  {loadingThreads ? (
                    <div className="flex items-center justify-center py-2">
                      <LoadingSpinner size="sm" />
                    </div>
                  ) : threads.length === 0 ? (
                    <div className="text-center py-4 text-xs text-brand-text-light">
                      No conversations yet
                    </div>
                  ) : (
                    threads.map((thread) => (
                      <button
                        key={thread.id}
                        onClick={() => handleThreadNavigation(thread)}
                        className="w-full flex items-start gap-2 p-2 rounded-lg text-xs transition-all duration-200 relative text-gray-600 hover:bg-gray-100/80 border border-transparent"
                      >
                        <div className="w-5 h-5 bg-gradient-to-br from-gray-400 to-gray-600 rounded flex items-center justify-center flex-shrink-0 shadow-sm mt-0.5">
                          <Building2 className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="font-medium truncate mb-0.5 text-gray-900">
                            {thread.title}
                          </div>
                          <div className="line-clamp-2 text-[11px] leading-tight text-gray-500">
                            {thread.message}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CRM Tools Section */}
        {!collapsed && (
          <div className="flex-1">
            <div className="px-4 mb-4">
              <Card variant="glass" padding={true} className="p-4">
                <button
                  onClick={() => setToolsCollapsed(!toolsCollapsed)}
                  className="flex items-center justify-between w-full text-sm font-medium text-brand-foreground mb-3 hover:opacity-80 transition-opacity"
                >
                  <span className="flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Tools
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${
                      toolsCollapsed ? '' : 'rotate-180'
                    }`}
                  />
                </button>

                {!toolsCollapsed && (
                  <div className="space-y-2">
                    {crmTools.map((item, index) => {
                      const Icon = item.icon
                      return (
                        <Link
                          key={index}
                          href={item.href}
                          className="flex items-center gap-3 text-xs text-brand-text-light p-2 rounded-lg hover:bg-white/20 transition-colors"
                        >
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{item.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>
        )}

        {/* System Navigation - Bottom Section */}
        <div className="mt-auto">
          <div className="px-4 mb-4">
            {!collapsed && (
              <div className="flex items-center gap-4 px-2 mb-4">
                <div className="flex-1 h-px bg-white/20"></div>
                <span className="text-xs text-brand-text-light font-medium">System</span>
                <div className="flex-1 h-px bg-white/20"></div>
              </div>
            )}

            <div className="flex flex-col gap-3">
              {mainNavigationItems
                .filter((item) => item.priority === 'low')
                .map((item) => {
                  const Icon = item.icon

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleTopLevelClick(item.id, item.label)}
                      className="w-full bg-white/15 backdrop-blur-md border border-white/25 text-brand-text-light rounded-xl p-3 flex flex-col items-center gap-2 shadow-md hover:bg-white/20 transition-colors"
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon className="w-5 h-5" />
                      {!collapsed && (
                        <span className="text-xs font-medium text-center">{item.label}</span>
                      )}
                    </button>
                  )
                })}
            </div>
          </div>

          {/* Footer - User Profile */}
          <div className="p-4 border-t border-white/20">
            <Card
              variant="glass"
              padding={true}
              className={`flex items-center gap-3 p-3 hover:bg-white/25 transition-colors cursor-pointer ${
                collapsed ? 'justify-center' : ''
              }`}
            >
              <Avatar
                fallback={(() => {
                  if (!user) return 'U'
                  const userData = user.attributes || user
                  const firstName = userData.firstName || userData.name?.split(' ')[0] || ''
                  const lastName = userData.lastName || userData.name?.split(' ')[1] || ''
                  const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase()
                  return initials && initials !== ' '
                    ? initials
                    : userData.email?.charAt(0).toUpperCase() || 'U'
                })()}
                alt={(() => {
                  if (!user) return 'User'
                  const userData = user.attributes || user
                  if (userData.firstName && userData.lastName)
                    return `${userData.firstName} ${userData.lastName}`
                  if (userData.name) return userData.name
                  if (userData.email) return userData.email.split('@')[0]
                  return 'User'
                })()}
                size="sm"
                className="bg-white/30 backdrop-blur-md border border-white/40 shadow-lg text-brand-primary"
              />
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-brand-foreground truncate">
                      {(() => {
                        if (!user) return 'User'
                        const userData = user.attributes || user
                        if (userData.firstName && userData.lastName)
                          return `${userData.firstName} ${userData.lastName}`
                        if (userData.name) return userData.name
                        if (userData.email) return userData.email.split('@')[0]
                        return 'User'
                      })()}
                    </p>
                    <p className="text-xs text-brand-text-light truncate">
                      {(() => {
                        if (!user) return 'User'
                        const userData = user.attributes || user
                        if (userData.primaryRole) {
                          const roleName =
                            typeof userData.primaryRole === 'object'
                              ? userData.primaryRole.name || userData.primaryRole.attributes?.name
                              : userData.primaryRole
                          if (roleName) return roleName
                        }
                        if (
                          userData.userRoles &&
                          Array.isArray(userData.userRoles) &&
                          userData.userRoles.length > 0
                        ) {
                          const firstRole = userData.userRoles[0]
                          const roleName =
                            typeof firstRole === 'object'
                              ? firstRole.name || firstRole.attributes?.name
                              : firstRole
                          if (roleName) return roleName
                        }
                        if (userData.role) {
                          return typeof userData.role === 'object'
                            ? userData.role.name || userData.role.attributes?.name || userData.role
                            : userData.role
                        }
                        return 'User'
                      })()}
                    </p>
                  </div>
                  <button className="text-brand-text-light">
                    <ChevronDown className="w-4 h-4" />
                  </button>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Sub Sidebar */}
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
