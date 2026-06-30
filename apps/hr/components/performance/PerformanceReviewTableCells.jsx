'use client'

import {
  Avatar,
  TableCellDateOnly,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'
import HRStatusBadge from '../shared/HRStatusBadge'

export function ReviewCycleCell({ row }) {
  const initial = row.name?.charAt(0) || '?'

  return (
    <div className="flex min-w-[240px] items-center gap-3">
      <Avatar
        alt={row.name}
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-gray-600 text-white"
      />
      <TableCellTitleSubtitle title={row.name} subtitle={row.period} />
    </div>
  )
}

export function ReviewDueCell({ row }) {
  return <TableCellDateOnly dateString={row.due} />
}

export function ReviewCompletionCell({ row }) {
  return <TableCellText value={`${row.completion ?? 0}%`} emphasized nowrap />
}

export function ReviewStatusPill({ row }) {
  return <HRStatusBadge status={row.status} className="whitespace-nowrap" />
}
