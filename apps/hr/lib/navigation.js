import {
  LayoutDashboard,
  Users,
  Wallet,
  CalendarCheck,
  CalendarOff,
  Briefcase,
  Target,
  GraduationCap,
  Receipt,
  Headphones,
  BarChart3,
  Settings,
  Sparkles,
  LifeBuoy,
  Zap,
  UserPlus,
} from 'lucide-react'

/** Top 2×2 tile grid — Dashboard, Employees, Attendance, Leave */
export const HR_PRIMARY_TILES = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { id: 'employees', label: 'Employees', href: '/employees', icon: Users },
  { id: 'attendance', label: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { id: 'leave', label: 'Leave', href: '/leave', icon: CalendarOff },
]

/** Quick actions — open drawer forms (see HRQuickActionDrawer) */
export const HR_QUICK_ACTION_ITEMS = [
  { id: 'add-employee', label: 'Add employee', action: 'add-employee', icon: UserPlus },
  { id: 'apply-leave', label: 'Apply leave', action: 'apply-leave', icon: CalendarOff },
  { id: 'new-expense', label: 'New expense', action: 'new-expense', icon: Receipt },
  { id: 'post-job', label: 'Post job', action: 'post-job', icon: Briefcase },
]

/** Collapsible panels — Finance, Talent, Quick actions, Support */
export const HR_SIDEBAR_PANELS = [
  {
    id: 'finance',
    title: 'Finance',
    headerIcon: Receipt,
    items: [
      { id: 'expenses', label: 'Expenses', href: '/expenses', icon: Receipt },
      { id: 'payroll', label: 'Payroll', href: '/payroll', icon: Wallet },
    ],
  },
  {
    id: 'talent',
    title: 'Talent',
    headerIcon: Sparkles,
    items: [
      { id: 'recruitment', label: 'Recruitment', href: '/recruitment', icon: Briefcase },
      { id: 'performance', label: 'Performance', href: '/performance', icon: Target },
      { id: 'learning', label: 'Learning', href: '/learning', icon: GraduationCap },
    ],
  },
  {
    id: 'quick_actions',
    title: 'Quick actions',
    headerIcon: Zap,
    items: HR_QUICK_ACTION_ITEMS,
  },
  {
    id: 'support',
    title: 'Support',
    headerIcon: LifeBuoy,
    items: [
      { id: 'helpdesk', label: 'Helpdesk', href: '/helpdesk', icon: Headphones },
      { id: 'analytics', label: 'Analytics', href: '/analytics', icon: BarChart3 },
      { id: 'settings', label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
]

export const HR_PRIMARY_BOX_ITEMS = HR_PRIMARY_TILES
export const HR_SIDEBAR_LINK_GROUPS = HR_SIDEBAR_PANELS.map((p) => ({
  id: p.id,
  items: p.items,
}))

export function isNavItemActive(pathname, href) {
  if (!href) return false
  if (href === '/dashboard') return pathname === '/dashboard' || pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function panelHasActiveItem(pathname, panel) {
  return panel.items.some((item) => isNavItemActive(pathname, item.href))
}

/** Matches dashboard `AppPageHeader` / `Card glass` topbar surface */
export const HR_GLASS_SURFACE_CLASS =
  'bg-gradient-to-br from-white/95 via-white/85 to-white/75 backdrop-blur-xl'

export const HR_SIDEBAR_SURFACE_CLASS = `${HR_GLASS_SURFACE_CLASS} border-r border-white/30 shadow-xl`
