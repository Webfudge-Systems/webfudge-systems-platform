'use client'

import { Button, DashboardInsightShell, Badge } from '@webfudge/ui'
import { attendanceStatusBadgeVariant } from '../../lib/attendanceStatusMeta'
import ESSTimeClockActions from './ESSTimeClockActions'

export default function ESSAttendanceDayDetail({
  log,
  isToday = false,
  clockState = null,
  onTimeIn,
  onTimeOut,
  punching = null,
  onEdit,
}) {
  if (!log) return null

  const isWeekend = log.status === 'weekend'
  const canEdit = !log.inferred && log.status !== 'leave' && !isWeekend && !isToday
  const showTodayClock = isToday && clockState && !clockState.blocked

  return (
    <DashboardInsightShell
      title={new Date(log.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}
      badge={
        <Badge variant={attendanceStatusBadgeVariant(log.status)}>
          {log.meta?.label || log.label || log.status}
        </Badge>
      }
      subtitle={log.note || 'Daily attendance record'}
      action={
        showTodayClock ? (
          <ESSTimeClockActions
            canTimeIn={clockState.canTimeIn}
            canTimeOut={clockState.canTimeOut}
            onTimeIn={onTimeIn}
            onTimeOut={onTimeOut}
            punching={punching}
            size="sm"
          />
        ) : canEdit ? (
          <Button variant="secondary" size="sm" className="!h-7" onClick={() => onEdit?.(log)}>
            Edit
          </Button>
        ) : null
      }
      panelClassName="p-4"
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Clock in</dt>
          <dd className="mt-0.5 font-semibold text-gray-900">{log.checkIn || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Clock out</dt>
          <dd className="mt-0.5 font-semibold text-gray-900">{log.checkOut || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Hours</dt>
          <dd className="mt-0.5 font-semibold text-gray-900">{log.hours || '—'}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Source</dt>
          <dd className="mt-0.5 font-semibold text-gray-900">{log.source || '—'}</dd>
        </div>
      </dl>
    </DashboardInsightShell>
  )
}
