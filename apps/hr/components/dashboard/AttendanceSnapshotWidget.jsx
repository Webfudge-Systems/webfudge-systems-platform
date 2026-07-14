'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button, EmptyState } from '@webfudge/ui'
import HRDashboardInsightShell, { HRInsightCountBadge } from './HRDashboardInsightShell'
import { Users } from 'lucide-react'
import { buildAttendanceSnapshot } from '../../lib/attendanceSnapshot'
import AttendanceActivityAreaChart from './AttendanceActivityAreaChart'

const SEGMENTS = [
  { key: 'present', label: 'Present', color: '#10B981' },
  { key: 'onLeave', label: 'On leave', color: '#FF7A00' },
  { key: 'wfh', label: 'WFH', color: '#3B82F6' },
  { key: 'absent', label: 'Absent', color: '#EF4444' },
]

const RADIUS = 38
const STROKE = 10
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const DONUT_SIZE = 124

function AttendanceDonutChart({ snap }) {
  const values = {
    present: snap.present || 0,
    onLeave: snap.onLeave || 0,
    wfh: snap.wfh || 0,
    absent: snap.absent || 0,
  }
  const total = Object.values(values).reduce((sum, n) => sum + n, 0)

  let offset = 0
  const arcs = SEGMENTS.map((seg) => {
    const value = values[seg.key] || 0
    const fraction = total > 0 ? value / total : 0
    const length = fraction * CIRCUMFERENCE
    const arc = {
      ...seg,
      value,
      percent: total > 0 ? ((value / total) * 100).toFixed(1).replace(/\.0$/, '') : '0',
      strokeDasharray: `${length} ${CIRCUMFERENCE - length}`,
      strokeDashoffset: -offset,
    }
    offset += length
    return arc
  })

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="relative shrink-0" style={{ width: DONUT_SIZE, height: DONUT_SIZE }}>
        <svg
          width={DONUT_SIZE}
          height={DONUT_SIZE}
          viewBox="0 0 120 120"
          className="block"
          aria-hidden
        >
          <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#E5E7EB" strokeWidth={STROKE} />
          {total > 0
            ? arcs.map((arc) =>
                arc.value > 0 ? (
                  <circle
                    key={arc.key}
                    cx="60"
                    cy="60"
                    r={RADIUS}
                    fill="none"
                    stroke={arc.color}
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={arc.strokeDasharray}
                    strokeDashoffset={arc.strokeDashoffset}
                    transform="rotate(-90 60 60)"
                  />
                ) : null
              )
            : null}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl font-bold tabular-nums leading-none text-gray-900">{total}</span>
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-500">
            roster
          </span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {arcs.map((arc) => (
          <li key={arc.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: arc.color }}
                aria-hidden
              />
              <span className="font-medium text-gray-700">{arc.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-gray-600">
              <span className="font-semibold text-gray-900">{arc.value}</span>
              <span className="text-gray-400"> ({arc.percent}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function AttendanceSnapshotWidget({
  activeEmployeeCount,
  attendanceSnapshot = null,
  className = '',
}) {
  const router = useRouter()
  const snap = useMemo(() => {
    if (attendanceSnapshot) return attendanceSnapshot
    return buildAttendanceSnapshot(activeEmployeeCount)
  }, [attendanceSnapshot, activeEmployeeCount])

  return (
    <HRDashboardInsightShell
      fillHeight
      className={className}
      title="Attendance today"
      badge={
        snap.roster > 0 ? (
          <HRInsightCountBadge tone="emerald">{snap.markedPct}%</HRInsightCountBadge>
        ) : null
      }
      subtitle="Status breakdown"
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
    >
      {snap.roster === 0 ? (
        <EmptyState
          icon={Users}
          title="No roster data"
          description="Employee attendance will appear here."
          className="py-5"
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col justify-between">
          <AttendanceDonutChart snap={snap} />
          <AttendanceActivityAreaChart
            activeEmployeeCount={activeEmployeeCount}
            days={7}
            className="mt-auto pb-2"
          />
        </div>
      )}
    </HRDashboardInsightShell>
  )
}
