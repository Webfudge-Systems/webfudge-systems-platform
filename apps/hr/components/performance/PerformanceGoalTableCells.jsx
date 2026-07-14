'use client'

import { clsx } from 'clsx'
import {
  Avatar,
  Badge,
  TableCellOrangePill,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'
import {
  getGoalAverageProgress,
  getGoalScopeLabel,
} from '../../lib/performancePage'

const STATUS_PILL = {
  'ON TRACK': 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'AT RISK': 'border-orange-200 bg-orange-50 text-orange-900',
}

export function GoalObjectiveCell({ row }) {
  const initial = row.objective?.charAt(0) || '?'
  const subtitle = row.reviewCycle || getGoalScopeLabel(row)

  return (
    <div className="flex min-w-[240px] items-center gap-3">
      <Avatar
        alt={row.objective}
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-gray-600 text-white"
      />
      <TableCellTitleSubtitle title={row.objective} subtitle={subtitle} />
    </div>
  )
}

export function GoalScopeCell({ row }) {
  return <TableCellOrangePill value={getGoalScopeLabel(row)} className="whitespace-nowrap" />
}

export function GoalTextCell({ value, emphasized = false }) {
  return <TableCellText value={value} emphasized={emphasized} nowrap />
}

export function GoalProgressCell({ row }) {
  return <GoalTextCell value={`${getGoalAverageProgress(row)}%`} emphasized />
}

export function GoalKeyResultsCountCell({ row }) {
  const count = row.keyResults?.length || 0
  return <GoalTextCell value={String(count)} emphasized />
}

export function GoalStatusPill({ row }) {
  const onTrack = getGoalAverageProgress(row) >= 50
  const label = onTrack ? 'On Track' : 'At Risk'
  const tone = onTrack ? STATUS_PILL['ON TRACK'] : STATUS_PILL['AT RISK']

  return (
    <Badge
      className={clsx('whitespace-nowrap border px-3 py-1 text-xs font-semibold uppercase tracking-wide', tone)}
    >
      {label}
    </Badge>
  )
}
