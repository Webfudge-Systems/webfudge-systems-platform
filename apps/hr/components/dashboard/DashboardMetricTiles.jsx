'use client'

import { WorkforceStatusPanel } from './sidebar/DashboardSidebarPanels'
import AttendanceSnapshotPanel from './AttendanceSnapshotPanel'

/** Two equal square tiles — each ~sidebar width when stacked in the main column */
export default function DashboardMetricTiles({ activeEmployeeCount }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2">
      <WorkforceStatusPanel activeEmployeeCount={activeEmployeeCount} />
      <AttendanceSnapshotPanel activeEmployeeCount={activeEmployeeCount} />
    </div>
  )
}
