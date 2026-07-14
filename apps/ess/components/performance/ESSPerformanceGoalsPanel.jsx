'use client'

import { DashboardInsightShell, DashboardProgressRow, InsightCountBadge } from '@webfudge/ui'
import { goalAvgProgress } from '../../lib/performanceEssService'

export default function ESSPerformanceGoalsPanel({ goals = [], className = '' }) {
  return (
    <DashboardInsightShell
      className={className}
      title="Aligned goals"
      badge={<InsightCountBadge tone="orange">{goals.length}</InsightCountBadge>}
      subtitle="Company and department objectives"
      panelClassName="divide-y divide-gray-100/90"
    >
      {goals.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-gray-500">No goals assigned to your scope yet.</p>
      ) : (
        goals.map((goal) => {
          const progress = Math.round(goalAvgProgress(goal))
          return (
            <div key={goal.id || goal.objective} className="space-y-2 px-3 py-3">
              <DashboardProgressRow
                label={goal.objective}
                meta={`${goal.keyResults?.length || 0} key results`}
                percent={progress}
                avatarFallback="G"
                avatarClassName="bg-violet-500 text-white"
                barColor={progress >= 50 ? 'green' : 'orange'}
              />
              <div className="space-y-1 pl-9">
                {(goal.keyResults || []).map((kr) => (
                  <p key={kr.label} className="text-[11px] text-gray-600">
                    {kr.label} · {kr.progress}%
                  </p>
                ))}
              </div>
            </div>
          )
        })
      )}
    </DashboardInsightShell>
  )
}
