'use client'

import { clsx } from 'clsx'
import {
  Avatar,
  Badge,
  TableCellOrangePill,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'

const STATUS_PILL = {
  PENDING: 'border-orange-200 bg-orange-50 text-orange-900',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  REJECTED: 'border-red-200 bg-red-50 text-red-900',
}

export function LeaveEmployeeCell({ row }) {
  const name = row.employeeName || row.name
  const id = row.employeeId
  const initial = name?.charAt(0) || '?'
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar
        alt={name}
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-gray-600 text-white"
      />
      <TableCellTitleSubtitle title={name} subtitle={id} />
    </div>
  )
}

export function LeaveBalanceEmployeeCell({ row }) {
  return (
    <div className="min-w-[180px]">
      <div className="truncate font-medium text-gray-900">{row.employeeName}</div>
      <div className="truncate text-sm text-gray-500">{row.department}</div>
    </div>
  )
}

export function LeaveTypeCell({ type }) {
  return <TableCellOrangePill value={type} className="whitespace-nowrap" />
}

export function LeaveTextCell({ value, emphasized = false }) {
  return <TableCellText value={value} emphasized={emphasized} nowrap />
}

export function LeaveStatusPill({ status }) {
  const raw = (status || 'Pending').toString().trim()
  const key = raw.toUpperCase()
  const tone = STATUS_PILL[key] || STATUS_PILL.PENDING
  return (
    <Badge
      className={clsx('whitespace-nowrap border px-3 py-1 text-xs font-semibold uppercase tracking-wide', tone)}
    >
      {key.replace(/_/g, ' ')}
    </Badge>
  )
}
