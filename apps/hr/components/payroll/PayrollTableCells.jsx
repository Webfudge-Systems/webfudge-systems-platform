'use client'

import {
  Avatar,
  Badge,
  TableCellOrangePill,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'
import { employeeStatusBadgeVariant } from '../../lib/employeeStatus'
import { formatPayrollInr } from '../../lib/payrollPage'

export function PayrollEmployeeCell({ row }) {
  const initial = row.name?.charAt(0) || '?'
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar alt={row.name} fallback={initial} size="sm" className="shrink-0 bg-gray-600 text-white" />
      <TableCellTitleSubtitle title={row.name} subtitle={row.employeeId || row.id} />
    </div>
  )
}

export function PayrollDepartmentCell({ department }) {
  return <TableCellOrangePill value={department} className="whitespace-nowrap" />
}

export function PayrollAmountCell({ value, emphasized = false }) {
  return <TableCellText value={formatPayrollInr(value)} emphasized={emphasized} className="tabular-nums" />
}

export function PayrollStatusBadge({ status }) {
  return (
    <Badge variant={employeeStatusBadgeVariant(status)} size="sm" className="capitalize">
      {status}
    </Badge>
  )
}

export function PayrollStructureCell({ row }) {
  const ctc = Number(row.ctc || 0)
  const headcount = Number(row.headcount || 0)
  const subtitle = ctc
    ? `Annual CTC ${formatPayrollInr(ctc)}`
    : headcount === 1
      ? '1 employee assigned'
      : `${headcount} employees assigned`
  return <TableCellTitleSubtitle title={row.name} subtitle={subtitle} />
}

export function PayrollStructureBreakdownCell({ row }) {
  const breakdown = `Basic ${row.basicPercent}% · HRA ${row.hraPercent}% · Special ${row.specialAllowancePercent}% · FBP ${row.fbpPercent}%`
  return <TableCellText value={breakdown} className="text-xs text-gray-700" />
}

export function PayrollStructureHeadcountCell({ value }) {
  return <TableCellText value={String(Number(value || 0))} emphasized className="tabular-nums" />
}

export function PayrollStructureActiveBadge({ isActive = true }) {
  return (
    <Badge variant={isActive ? 'success' : 'default'} size="sm" className="capitalize">
      {isActive ? 'Active' : 'Inactive'}
    </Badge>
  )
}

export function PayrollPayslipEmployeeCell({ row }) {
  const initial = row.name?.charAt(0) || '?'
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar alt={row.name} fallback={initial} size="sm" className="shrink-0 bg-gray-600 text-white" />
      <TableCellTitleSubtitle title={row.name} subtitle={row.employeeId || row.id} />
    </div>
  )
}

export function PayrollComplianceItemCell({ row }) {
  return <TableCellTitleSubtitle title={row.name} subtitle={row.authority} />
}

export function PayrollLoanEmployeeCell({ row }) {
  const initial = row.employeeName?.charAt(0) || '?'
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar alt={row.employeeName} fallback={initial} size="sm" className="shrink-0 bg-gray-600 text-white" />
      <TableCellTitleSubtitle title={row.employeeName} subtitle={row.employeeId} />
    </div>
  )
}
