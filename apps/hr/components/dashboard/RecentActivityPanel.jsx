'use client'

import { History } from 'lucide-react'
import { ActivitiesTimeline } from '@webfudge/ui'
import HRGlassCard from '../shared/HRGlassCard'
import HRPanelHeader from '../shared/HRPanelHeader'

export default function RecentActivityPanel({ items }) {
  return (
    <HRGlassCard>
      <HRPanelHeader title="Recent activity" subtitle="Latest updates across HR" icon={History} />
      <ActivitiesTimeline items={items} />
    </HRGlassCard>
  )
}
