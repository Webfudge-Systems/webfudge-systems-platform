'use client'

import { ActivitiesTimeline } from '@webfudge/ui'
import HRDashboardInsightShell, { HRInsightCountBadge } from './HRDashboardInsightShell'

export default function RecentActivityPanel({ items, className = '' }) {
  return (
    <HRDashboardInsightShell
      className={className}
      title="Recent activity"
      badge={
        items.length > 0 ? (
          <HRInsightCountBadge tone="blue">{items.length}</HRInsightCountBadge>
        ) : null
      }
      subtitle="Latest updates across HR"
      panelClassName="p-3"
    >
      <ActivitiesTimeline items={items} />
    </HRDashboardInsightShell>
  )
}
