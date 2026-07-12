import {
  Wallet,
  Landmark,
  FileText,
  ShieldCheck,
  CreditCard,
} from 'lucide-react'

export const PAYROLL_SECTION_PREFIXES = ['structures', 'payslips', 'compliance', 'loans']

export const HR_PAYROLL_NAV = [
  { id: 'payroll-overview', label: 'Overview', href: '/payroll', icon: Wallet },
  { id: 'payroll-structures', label: 'Salary Structures', href: '/payroll/structures', icon: Landmark },
  { id: 'payroll-payslips', label: 'Payslips', href: '/payroll/payslips', icon: FileText },
  { id: 'payroll-compliance', label: 'Compliance', href: '/payroll/compliance', icon: ShieldCheck },
  { id: 'payroll-loans', label: 'Loans & Advances', href: '/payroll/loans', icon: CreditCard },
]

export function isPayrollOverviewActive(pathname) {
  if (pathname === '/payroll') return true
  const parts = pathname.split('/').filter(Boolean)
  if (parts[0] !== 'payroll' || parts.length < 2) return false
  return !PAYROLL_SECTION_PREFIXES.includes(parts[1])
}

export function isPayrollSectionActive(pathname) {
  return pathname === '/payroll' || pathname.startsWith('/payroll/')
}

export function getPayrollPageMeta(section = 'overview') {
  const meta = {
    overview: {
      title: 'Payroll',
      breadcrumbLabel: 'Overview',
      subtitle: null,
      showKpis: true,
      showRunToolbar: true,
    },
    structures: {
      title: 'Salary Structures',
      breadcrumbLabel: 'Salary Structures',
      subtitle: 'Define CTC bands and salary component splits for your organization',
      showKpis: false,
      showRunToolbar: false,
    },
    payslips: {
      title: 'Payslips',
      breadcrumbLabel: 'Payslips',
      subtitle: 'View, generate, and download employee payslips for payroll runs',
      showKpis: false,
      showRunToolbar: false,
    },
    compliance: {
      title: 'Compliance',
      breadcrumbLabel: 'Compliance',
      subtitle: 'Statutory filings and compliance obligations',
      showKpis: false,
      showRunToolbar: false,
    },
    loans: {
      title: 'Loans & Advances',
      breadcrumbLabel: 'Loans & Advances',
      subtitle: 'Employee loans and salary advances',
      showKpis: false,
      showRunToolbar: false,
    },
  }
  return meta[section] || meta.overview
}
