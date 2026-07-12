'use client'

import { DashboardInsightShell, EmptyState } from '@webfudge/ui'
import { Calendar } from 'lucide-react'

function formatHolidayDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return dateString
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function ESSUpcomingHolidaysWidget({ holidays = [], className = '' }) {
  return (
    <DashboardInsightShell
      className={className}
      title="Upcoming holidays"
      subtitle="Company calendar from HR"
      panelClassName="divide-y divide-gray-100/90"
    >
      {holidays.length ? (
        holidays.map((holiday) => (
          <div
            key={holiday.id || holiday.date}
            className="flex items-center gap-3 px-3 py-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
              <Calendar className="h-4 w-4" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-900">{holiday.name}</p>
              <p className="text-[11px] text-gray-500">{formatHolidayDate(holiday.date)}</p>
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          icon={Calendar}
          title="No upcoming holidays"
          description="Company holidays will appear here once HR adds them."
          className="py-5"
        />
      )}
    </DashboardInsightShell>
  )
}
