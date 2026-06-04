'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { useAuth, resolveUserDisplayName, resolveUserInitials } from '@webfudge/auth'
import { Avatar } from '@webfudge/ui'
import {
  HR_PRIMARY_TILES,
  HR_SIDEBAR_PANELS,
  HR_SIDEBAR_SURFACE_CLASS,
  isNavItemActive,
  panelHasActiveItem,
} from '../../lib/navigation'
import { useHRQuickActionsOptional } from '../quick-actions/HRQuickActionsContext'

const HR_LOGO = '/logo/Vertical logo 1 bg removed.png'

const DEFAULT_OPEN = {
  finance: true,
  talent: true,
  quick_actions: true,
  support: true,
}

function TileLink({ item, pathname, collapsed }) {
  const Icon = item.icon
  const active = isNavItemActive(pathname, item.href)

  if (collapsed) {
    return (
      <Link
        href={item.href}
        title={item.label}
        className={`flex items-center justify-center rounded-lg border transition-all w-10 h-10 ${
          active
            ? 'bg-orange-500 text-white border-orange-500/50 shadow-md shadow-orange-500/20'
            : 'bg-white/90 border-white/50 text-gray-600 hover:bg-white hover:shadow-sm'
        }`}
      >
        <Icon className="w-5 h-5 shrink-0" strokeWidth={2} />
      </Link>
    )
  }

  return (
    <Link
      href={item.href}
      title={item.label}
      className={`relative flex flex-col items-center justify-center gap-1.5 transition-all border shadow-md rounded-xl px-2 py-3.5 min-h-[4.5rem] ${
        active
          ? 'bg-orange-500 text-white border-orange-500/40 shadow-lg shadow-orange-500/25'
          : 'bg-white/90 border-white/50 text-gray-800 hover:bg-white hover:border-orange-200/60 hover:shadow-lg'
      }`}
    >
      <Icon className="w-6 h-6 shrink-0" strokeWidth={2} />
      <span className="text-[10px] font-semibold text-center leading-snug px-0.5 line-clamp-2">
        {item.label}
      </span>
    </Link>
  )
}

function ListNavLink({ item, pathname, quickAction = false, onQuickAction }) {
  const Icon = item.icon
  const active = item.href ? isNavItemActive(pathname, item.href) : false

  if (quickAction && item.action) {
    return (
      <button
        type="button"
        onClick={() => onQuickAction?.(item.action)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50/80 hover:text-orange-800"
      >
        <Icon className="w-5 h-5 shrink-0 text-gray-500" strokeWidth={2} />
        <span>{item.label}</span>
      </button>
    )
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-orange-100 text-orange-600'
          : quickAction
            ? 'text-gray-700 hover:bg-orange-50/80 hover:text-orange-800'
            : 'text-gray-700 hover:bg-white/60 hover:text-gray-900'
      }`}
    >
      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-orange-600' : 'text-gray-500'}`} strokeWidth={2} />
      <span>{item.label}</span>
    </Link>
  )
}

function CollapsedQuickActionButton({ item, onQuickAction }) {
  const Icon = item.icon
  return (
    <button
      type="button"
      title={item.label}
      onClick={() => onQuickAction?.(item.action)}
      className="flex items-center justify-center rounded-lg w-10 h-10 text-gray-500 transition-all hover:bg-orange-50 hover:text-orange-600"
    >
      <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
    </button>
  )
}

function CollapsedIconLink({ item, pathname }) {
  const Icon = item.icon
  const active = isNavItemActive(pathname, item.href)
  return (
    <Link
      href={item.href}
      title={item.label}
      className={`flex items-center justify-center rounded-lg w-10 h-10 transition-all ${
        active
          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
          : 'text-gray-500 hover:bg-white/80 hover:text-orange-600'
      }`}
    >
      <Icon className="w-[18px] h-[18px]" strokeWidth={2} />
    </Link>
  )
}

function CollapsiblePanel({ panel, pathname, open, onToggle, collapsed, onQuickAction }) {
  const HeaderIcon = panel.headerIcon
  const isQuick = panel.id === 'quick_actions'

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 w-full px-2">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 ring-1 ring-orange-200/50"
          title={panel.title}
        >
          <HeaderIcon className="h-3.5 w-3.5 text-orange-600" strokeWidth={2.25} />
        </span>
        {panel.items.map((item) =>
          isQuick && item.action ? (
            <CollapsedQuickActionButton key={item.id} item={item} onQuickAction={onQuickAction} />
          ) : (
            <CollapsedIconLink key={item.id} item={item} pathname={pathname} />
          )
        )}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/40 bg-white/50 backdrop-blur-md shadow-md overflow-hidden ring-1 ring-orange-100/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 border-b border-orange-200/40 bg-gradient-to-r from-orange-500/8 via-white/40 to-transparent px-3 py-2.5 text-left transition-colors hover:from-orange-500/12"
        aria-expanded={open}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/15 ring-1 ring-orange-300/40">
          <HeaderIcon className="h-4 w-4 text-orange-600" strokeWidth={2.25} />
        </span>
        <span className="flex-1 truncate text-xs font-bold tracking-wide text-orange-900">{panel.title}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-orange-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>
      {open ? (
        <ul className="space-y-0.5 p-2">
          {panel.items.map((item) => (
            <li key={item.id}>
              <ListNavLink
                item={item}
                pathname={pathname}
                quickAction={isQuick}
                onQuickAction={onQuickAction}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function CollapsedSidebarNav({ pathname, onQuickAction }) {
  return (
    <div className="flex flex-col items-center gap-3 py-2">
      <div className="grid grid-cols-1 gap-1.5 w-full px-2">
        {HR_PRIMARY_TILES.map((item) => (
          <div key={item.id} className="flex justify-center">
            <TileLink item={item} pathname={pathname} collapsed />
          </div>
        ))}
      </div>
      <div className="w-8 h-px bg-orange-300/40 rounded-full" aria-hidden />
      <div className="flex flex-col items-center gap-4 w-full">
        {HR_SIDEBAR_PANELS.map((panel) => (
          <CollapsiblePanel
            key={panel.id}
            panel={panel}
            pathname={pathname}
            open={false}
            onToggle={() => {}}
            collapsed
            onQuickAction={onQuickAction}
          />
        ))}
      </div>
    </div>
  )
}

export default function HRSidebar({ collapsed = false, onToggle }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const quickActions = useHRQuickActionsOptional()
  const displayName = resolveUserDisplayName(user) || 'User'
  const email = user?.email || user?.attributes?.email || ''
  const initials = resolveUserInitials(user)

  const [openPanels, setOpenPanels] = useState(DEFAULT_OPEN)

  useEffect(() => {
    setOpenPanels((prev) => {
      const next = { ...prev }
      HR_SIDEBAR_PANELS.forEach((panel) => {
        if (panelHasActiveItem(pathname, panel)) {
          next[panel.id] = true
        }
      })
      return next
    })
  }, [pathname])

  const togglePanel = (id) => {
    setOpenPanels((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleQuickAction = (actionId) => {
    quickActions?.openQuickAction(actionId)
  }

  return (
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
          <CollapsedSidebarNav pathname={pathname} onQuickAction={handleQuickAction} />
        ) : (
          <div className="px-3 py-3 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              {HR_PRIMARY_TILES.map((item) => (
                <TileLink key={item.id} item={item} pathname={pathname} collapsed={false} />
              ))}
            </div>
            {HR_SIDEBAR_PANELS.map((panel) => (
              <CollapsiblePanel
                key={panel.id}
                panel={panel}
                pathname={pathname}
                open={openPanels[panel.id] ?? true}
                onToggle={() => togglePanel(panel.id)}
                collapsed={false}
                onQuickAction={handleQuickAction}
              />
            ))}
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
  )
}
