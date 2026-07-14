'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { LoadingSpinner, SidebarProductBranding } from '@webfudge/ui'
import {
  LayoutDashboard,
  Flame,
  GitBranch,
  Building2,
  CalendarCheck,
  PanelLeftClose,
  FolderOpen,
  Plus,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  BarChart3,
} from 'lucide-react'
import { canReadRE, canWriteRE, type REModuleKey } from '../lib/rbac'
import { RE_SITE } from '../lib/site'
import { listProjects } from '../lib/api/projectService'
import { type ProjectStatus, type RealEstateProject } from '../lib/types'

interface NavItem {
  id: string
  label: string
  href: string
  icon: typeof LayoutDashboard
  module: REModuleKey
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', icon: LayoutDashboard, module: 'dashboard' },
  { id: 'leads', label: 'Leads', href: '/leads', icon: Flame, module: 'leads' },
  { id: 'pipeline', label: 'Pipeline', href: '/pipeline', icon: GitBranch, module: 'pipeline' },
  { id: 'site-visits', label: 'Site visits', href: '/site-visits', icon: CalendarCheck, module: 'site_visits' },
]

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

const PROJECT_HEALTH: Record<ProjectStatus, { icon: string; label: string }> = {
  active: { icon: 'text-emerald-600', label: 'Active' },
  upcoming: { icon: 'text-sky-600', label: 'Upcoming' },
  sold_out: { icon: 'text-amber-600', label: 'Sold out' },
  archived: { icon: 'text-gray-500', label: 'Archived' },
}

function getProjectAvatarClass(project: RealEstateProject) {
  const key = project?.id ?? project?.name ?? ''
  let n = 0
  if (typeof key === 'number') n = Math.abs(key)
  else {
    const s = String(key)
    for (let i = 0; i < s.length; i += 1) n += s.charCodeAt(i)
  }
  return PROJECT_AVATAR_PALETTE[n % PROJECT_AVATAR_PALETTE.length]
}

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function RealEstateSidebar({
  collapsed = false,
  onToggle,
}: {
  collapsed?: boolean
  onToggle?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const visibleItems = NAV_ITEMS.filter((item) => canReadRE(item.module))

  const canReadProjects = canReadRE('projects')
  const canCreateProjects = canWriteRE('projects')

  const [projects, setProjects] = useState<RealEstateProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showAllProjects, setShowAllProjects] = useState(false)

  useEffect(() => {
    if (!canReadProjects) {
      setLoadingProjects(false)
      return
    }
    let cancelled = false
    setLoadingProjects(true)
    listProjects({ pageSize: 20 })
      .then((res) => {
        if (cancelled) return
        setProjects(res.data)
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false)
      })
    return () => {
      cancelled = true
    }
  }, [canReadProjects])

  const displayedProjects = useMemo(() => {
    if (loadingProjects) return []
    return showAllProjects ? projects.slice(0, 6) : projects.slice(0, 4)
  }, [projects, showAllProjects, loadingProjects])

  const sectionRule = (label: string) =>
    !collapsed && (
      <div className="flex items-center gap-2 px-1 mb-2">
        <div className="flex-1 h-px bg-white/25" />
        <span className="text-[10px] uppercase tracking-wider text-brand-text-light font-semibold">
          {label}
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
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div
          className={`flex gap-2 ${collapsed ? 'flex-col items-center' : 'items-center justify-between'}`}
        >
          {collapsed ? (
            <Link href="/" className="flex shrink-0" aria-label={`${RE_SITE.name} home`}>
              <Image
                src={RE_SITE.logoPath}
                alt={RE_SITE.brandName}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </Link>
          ) : (
            <Link
              href="/"
              className="flex min-w-0 flex-1 items-center gap-2.5"
              aria-label={`${RE_SITE.name} home`}
            >
              <Image
                src={RE_SITE.logoPath}
                alt={RE_SITE.brandName}
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
                priority
              />
              <SidebarProductBranding
                productName={RE_SITE.name}
                companyName={RE_SITE.brandName}
              />
            </Link>
          )}
          <button
            type="button"
            onClick={onToggle}
            className="shrink-0 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Hide sidebar"
          >
            <PanelLeftClose className="w-5 h-5 text-brand-foreground" strokeWidth={1.75} />
          </button>
        </div>
        {!collapsed ? (
          <div
            className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-orange-400/50 to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="px-3 pt-3 pb-2">
          {sectionRule('Navigate')}
          <div className={`grid gap-2.5 ${collapsed ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {visibleItems.map((item) => {
              const Icon = item.icon
              const active = isActive(pathname, item.href)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`relative rounded-xl px-2 py-3.5 flex flex-col items-center justify-center gap-1.5 min-h-[4.5rem] transition-all border shadow-md ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary/40 shadow-lg shadow-orange-500/25'
                      : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-foreground hover:bg-white/35 hover:shadow-lg'
                  }`}
                >
                  <Icon className="w-6 h-6 shrink-0" strokeWidth={2} />
                  {!collapsed && (
                    <span className="text-xs font-semibold text-center leading-snug px-0.5 line-clamp-2">
                      {item.label}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Projects panel — PM-style */}
        {!collapsed && canReadProjects && (
          <div className="px-3 py-2 relative z-0">
            {sectionRule('Projects')}
            <div className="rounded-xl border border-orange-200/80 bg-gradient-to-b from-orange-50/50 via-white to-white shadow-md overflow-hidden ring-1 ring-orange-100/60">
              <div className="flex items-center justify-between border-b border-orange-200/50 bg-gradient-to-r from-orange-500/12 via-orange-50/90 to-transparent px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 ring-1 ring-orange-300/40">
                    <FolderOpen className="h-4 w-4 text-orange-600" strokeWidth={2.25} />
                  </span>
                  <span className="truncate text-xs font-bold tracking-wide text-orange-900">
                    Projects
                  </span>
                </span>
                {canCreateProjects ? (
                  <button
                    type="button"
                    onClick={() => router.push('/projects?new=1')}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm shadow-orange-500/30 transition-colors hover:bg-orange-600"
                    title="New project"
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </button>
                ) : null}
              </div>

              <div className="px-1.5 py-1.5">
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
                  <div className="space-y-0.5">
                    {displayedProjects.map((project) => {
                      const routeActive = pathname.startsWith(`/projects/${project.id}`)
                      const status = (project.status || 'active') as ProjectStatus
                      const health = PROJECT_HEALTH[status] || PROJECT_HEALTH.active
                      return (
                        <div
                          key={project.id}
                          className={`flex items-center gap-1 rounded-lg border-l-[3px] transition-colors ${
                            routeActive
                              ? 'border-l-orange-500 bg-orange-100/70 shadow-sm shadow-orange-500/10'
                              : 'border-l-transparent hover:border-l-orange-300/80 hover:bg-orange-50/80'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => router.push(`/projects/${project.id}`)}
                            className="flex min-w-0 flex-1 items-center gap-2.5 py-2.5 pl-2 pr-1 text-left"
                          >
                            <span
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ${getProjectAvatarClass(project)}`}
                            >
                              {(project.name || 'P').charAt(0).toUpperCase()}
                            </span>
                            <span
                              className={`truncate text-sm font-medium ${
                                routeActive ? 'text-orange-950' : 'text-gray-800'
                              }`}
                            >
                              {project.name}
                            </span>
                          </button>
                          <span
                            className={`mr-1.5 inline-flex shrink-0 rounded-md border p-1 shadow-sm ${
                              routeActive
                                ? 'border-orange-200/90 bg-white'
                                : 'border-orange-100/80 bg-white/90'
                            }`}
                            title={health.label}
                          >
                            <BarChart3
                              className={`h-3.5 w-3.5 ${routeActive ? 'text-orange-600' : health.icon}`}
                              strokeWidth={2.5}
                            />
                          </span>
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
                        className="flex w-full items-center gap-2 rounded-lg border border-orange-200/70 bg-white px-3 py-2 text-[11px] font-semibold text-orange-800 transition-colors hover:border-orange-300 hover:bg-orange-50"
                      >
                        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-orange-600" />
                        <span>All projects</span>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-orange-500" />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
