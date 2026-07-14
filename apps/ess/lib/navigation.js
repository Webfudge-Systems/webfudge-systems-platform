import {
  LayoutDashboard,
  CalendarCheck,
  CalendarOff,
  Wallet,
  Activity,
  Target,
  Receipt,
} from 'lucide-react'

/** Main navigate grid — same pattern as HR / CRM sidebar tiles */
export const ESS_NAVIGATE_TILES = [
  { id: 'overview', label: 'Overview', href: '/overview', icon: LayoutDashboard },
  { id: 'attendance', label: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { id: 'leave', label: 'Leave', href: '/leave', icon: CalendarOff },
  { id: 'payroll', label: 'Payroll', href: '/payroll', icon: Wallet },
  { id: 'expenses', label: 'Expenses', href: '/expenses', icon: Receipt },
  { id: 'performance', label: 'Performance', href: '/performance', icon: Target },
  { id: 'activity', label: 'Activity', href: '/activity', icon: Activity },
]

/** Optional secondary links panel */
export const ESS_PORTAL_TOOLS = []

export const ESS_SIDEBAR_SURFACE_CLASS =
  'bg-white backdrop-blur-xl border-r border-white/30 shadow-xl'

export function isEssNavItemActive(pathname, href) {
  if (!href) return false
  if (href === '/overview') return pathname === '/overview' || pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function essTileIsActive(pathname, item) {
  return item.href ? isEssNavItemActive(pathname, item.href) : false
}

/** @deprecated Use ESS_NAVIGATE_TILES + ESS_PORTAL_TOOLS */
export const ESS_NAV_SECTIONS = [
  {
    id: 'my-work',
    label: 'MY WORK',
    items: ESS_NAVIGATE_TILES.filter((item) => item.id !== 'payroll'),
  },
  {
    id: 'my-finance',
    label: 'MY FINANCE',
    items: ESS_NAVIGATE_TILES.filter((item) => item.id === 'payroll' || item.id === 'expenses'),
  },
  {
    id: 'history',
    label: 'HISTORY',
    items: ESS_PORTAL_TOOLS,
  },
]
