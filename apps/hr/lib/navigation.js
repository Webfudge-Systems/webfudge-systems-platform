import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarCheck,
  CalendarOff,
  Briefcase,
  Target,
  Receipt,
  BarChart3,
  UserPlus,
} from 'lucide-react'

/** Top 2×2 tile grid — Dashboard, Employees, Payroll, Expenses */
export const HR_PRIMARY_TILES = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', icon: Users, hasSubNav: true },
  { id: 'payroll', label: 'Payroll', href: '/payroll', icon: Wallet },
  { id: 'expenses', label: 'Expenses', href: '/expenses', icon: Receipt },
]

/** Secondary row — Recruitment, Performance, Analytics */
export const HR_SECONDARY_TILES = [
  { id: 'recruitment', label: 'Recruitment', href: '/recruitment', icon: Briefcase },
  { id: 'performance', label: 'Performance', href: '/performance', icon: Target },
  { id: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3 },
]

/** Employee section — opens in nav panel when Employees tile is clicked */
export const HR_EMPLOYEE_SUB_NAV = {
  id: 'employees',
  label: 'Employees',
  children: [
    { id: 'directory', label: 'All employees', href: '/employees', icon: Users },
    { id: 'attendance', label: 'Attendance', href: '/attendance', icon: CalendarCheck },
    { id: 'leave', label: 'Leave', href: '/leave', icon: CalendarOff },
  ],
}

/** Quick actions — open drawer forms (see HRQuickActionDrawer) */
export const HR_QUICK_ACTION_ITEMS = [
  { id: 'add-employee', label: 'Add employee', action: 'add-employee', icon: UserPlus },
  { id: 'apply-leave', label: 'Apply leave', action: 'apply-leave', icon: CalendarOff },
  { id: 'new-expense', label: 'New expense', action: 'new-expense', icon: Receipt },
  { id: 'post-job', label: 'Post job', action: 'post-job', icon: Briefcase },
]

export const HR_PRIMARY_BOX_ITEMS = HR_PRIMARY_TILES

export function isNavItemActive(pathname, href) {
  if (!href) return false
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isEmployeeSectionActive(pathname) {
  return (
    isNavItemActive(pathname, '/employees') ||
    isNavItemActive(pathname, '/attendance') ||
    isNavItemActive(pathname, '/leave')
  )
}

export function tileIsActive(pathname, item) {
  if (item.hasSubNav && item.id === 'employees') {
    return isEmployeeSectionActive(pathname)
  }
  return item.href ? isNavItemActive(pathname, item.href) : false
}

/** Matches dashboard `AppPageHeader` / `Card glass` topbar surface */
export const HR_GLASS_SURFACE_CLASS =
  'bg-gradient-to-br from-white/95 via-white/85 to-white/75 backdrop-blur-xl'

export const HR_SIDEBAR_SURFACE_CLASS = `${HR_GLASS_SURFACE_CLASS} border-r border-white/30 shadow-xl`
