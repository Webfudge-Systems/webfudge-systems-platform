'use client'

import { useMemo } from 'react'
import { Users, Palmtree, Home } from 'lucide-react'
import { buildAttendanceSnapshot } from '../../lib/attendanceSnapshot'
import HRDashboardTile from './HRDashboardTile'
import { HRInsightCountBadge } from './HRDashboardInsightShell'
import {
  TileHighlightCard,
  TileBreakdownRow,
  TileFooterLink,
} from './tiles/DashboardTileUI'

export default function AttendanceSnapshotPanel({ activeEmployeeCount }) {
  const snap = useMemo(
    () => buildAttendanceSnapshot(activeEmployeeCount),
    [activeEmployeeCount]
  )

  const rows = [
    { key: 'present', label: 'Present', icon: Users, accent: 'emerald', value: snap.present },
    { key: 'onLeave', label: 'On leave', icon: Palmtree, accent: 'amber', value: snap.onLeave },
    { key: 'wfh', label: 'WFH', icon: Home, accent: 'sky', value: snap.wfh },
  ]

  return (
    <HRDashboardTile
      title="Attendance today"
      badge={<HRInsightCountBadge tone="emerald">{snap.markedPct}%</HRInsightCountBadge>}
      subtitle="Live check-in snapshot"
      panelClassName="flex flex-col gap-2 p-3"
    >
      <TileHighlightCard
        icon={Users}
        label="Checked in"
        title={`${snap.marked} of ${snap.roster} employees`}
        meta={`${snap.markedPct}% marked · ${snap.absent} absent`}
      />

      <ul className="flex flex-col gap-1.5">
        {rows.map((row) => (
          <TileBreakdownRow
            key={row.key}
            icon={row.icon}
            label={row.label}
            value={row.value}
            pct={snap.roster > 0 ? Math.round((row.value / snap.roster) * 100) : 0}
            accent={row.accent}
          />
        ))}
      </ul>

      <TileFooterLink href="/attendance" label="View attendance" />
    </HRDashboardTile>
  )
}
