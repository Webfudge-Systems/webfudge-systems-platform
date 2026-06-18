'use client'

import WorkforceStatusWidget from './WorkforceStatusWidget'
import AttendanceSnapshotWidget from './AttendanceSnapshotWidget'
import PendingApprovalsWidget from './PendingApprovalsWidget'
import RecruitmentPipelineWidget from './RecruitmentPipelineWidget'

const TILE_CLASS = 'h-full min-h-0'

/** Four equal insight cards in a 2×2 grid below department distribution */
export default function DashboardMetricTiles({ activeEmployeeCount }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
      <WorkforceStatusWidget activeEmployeeCount={activeEmployeeCount} className={TILE_CLASS} />
      <AttendanceSnapshotWidget activeEmployeeCount={activeEmployeeCount} className={TILE_CLASS} />
      <PendingApprovalsWidget className={TILE_CLASS} />
      <RecruitmentPipelineWidget className={TILE_CLASS} />
    </div>
  )
}
