'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { Card, Avatar, LoadingSpinner } from '@webfudge/ui'
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
  Search,
  FileText,
  Calendar,
  Settings,
  Target,
} from 'lucide-react'
import projectService from '../lib/api/projectService'
import { transformProject } from '../lib/api/dataTransformers'

export default function PMSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()

  const [quickActionsOpen, setQuickActionsOpen] = useState(false)
  const [toolsCollapsed, setToolsCollapsed] = useState(true)
  const [projects, setProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showAllProjects, setShowAllProjects] = useState(false)

  const quickActionsRef = useRef(null)

  const isActive = (href) => {
    if (!href || href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  const toggleQuickActions = () => {
    setQuickActionsOpen(!quickActionsOpen)
  }

  const quickActionItems = [
    {
      label: 'New Task',
      icon: CheckSquare,
      href: '/my-tasks?action=new',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
    },
    {
      label: 'New Project',
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
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [quickActionsOpen])

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true)
        const response = await projectService.getAllProjects({ pageSize: 20, sort: 'updatedAt:desc' })
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

  const mainNavigationItems = useMemo(
    () => [
      { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard },
      { id: 'my-tasks', label: 'My Tasks', href: '/my-tasks', icon: CheckSquare },
      { id: 'inbox', label: 'Inbox', href: '/inbox', icon: Inbox },
      { id: 'message', label: 'Message', href: '/message', icon: MessageCircle },
    ],
    []
  )

  const pmTools = [
    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { label: 'Documents', icon: FileText, href: '/coming-soon?feature=documents' },
    { label: 'Calendar', icon: Calendar, href: '/coming-soon?feature=calendar' },
    { label: 'Settings', icon: Settings, href: '/coming-soon?feature=settings' },
  ]

  const displayedProjects = useMemo(() => {
    if (loadingProjects) return []
    return showAllProjects ? projects : projects.slice(0, 6)
  }, [projects, showAllProjects, loadingProjects])

  const getProjectColor = (project) => {
    const colors = [
      'bg-orange-500',
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-yellow-500',
      'bg-indigo-500',
      'bg-teal-500',
    ]
    const idx = (project?.name?.charCodeAt(0) || 0) % colors.length
    return colors[idx]
  }

  const projectsSectionActive = pathname.startsWith('/projects')

  return (
    <div
      className={`${
        collapsed ? 'w-16' : 'w-64'
      } h-full bg-white backdrop-blur-xl border-r border-white/30 flex flex-col shadow-xl overflow-y-auto transition-[width] duration-300 flex-shrink-0`}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/20">
        <div className="flex items-center justify-between mb-4">
          {!collapsed && (
            <span className="font-bold text-xl text-brand-foreground">Webfudge PM</span>
          )}
          <button onClick={onToggle} className="p-2 rounded-lg hover:bg-gray-50 transition-colors">
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
              quickActionsOpen ? 'border-orange-300/60' : 'border-white/30 hover:border-orange-200/50'
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
                      <span className="font-medium text-gray-900 flex-1 text-left">{item.label}</span>
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
          {mainNavigationItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${
                  active
                    ? 'bg-brand-primary text-white border border-brand-primary/50'
                    : 'bg-white/20 backdrop-blur-md border border-white/30 text-brand-foreground hover:bg-white/30 hover:border-white/40'
                }
                      rounded-xl p-4 flex flex-col items-center gap-3 transition-[background-color,border-color,color] duration-300 shadow-lg group`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
                {!collapsed && <span className="text-xs font-medium text-center">{item.label}</span>}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Projects */}
      {!collapsed && (
        <div className="flex-1">
          <div className="px-3 mb-2">
            <div
              className={`rounded-xl p-2.5 shadow-lg transition-all duration-200 backdrop-blur-md ${
                projectsSectionActive
                  ? 'bg-orange-50/90 border border-orange-200'
                  : 'bg-white/10 border border-white/30'
              }`}
            >
              <div className="flex items-center justify-between text-sm font-medium text-brand-foreground mb-2">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5" />
                  Projects
                </span>
                <button
                  type="button"
                  onClick={() => router.push('/projects/add')}
                  className="w-5 h-5 bg-white/20 backdrop-blur-md rounded-lg flex items-center justify-center hover:bg-white/30 transition-all duration-200 group shadow-sm border border-white/20"
                  title="New Project"
                >
                  <Plus className="w-3 h-3 text-gray-600 group-hover:text-gray-900 transition-colors" />
                </button>
              </div>

              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {loadingProjects ? (
                  <div className="flex items-center justify-center py-2">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-4 text-xs text-brand-text-light">No projects yet</div>
                ) : (
                  <>
                    {displayedProjects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => router.push(`/projects/${project.slug || project.id}`)}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg text-xs transition-all duration-200 text-left border ${
                          pathname.startsWith(`/projects/${project.slug || project.id}`)
                            ? 'bg-white/40 border-orange-200/80 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-100/80 border-transparent'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 shadow-sm text-white text-[10px] font-bold ${getProjectColor(project)}`}
                        >
                          {(project.name || 'P').charAt(0).toUpperCase()}
                        </span>
                        <span className="font-medium truncate flex-1">{project.name}</span>
                      </button>
                    ))}
                    {projects.length > 6 && (
                      <button
                        type="button"
                        onClick={() => setShowAllProjects(!showAllProjects)}
                        className="w-full text-left px-2 py-1 text-[11px] text-brand-primary hover:underline"
                      >
                        {showAllProjects ? 'Show less' : 'Show all'}
                      </button>
                    )}
                    <Link
                      href="/projects"
                      className="flex items-center gap-2 p-2 rounded-lg text-[11px] text-brand-text-light hover:bg-gray-100/80 transition-colors border border-dashed border-white/40"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span className="font-medium">All projects</span>
                      <ChevronRight className="w-3 h-3 ml-auto opacity-70" />
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tools */}
      {!collapsed && (
        <div className="flex-1">
          <div className="px-4 mb-4">
            <Card variant="glass" padding={true} className="p-4">
              <button
                type="button"
                onClick={() => setToolsCollapsed(!toolsCollapsed)}
                className="flex items-center justify-between w-full text-sm font-medium text-brand-foreground mb-3 hover:opacity-80 transition-opacity"
              >
                <span className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Tools
                </span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${toolsCollapsed ? '' : 'rotate-180'}`}
                />
              </button>

              {!toolsCollapsed && (
                <div className="space-y-2">
                  {pmTools.map((item, index) => {
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

      {/* Collapsed: compact tool icons */}
      {collapsed && (
        <div className="px-2 pb-2 flex flex-col gap-2">
          {pmTools.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex justify-center p-2 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 text-brand-text-light shadow-md hover:bg-white/20 transition-colors"
              title={item.label}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          ))}
        </div>
      )}

      <div className="mt-auto">
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
                <button type="button" className="text-brand-text-light">
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
