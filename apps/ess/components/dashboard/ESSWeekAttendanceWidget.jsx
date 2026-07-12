'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, DashboardInsightShell, InsightCountBadge } from '@webfudge/ui'

export default function ESSWeekAttendanceWidget({ weekStrip = [], className = '' }) {
  const router = useRouter()
  const markedCount = weekStrip.filter((day) => day.status === 'present' || day.status === 'wfh').length

  return (
    <DashboardInsightShell
      className={className}
      title="This week's attendance"
      badge={markedCount > 0 ? <InsightCountBadge tone="orange">{markedCount}/7</InsightCountBadge> : null}
      subtitle="Sun – Sat status for the current week"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/attendance')}
          className="!h-7 !px-2 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
        >
          View all
        </Button>
      }
      panelClassName="p-4"
    >
      <div className="grid grid-cols-7 gap-2">
        {weekStrip.map((day) => (
          <Link
            key={day.date}
            href="/attendance"
            className="group text-center"
            title={`${day.meta.label} · ${day.date}`}
          >
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-500 group-hover:text-gray-700">
              {day.label}
            </p>
            <div
              className={`mx-auto flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold transition-shadow ${
                day.meta.cellClass || day.meta.badgeClass
              } ${day.isToday ? 'ring-2 ring-orange-500 ring-offset-1' : ''}`}
            >
              {new Date(day.date).getDate()}
            </div>
          </Link>
        ))}
      </div>
      {weekStrip.length === 0 ? (
        <p className="mt-3 text-center text-xs text-gray-500">No attendance data for this week yet.</p>
      ) : null}
    </DashboardInsightShell>
  )
}
