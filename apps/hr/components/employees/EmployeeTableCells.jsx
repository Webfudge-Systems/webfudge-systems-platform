'use client'

import { clsx } from 'clsx'
import {
  Avatar,
  Badge,
  TableCellOrangePill,
  TableCellOwner,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'

const STATUS_PILL = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  PROBATION: 'border-amber-200 bg-amber-50 text-amber-900',
  NOTICE: 'border-orange-200 bg-orange-50 text-orange-900',
  EXITED: 'border-gray-300 bg-gray-50 text-gray-700',
}

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
  if (!manager) return <span className="text-sm text-gray-400">—</span>
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
  const raw = (status || 'Exited').toString().trim()
  const key = raw.toUpperCase()
  const tone = STATUS_PILL[key] || STATUS_PILL.EXITED
  return (
    <Badge
      className={clsx('whitespace-nowrap border px-3 py-1 text-xs font-semibold uppercase tracking-wide', tone)}
    >
      {key.replace(/_/g, ' ')}
    </Badge>
  )
}
