'use client'

import { Target, ClipboardList, MessageSquare, TrendingUp } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import ESSKpiRow from '../layout/ESSKpiRow'

export default function ESSPerformanceKpiRow({ stats }) {
  if (!stats) return null
  return (
    <ESSKpiRow columns={4}>
      <KPICard
        title="Review Cycle"
        value={`${stats.cycleCompletion}%`}
        subtitle={stats.activeCycleName}
        icon={ClipboardList}
        colorScheme="orange"
      />
      <KPICard
        title="Goal Progress"
        value={`${stats.avgGoalProgress}%`}
        subtitle={`${stats.goalCount} aligned goals`}
        icon={Target}
        colorScheme="orange"
      />
      <KPICard
        title="My Appraisal"
        value={stats.appraisalRating != null ? String(stats.appraisalRating) : '—'}
        subtitle={stats.appraisalStatus}
        icon={TrendingUp}
        colorScheme="orange"
      />
      <KPICard
        title="Feedback Due"
        value={String(stats.pendingFeedback)}
        subtitle={stats.activePips > 0 ? `${stats.activePips} active PIP` : 'Pending tasks'}
        icon={MessageSquare}
        colorScheme="orange"
      />
    </ESSKpiRow>
  )
}
