'use client'

import dynamic from 'next/dynamic'
import { memo, useCallback, useMemo } from 'react'
import {
  leaveCalendarEventsKey,
  mapLeaveRequestsToCalendarEvents,
} from '../../lib/leaveCalendar'

const UnifiedWorkspaceCalendar = dynamic(
  () => import('@webfudge/ui').then((m) => ({ default: m.UnifiedWorkspaceCalendar })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-gray-200 bg-white p-8">
        <p className="text-sm text-gray-500">Loading calendar…</p>
      </div>
    ),
  },
)

const LEAVE_LEGEND = [
  { label: 'Approved leave', dotClass: 'bg-orange-500' },
  { label: 'Pending request', dotClass: 'bg-gray-400' },
]

const LeaveCalendarGrid = memo(function LeaveCalendarGrid({ events, onEventClick }) {
  const handleEventClick = useCallback(
    ({ entity }) => {
      onEventClick?.(entity?.leaveRequestId)
    },
    [onEventClick],
  )

  return (
    <UnifiedWorkspaceCalendar
      events={events}
      onEventClick={handleEventClick}
      height="auto"
    />
  )
})

function LeaveCalendarView({
  requests = [],
  onEventClick,
}) {
  const eventsKey = useMemo(() => leaveCalendarEventsKey(requests), [requests])
  const events = useMemo(() => mapLeaveRequestsToCalendarEvents(requests), [eventsKey])

  const handleEventClick = useCallback(
    (leaveRequestId) => {
      if (!leaveRequestId) return
      const request = requests.find((row) => String(row.id) === String(leaveRequestId))
      if (request) onEventClick?.(request)
    },
    [onEventClick, requests],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex flex-wrap items-center gap-4">
          {LEAVE_LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} aria-hidden />
              {item.label}
            </span>
          ))}
        </div>
        <p className="text-xs text-gray-500">
          {events.length} leave event{events.length === 1 ? '' : 's'} on calendar
        </p>
      </div>
      <LeaveCalendarGrid events={events} onEventClick={handleEventClick} />
    </div>
  )
}

export default memo(LeaveCalendarView)
