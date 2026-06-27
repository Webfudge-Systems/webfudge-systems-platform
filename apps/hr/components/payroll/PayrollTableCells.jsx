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
  return <TableCellTitleSubtitle title={row.name} subtitle={row.components} />
}

export function PayrollPayslipEmployeeCell({ row }) {
  return <TableCellText value={row.employee} className="font-medium" />
}

export function PayrollComplianceItemCell({ name }) {
  return <TableCellText value={name} className="font-medium" />
}
