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
  GraduationCap,
  LifeBuoy,
  Settings,
} from 'lucide-react'
import { HR_PAYROLL_NAV, isPayrollOverviewActive, isPayrollSectionActive } from './payrollNavigation'
import {
  HR_PERFORMANCE_NAV,
  isPerformanceGoalsActive,
  isPerformanceSectionActive,
} from './performanceNavigation'

/** Main 2×3 navigate grid — aligned with PM sidebar */
export const HR_NAVIGATE_TILES = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', href: '/employees', icon: Users },
  { id: 'payroll', label: 'Payroll', href: '/payroll', icon: Wallet },
  { id: 'expenses', label: 'Expenses', href: '/expenses', icon: Receipt },
  { id: 'recruitment', label: 'Recruitment', href: '/recruitment', icon: Briefcase },
  { id: 'performance', label: 'Performance', href: '/performance', icon: Target },
]

/** @deprecated Use HR_NAVIGATE_TILES — kept for quick-action / legacy references */
export const HR_PRIMARY_TILES = HR_NAVIGATE_TILES.slice(0, 4)

/** @deprecated Secondary tiles moved into Tools panel */
export const HR_SECONDARY_TILES = HR_NAVIGATE_TILES.slice(4, 6)

/** Workforce panel links — shown below Navigate (PM Projects-style) */
export const HR_WORKFORCE_LINKS = [
  { id: 'attendance', label: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { id: 'leave', label: 'Leave', href: '/leave', icon: CalendarOff },
]

export const HR_NAVIGATE_SECTIONS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    
  },
  {
    id: 'employees',
    label: 'Employees',
    children: [
      { id: 'employees-directory', label: 'Employee Directory', href: '/employees', icon: Users },
      ...HR_WORKFORCE_LINKS,
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    children: HR_PAYROLL_NAV,
  },
  {
    id: 'expenses',
    label: 'Expenses',
    children: [{ id: 'expense-claims', label: 'Expenses', href: '/expenses', icon: Receipt }],
  },
  {
    id: 'recruitment',
    label: 'Recruitment',
    children: [{ id: 'recruitment-pipeline', label: 'Recruitment', href: '/recruitment', icon: Briefcase }],
  },
  {
    id: 'performance',
    label: 'Performance',
    children: HR_PERFORMANCE_NAV,
  },
]

/** Tools panel list — PM Tools-style */
export const HR_TOOLS = [
  { id: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { id: 'learning', label: 'Learning', href: '/learning', icon: GraduationCap },
  { id: 'helpdesk', label: 'Helpdesk', href: '/helpdesk', icon: LifeBuoy },
  { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
]

/** Employee section — used by HRSubSidebar if needed */
export const HR_EMPLOYEE_SUB_NAV = {
  id: 'employees',
  label: 'Employees',
  children: HR_WORKFORCE_LINKS,
}

/** Quick actions — open drawer forms (see HRQuickActionDrawer) */
export const HR_QUICK_ACTION_ITEMS = [
  { id: 'add-employee', label: 'Add employee', action: 'add-employee', icon: UserPlus },
  { id: 'apply-leave', label: 'Apply leave', action: 'apply-leave', icon: CalendarOff },
  { id: 'new-expense', label: 'New expense', action: 'new-expense', icon: Receipt },
  { id: 'post-job', label: 'Post job', action: 'post-job', icon: Briefcase },
]

export const HR_PRIMARY_BOX_ITEMS = HR_NAVIGATE_TILES

export function isNavItemActive(pathname, href) {
  if (!href) return false
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
  if (href === '/payroll') return isPayrollOverviewActive(pathname)
  if (href === '/performance') return isPerformanceGoalsActive(pathname)
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
  if (item.id === 'employees') {
    return isEmployeeSectionActive(pathname)
  }
  if (item.id === 'payroll') {
    return isPayrollSectionActive(pathname)
  }
  if (item.id === 'performance') {
    return isPerformanceSectionActive(pathname)
  }
  return item.href ? isNavItemActive(pathname, item.href) : false
}

export function isHrToolActive(pathname, item) {
  if (!item.href) return false
  return isNavItemActive(pathname, item.href)
}

/** PM-aligned sidebar shell */
export const HR_SIDEBAR_SURFACE_CLASS =
  'bg-white backdrop-blur-xl border-r border-white/30 shadow-xl'

/** Glass surface for cards and panels */
export const HR_GLASS_SURFACE_CLASS =
  'bg-gradient-to-br from-white/95 via-white/85 to-white/75 backdrop-blur-xl'
