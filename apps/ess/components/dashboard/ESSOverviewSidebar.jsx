'use client'

import ESSPendingRequestsWidget from './ESSPendingRequestsWidget'
import ESSRecentActivityWidget from './ESSRecentActivityWidget'
import ESSUpcomingHolidaysWidget from './ESSUpcomingHolidaysWidget'

/** Right column on overview — mirrors HR DashboardSidebar stacking pattern */
export default function ESSOverviewSidebar({
  pendingRequests = [],
  activities = [],
  holidays = [],
  className = '',
}) {
  return (
    <div className={`flex min-h-0 flex-col gap-4 self-stretch ${className}`.trim()}>
      <ESSPendingRequestsWidget requests={pendingRequests} className="min-h-0" />
      <ESSRecentActivityWidget activities={activities} className="min-h-0" />
      <ESSUpcomingHolidaysWidget holidays={holidays} className="min-h-0" />
    </div>
  )
}
