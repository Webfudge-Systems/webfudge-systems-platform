'use client'

import { AlertCircle, CheckCircle2 } from 'lucide-react'
import ESSTimeClockActions from './ESSTimeClockActions'

export default function ESSAttendanceTodayBanner({
  clockState,
  onTimeIn,
  onTimeOut,
  punching = null,
}) {
  if (!clockState || clockState.blocked) return null

  if (clockState.isComplete) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 shadow-sm">
        <div className="flex min-w-0 items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2} />
          <div>
            <p className="text-sm font-semibold text-emerald-950">Today&apos;s attendance is complete</p>
            <p className="mt-0.5 text-xs text-emerald-800/80">
              In {clockState.clockIn} · Out {clockState.clockOut}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const title = clockState.hasIn
    ? 'You are clocked in — remember to time out'
    : "You haven't clocked in yet today"
  const subtitle = clockState.hasIn
    ? `Clocked in at ${clockState.clockIn}. Tap Time Out when you finish.`
    : 'Tap Time In when you start your workday.'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-orange-50/70 px-4 py-3 shadow-sm">
      <div className="flex min-w-0 items-start gap-2.5">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" strokeWidth={2} />
        <div>
          <p className="text-sm font-semibold text-orange-950">{title}</p>
          <p className="mt-0.5 text-xs text-orange-800/80">{subtitle}</p>
        </div>
      </div>
      <ESSTimeClockActions
        canTimeIn={clockState.canTimeIn}
        canTimeOut={clockState.canTimeOut}
        onTimeIn={onTimeIn}
        onTimeOut={onTimeOut}
        punching={punching}
        size="sm"
      />
    </div>
  )
}
