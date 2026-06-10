'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useAuth, resolveUserDisplayName, resolveUserInitials } from '@webfudge/auth'
import { Avatar } from '@webfudge/ui'
import {
  HR_PRIMARY_TILES,
  HR_SECONDARY_TILES,
  HR_EMPLOYEE_SUB_NAV,
  HR_SIDEBAR_SURFACE_CLASS,
  tileIsActive,
} from '../../lib/navigation'
import HRSubSidebar from './HRSubSidebar'

const HR_LOGO = '/logo/Vertical logo 1 bg removed.png'

function tileClassName(active, collapsed) {
  if (collapsed) {
    return `flex items-center justify-center rounded-lg border transition-all w-10 h-10 ${
      active
        ? 'bg-orange-500 text-white border-orange-500/50 shadow-md shadow-orange-500/20'
        : 'bg-white/90 border-white/50 text-gray-600 hover:bg-white hover:shadow-sm'
    }`
  }

  return `relative flex flex-col items-center justify-center gap-1.5 transition-all border shadow-md rounded-xl px-2 py-3.5 min-h-[4.5rem] ${
    active
      ? 'bg-orange-500 text-white border-orange-500/40 shadow-lg shadow-orange-500/25'
      : 'bg-white/90 border-white/50 text-gray-800 hover:bg-white hover:border-orange-200/60 hover:shadow-lg'
  }`
}

function TileLink({ item, pathname, collapsed, onSubNavOpen }) {
  const Icon = item.icon
  const active = tileIsActive(pathname, item)
  const classes = tileClassName(active, collapsed)
  const iconSize = collapsed ? 'w-5 h-5' : 'w-6 h-6'

  if (item.hasSubNav) {
    return (
      <button
        type="button"
        onClick={() => onSubNavOpen?.(item.id)}
        title={item.label}
        className={classes}
      >
        <Icon className={`${iconSize} shrink-0`} strokeWidth={2} />
        {!collapsed ? (
          <span className="text-[10px] font-semibold text-center leading-snug px-0.5 line-clamp-2">
            {item.label}
          </span>
        ) : null}
      </button>
    )
  }

  if (collapsed) {
    return (
      <Link href={item.href} title={item.label} className={classes}>
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
      </Link>
    )
  }

  return (
    <Link href={item.href} title={item.label} className={classes}>
      <Icon className={`${iconSize} shrink-0`} strokeWidth={2} />
      <span className="text-[10px] font-semibold text-center leading-snug px-0.5 line-clamp-2">
        {item.label}
      </span>
    </Link>
  )
}

function CollapsedSidebarNav({ pathname, onSubNavOpen }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="grid grid-cols-1 gap-1.5 w-full px-2">
        {HR_PRIMARY_TILES.map((item) => (
          <div key={item.id} className="flex justify-center">
            <TileLink item={item} pathname={pathname} collapsed onSubNavOpen={onSubNavOpen} />
          </div>
        ))}
      </div>
      <div className="w-8 h-px bg-orange-300/40 rounded-full" aria-hidden />
      <div className="grid grid-cols-1 gap-1.5 w-full px-2">
        {HR_SECONDARY_TILES.map((item) => (
          <div key={item.id} className="flex justify-center">
            <TileLink item={item} pathname={pathname} collapsed onSubNavOpen={onSubNavOpen} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HRSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const displayName = resolveUserDisplayName(user) || 'User'
  const email = user?.email || user?.attributes?.email || ''
  const initials = resolveUserInitials(user)

  const [subNavOpen, setSubNavOpen] = useState(false)

  const handleSubNavOpen = (sectionId) => {
    if (sectionId === 'employees') {
      setSubNavOpen(true)
    }
  }

  const closeSubNav = () => setSubNavOpen(false)

  return (
    <>
      <div
        className={`${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        } h-full min-h-0 ${HR_SIDEBAR_SURFACE_CLASS} flex flex-col overflow-hidden transition-[width] duration-300 flex-shrink-0`}
      >
        <div className="shrink-0 px-2 pt-4 pb-3 border-b border-white/30">
          <div className={`flex gap-2 ${collapsed ? 'flex-col items-center' : 'items-center justify-between px-1'}`}>
            <Link
              href="/dashboard"
              className={`flex min-w-0 items-center ${collapsed ? 'justify-center' : 'gap-2'}`}
              aria-label="WF People home"
            >
              <Image
                src={HR_LOGO}
                alt="Webfudge"
                width={36}
                height={36}
                className={`object-contain shrink-0 ${collapsed ? 'h-9 w-9' : 'h-9 w-9'}`}
                priority
              />
              {!collapsed && (
                <div className="min-w-0">
                  <span className="block text-xs font-medium text-gray-500">Webfudge</span>
                  <span className="block font-bold text-lg text-orange-600 leading-tight">HR</span>
                </div>
              )}
            </Link>
            <button
              type="button"
              onClick={onToggle}
              className="shrink-0 p-2 rounded-lg hover:bg-white/50 transition-colors text-gray-600"
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
          </div>
          {!collapsed ? (
            <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" aria-hidden />
          ) : null}
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {collapsed ? (
            <CollapsedSidebarNav pathname={pathname} onSubNavOpen={handleSubNavOpen} />
          ) : (
            <div className="px-3 py-3 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {HR_PRIMARY_TILES.map((item) => (
                  <TileLink
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    collapsed={false}
                    onSubNavOpen={handleSubNavOpen}
                  />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2.5">
                {HR_SECONDARY_TILES.map((item) => (
                  <TileLink
                    key={item.id}
                    item={item}
                    pathname={pathname}
                    collapsed={false}
                    onSubNavOpen={handleSubNavOpen}
                  />
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="shrink-0 border-t border-white/30 p-2">
          <div
            className={`flex items-center gap-2 rounded-xl px-1.5 py-2 hover:bg-white/40 transition-colors ${
              collapsed ? 'flex-col justify-center' : ''
            }`}
          >
            <Avatar alt={displayName} fallback={initials} size={collapsed ? 'sm' : 'md'} className="shrink-0 !bg-orange-500" />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                {email ? <p className="text-xs text-gray-500 truncate">{email}</p> : null}
              </div>
            )}
            {!collapsed && <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" aria-hidden />}
          </div>
        </div>
      </div>

      <HRSubSidebar
        isOpen={subNavOpen}
        onClose={closeSubNav}
        section={HR_EMPLOYEE_SUB_NAV}
        onNavigate={closeSubNav}
      />
    </>
  )
}
