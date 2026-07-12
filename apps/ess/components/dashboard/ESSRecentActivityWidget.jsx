'use client'

import { useRouter } from 'next/navigation'
import { ActivitiesTimeline, Button, DashboardInsightShell, EmptyState } from '@webfudge/ui'
import { Activity } from 'lucide-react'

export default function ESSRecentActivityWidget({ activities = [], className = '' }) {
  const router = useRouter()

  return (
    <DashboardInsightShell
      className={className}
      title="Recent activity"
      subtitle="Your latest HR events"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/activity')}
          className="!h-7 !px-2 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
        >
          Full log
        </Button>
      }
      panelClassName="p-3"
    >
      {activities.length ? (
        <ActivitiesTimeline items={activities} />
      ) : (
        <EmptyState
          icon={Activity}
          title="No recent activity"
          description="Your activity feed will appear here."
          className="py-5"
        />
      )}
    </DashboardInsightShell>
  )
}
