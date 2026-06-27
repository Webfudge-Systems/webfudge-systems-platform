'use client'

import {
  Avatar,
  Badge,
  TableCellOrangePill,
  TableCellOwner,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'
import { employeeStatusBadgeVariant } from '../../lib/employeeStatus'

export function EmployeeNameCell({ row }) {
  const initial = row.name?.charAt(0) || '?'
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar
        alt={row.name}
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-gray-600 text-white"
      />
      <TableCellTitleSubtitle title={row.name} subtitle={row.employeeId} />
    </div>
  )
}

export function EmployeeDepartmentCell({ department }) {
  return <TableCellOrangePill value={department} className="whitespace-nowrap" />
}

export function EmployeeTextCell({ value, capitalize = false }) {
  return <TableCellText value={value} capitalize={capitalize} nowrap />
}

export function EmployeeManagerCell({ manager }) {
  if (!manager) return <TableCellText value="—" />
  return (
    <TableCellOwner
      label={manager}
      showIcon={false}
      className="min-w-[160px] max-w-[220px]"
      avatarClassName="bg-gray-600 text-white"
    />
  )
}

export function EmployeeStatusPill({ status }) {
  const label = (status || 'Exited').toString().trim()
  return (
    <Badge variant={employeeStatusBadgeVariant(label)} size="sm" className="capitalize">
      {label}
    </Badge>
  )
}
