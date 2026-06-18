'use client'

import UpcomingEventsWidget from '../UpcomingEventsWidget'

export { default as PendingApprovalsWidget } from '../PendingApprovalsWidget'
export { default as WorkforceStatusWidget } from '../WorkforceStatusWidget'
export { default as AttendanceSnapshotWidget } from '../AttendanceSnapshotWidget'

export function CurrentGoodPanel() {
  return <UpcomingEventsWidget className="h-full min-h-0" />
}

/** Right column: Current good — aligns with headcount + workforce/pending only */
export default function DashboardSidebar({ className = '' }) {
  return (
    <div className={`flex min-h-0 flex-col self-stretch ${className}`.trim()}>
      <CurrentGoodPanel />
    </div>
  )
}
