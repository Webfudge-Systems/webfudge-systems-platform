'use client'

import {
  Avatar,
  TableCellDateOnly,
  TableCellOrangePill,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'

function truncateQuote(text, max = 72) {
  const value = String(text || '').trim()
  if (value.length <= max) return value
  return `${value.slice(0, max)}…`
}

export function PendingFeedbackRequestCell({ row }) {
  const initial = row.label?.charAt(0) || '?'

  return (
    <div className="flex min-w-[240px] items-center gap-3">
      <Avatar
        alt={row.label}
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-gray-600 text-white"
      />
      <TableCellTitleSubtitle title={row.label} subtitle={row.reviewCycle || 'Review cycle'} />
    </div>
  )
}

export function PendingFeedbackDueCell({ row }) {
  return <TableCellDateOnly dateString={row.due} />
}

export function FeedbackTypePill({ row }) {
  return <TableCellOrangePill value={row.type || 'Peer'} className="whitespace-nowrap" />
}

export function ReceivedFeedbackCell({ row }) {
  const initial = row.quote?.charAt(0) || '?'

  return (
    <div className="flex min-w-[280px] items-center gap-3">
      <Avatar
        alt="Feedback"
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-orange-100 text-orange-700"
      />
      <TableCellTitleSubtitle
        title={truncateQuote(row.quote)}
        subtitle={row.period || '—'}
      />
    </div>
  )
}

export function ReceivedFeedbackPeriodCell({ row }) {
  return <TableCellText value={row.period || '—'} emphasized nowrap />
}
