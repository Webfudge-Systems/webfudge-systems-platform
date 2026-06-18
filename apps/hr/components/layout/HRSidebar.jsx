'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { SidebarProductBranding } from '@webfudge/ui'
import {
  PanelLeftClose,
  Users,
  Plus,
  ChevronRight,
  Target,
} from 'lucide-react'
import {
  HR_NAVIGATE_TILES,
  HR_WORKFORCE_LINKS,
  HR_TOOLS,
  HR_SIDEBAR_SURFACE_CLASS,
  tileIsActive,
  isHrToolActive,
  isNavItemActive,
} from '../../lib/navigation'
import { HR_SITE } from '../../lib/site'

const WORKFORCE_AVATAR_PALETTE = [
  'bg-orange-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
]

function getWorkforceAvatarClass(item) {
  let n = 0
  const s = String(item.id || '')
  for (let i = 0; i < s.length; i += 1) n += s.charCodeAt(i)
  return WORKFORCE_AVATAR_PALETTE[n % WORKFORCE_AVATAR_PALETTE.length]
}

export default function HRSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()
  const router = useRouter()

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
      } h-full min-h-0 ${HR_SIDEBAR_SURFACE_CLASS} flex flex-col overflow-hidden transition-[width] duration-300 flex-shrink-0`}
    >
      <div className="shrink-0 px-4 pt-4 pb-3">
        <div
          className={`flex gap-2 ${
            collapsed ? 'flex-col items-center' : 'items-center justify-between'
          }`}
        >
          {collapsed ? (
            <Link href="/dashboard" className="flex shrink-0" aria-label={`${HR_SITE.name} home`}>
              <Image
                src={HR_SITE.logoPath}
                alt={HR_SITE.brandName}
                width={32}
                height={32}
                className="h-8 w-8 object-contain"
                priority
              />
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="flex min-w-0 flex-1 items-center gap-2.5"
              aria-label={`${HR_SITE.name} home`}
            >
              <Image
                src={HR_SITE.logoPath}
                alt={HR_SITE.brandName}
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 object-contain"
                priority
              />
              <SidebarProductBranding
                productName={HR_SITE.name}
                companyName={HR_SITE.brandName}
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
            {HR_NAVIGATE_TILES.map((item) => {
              const Icon = item.icon
              const active = tileIsActive(pathname, item)
              return (
                <Link
                  key={item.id}
                  href={item.href || '/dashboard'}
                  className={`relative rounded-xl px-2 py-3.5 flex flex-col items-center justify-center gap-1.5 min-h-[4.5rem] transition-all border shadow-md ${
                    active
                      ? 'bg-brand-primary text-white border-brand-primary/40 shadow-lg shadow-orange-500/25'
                      : 'bg-white/20 backdrop-blur-md border-white/30 text-brand-foreground hover:bg-white/35 hover:shadow-lg'
                  }`}
                  title={collapsed ? item.label : undefined}
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

        {!collapsed && (
          <div className="px-3 py-2 relative z-0">
            {sectionRule('Workforce')}
            <div className="rounded-xl border border-orange-200/80 bg-gradient-to-b from-orange-50/50 via-white to-white shadow-md overflow-hidden ring-1 ring-orange-100/60">
              <div className="flex items-center justify-between border-b border-orange-200/50 bg-gradient-to-r from-orange-500/12 via-orange-50/90 to-transparent px-3 py-2.5">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 ring-1 ring-orange-300/40">
                    <Users className="h-4 w-4 text-orange-600" strokeWidth={2.25} />
                  </span>
                  <span className="truncate text-xs font-bold tracking-wide text-orange-900">
                    Employees
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => router.push('/employees/new')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white shadow-sm shadow-orange-500/30 transition-colors hover:bg-orange-600"
                  title="Add employee"
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </div>

              <div className="px-1.5 py-1.5 space-y-0.5">
                {HR_WORKFORCE_LINKS.map((item) => {
                  const Icon = item.icon
                  const routeActive = isNavItemActive(pathname, item.href)
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg border-l-[3px] py-2.5 pl-2 pr-3 transition-colors ${
                        routeActive
                          ? 'border-l-orange-500 bg-orange-100/70 shadow-sm shadow-orange-500/10'
                          : 'border-l-transparent hover:border-l-orange-300/80 hover:bg-orange-50/80'
                      }`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm ${getWorkforceAvatarClass(item)}`}
                      >
                        {item.label.charAt(0).toUpperCase()}
                      </span>
                      <span
                        className={`flex-1 truncate text-sm font-medium ${
                          routeActive ? 'text-orange-950' : 'text-gray-800'
                        }`}
                      >
                        {item.label}
                      </span>
                      <Icon
                        className={`h-3.5 w-3.5 shrink-0 ${
                          routeActive ? 'text-orange-600' : 'text-gray-400'
                        }`}
                        strokeWidth={2.25}
                      />
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {!collapsed && (
          <div className="px-3 pt-2 pb-4">
            {sectionRule('Tools')}
            <div className="rounded-xl border border-gray-300 bg-white shadow-md overflow-hidden ring-1 ring-black/[0.04]">
              <div className="flex items-center gap-1.5 px-3 py-2.5 border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-900">
                <Target className="w-3.5 h-3.5 shrink-0 text-gray-600" />
                <span>Workspace tools</span>
              </div>
              <div className="p-2 space-y-0.5">
                {HR_TOOLS.map((item) => {
                  const Icon = item.icon
                  const active = isHrToolActive(pathname, item)
                  return (
                    <Link
                      key={item.id}
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
    </div>
  )
}
