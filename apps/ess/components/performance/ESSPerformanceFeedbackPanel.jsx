'use client'

import { Badge, DashboardInsightShell } from '@webfudge/ui'
import { Clock } from 'lucide-react'

export default function ESSPerformanceFeedbackPanel({
  pending = [],
  received = [],
  className = '',
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${className}`.trim()}>
      <DashboardInsightShell
        title="Feedback to complete"
        subtitle="Tasks during active review cycles"
        panelClassName="divide-y divide-gray-100/90"
      >
        {pending.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">No pending feedback tasks.</p>
        ) : (
          pending.map((row) => (
            <div key={row.id || row.label} className="flex items-start gap-2.5 px-3 py-3">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{row.label}</p>
                <p className="text-[11px] text-gray-500">
                  {row.type} · Due {row.due} · {row.reviewCycle}
                </p>
              </div>
            </div>
          ))
        )}
      </DashboardInsightShell>

      <DashboardInsightShell
        title="Feedback received"
        subtitle="Anonymized peer and manager notes"
        panelClassName="divide-y divide-gray-100/90"
      >
        {received.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-gray-500">No feedback received yet.</p>
        ) : (
          received.map((row) => (
            <div key={row.id || row.quote} className="px-3 py-3">
              <p className="text-sm text-gray-800 leading-snug">&ldquo;{row.quote}&rdquo;</p>
              <p className="mt-1.5 text-[11px] text-gray-500">
                {row.type} · {row.period}
              </p>
            </div>
          ))
        )}
      </DashboardInsightShell>
    </div>
  )
}
