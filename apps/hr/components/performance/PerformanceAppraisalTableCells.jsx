'use client'

import {
  Avatar,
  TableCellDateOnly,
  TableCellOrangePill,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'
import HRStatusBadge from '../shared/HRStatusBadge'

export function AppraisalEmployeeCell({ row }) {
  const name = row.employee
  const initial = name?.charAt(0) || '?'

  return (
    <div className="flex min-w-[240px] items-center gap-3">
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

export function AppraisalRatingCell({ row }) {
  return <TableCellText value={String(row.rating ?? '—')} emphasized nowrap />
}

export function AppraisalRevisionCell({ row }) {
  return <TableCellText value={`${row.revision ?? 0}%`} nowrap />
}

export function AppraisalPromotionPill({ row }) {
  const label = row.promotion === 'Yes' ? 'Recommended' : 'Not now'
  return <TableCellOrangePill value={label} className="whitespace-nowrap" />
}

export function AppraisalEffectiveCell({ row }) {
  return <TableCellDateOnly dateString={row.effective} />
}

export function AppraisalStatusPill({ row }) {
  return <HRStatusBadge status={row.status} className="whitespace-nowrap" />
}
