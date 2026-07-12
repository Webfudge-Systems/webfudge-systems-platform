'use client'

import { Badge, DashboardInsightShell } from '@webfudge/ui'

function cycleBadgeVariant(status) {
  return String(status).toLowerCase() === 'active' ? 'success' : 'neutral'
}

export default function ESSPerformanceReviewsPanel({ cycles = [], className = '' }) {
  return (
    <DashboardInsightShell
      className={className}
      title="Review cycles"
      subtitle="Organization review periods"
      panelClassName="divide-y divide-gray-100/90"
    >
      {cycles.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-gray-500">No review cycles configured.</p>
      ) : (
        cycles.map((cycle) => (
          <div key={cycle.id || cycle.name} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{cycle.name}</p>
              <p className="text-[11px] text-gray-500">
                {cycle.period} · Due {cycle.due || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700">{cycle.completion}%</span>
              <Badge variant={cycleBadgeVariant(cycle.status)}>{cycle.status}</Badge>
            </div>
          </div>
        ))
      )}
    </DashboardInsightShell>
  )
}
