'use client'

import {
  Avatar,
  TableCellDateOnly,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'
import HRStatusBadge from '../shared/HRStatusBadge'

export function PipEmployeeCell({ row }) {
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
      <TableCellTitleSubtitle title={name} subtitle={row.manager ? `Manager: ${row.manager}` : undefined} />
    </div>
  )
}

export function PipManagerCell({ row }) {
  return <TableCellText value={row.manager} nowrap />
}

export function PipStartCell({ row }) {
  return <TableCellDateOnly dateString={row.start} />
}

export function PipDurationCell({ row }) {
  return <TableCellText value={row.duration} nowrap />
}

export function PipMilestonesCell({ row }) {
  return <TableCellText value={row.milestones} emphasized nowrap />
}

export function PipStatusPill({ row }) {
  return <HRStatusBadge status={row.status} className="whitespace-nowrap" />
}
