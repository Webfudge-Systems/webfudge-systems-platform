'use client'

import {
  Avatar,
  TableCellDateOnly,
  TableCellOrangePill,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'
import HRStatusBadge from '../shared/HRStatusBadge'

export function PerformanceEmployeeCell({ row }) {
  const name = row.employee
  const initial = name?.charAt(0) || '?'
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar
        alt={name}
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-gray-600 text-white"
      />
      <TableCellTitleSubtitle title={name} subtitle={row.department} />
    </div>
  )
}

export function PerformanceCycleCell({ row }) {
  return (
    <div className="min-w-[200px]">
      <div className="font-medium text-gray-900">{row.name}</div>
      <div className="text-sm text-gray-500">{row.period}</div>
    </div>
  )
}

export function PerformanceTextCell({ value, emphasized = false }) {
  return <TableCellText value={value} emphasized={emphasized} nowrap />
}

export function PerformanceDateCell({ dateString }) {
  return <TableCellDateOnly dateString={dateString} />
}

export function PerformancePromotionPill({ promotion }) {
  return (
    <TableCellOrangePill value={promotion === 'Yes' ? 'Recommended' : 'Not now'} />
  )
}

export function PerformanceStatusBadge({ status }) {
  return <HRStatusBadge status={status} />
}
