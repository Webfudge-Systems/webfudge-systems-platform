import {
  Receipt,
  CheckCircle,
  BarChart3,
  Banknote,
} from 'lucide-react'

export const EXPENSE_SECTION_PREFIXES = ['approvals', 'reports', 'payouts']

export const HR_EXPENSES_NAV = [
  { id: 'expense-claims', label: 'Claims', href: '/expenses', icon: Receipt },
  { id: 'expense-approvals', label: 'Approvals', href: '/expenses/approvals', icon: CheckCircle },
  { id: 'expense-reports', label: 'Reports', href: '/expenses/reports', icon: BarChart3 },
  { id: 'expense-payouts', label: 'Payouts', href: '/expenses/payouts', icon: Banknote },
]

export function isExpensesClaimsActive(pathname) {
  if (pathname === '/expenses') return true
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'expenses' || parts.length < 2) return false
  return !EXPENSE_SECTION_PREFIXES.includes(parts[1])
}

export function isExpensesSectionActive(pathname) {
  return pathname === '/expenses' || pathname.startsWith('/expenses/')
}

export function getExpensesPageMeta(section = 'claims') {
  const meta = {
    claims: {
      title: 'Expenses',
      breadcrumbLabel: 'Claims',
      subtitle: null,
      showKpis: true,
    },
    approvals: {
      title: 'Approvals',
      breadcrumbLabel: 'Approvals',
      subtitle: 'Review and action pending expense claims',
      showKpis: true,
    },
    reports: {
      title: 'Reports',
      breadcrumbLabel: 'Reports',
      subtitle: 'Spend analytics and category breakdowns',
      showKpis: true,
    },
    payouts: {
      title: 'Payouts',
      breadcrumbLabel: 'Payouts',
      subtitle: 'Schedule and track employee reimbursements',
      showKpis: true,
    },
  }
  return meta[section] || meta.claims
}
