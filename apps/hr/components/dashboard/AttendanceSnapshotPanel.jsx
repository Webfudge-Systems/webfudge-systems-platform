'use client'

import { useMemo } from 'react'
import { UserCheck, Users, Palmtree, Home } from 'lucide-react'
import { buildAttendanceSnapshot } from '../../lib/attendanceSnapshot'
import HRDashboardTile from './HRDashboardTile'
import HRPanelHeader from '../shared/HRPanelHeader'
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
    <HRDashboardTile>
      <HRPanelHeader
        className="mb-3 shrink-0"
        title="Attendance today"
        subtitle="Live check-in snapshot"
        icon={UserCheck}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <TileHighlightCard
          icon={Users}
          label="Checked in"
          title={`${snap.marked} of ${snap.roster} employees`}
          meta={`${snap.markedPct}% marked · ${snap.absent} absent`}
        />

        <ul className="flex flex-1 flex-col justify-center gap-1.5">
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
      </div>

      <TileFooterLink href="/attendance" label="View attendance" />
    </HRDashboardTile>
  )
}
