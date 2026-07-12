'use client'

import { Badge, DashboardInsightShell } from '@webfudge/ui'

export default function ESSPerformanceAppraisalPanel({ appraisals = [], pips = [], className = '' }) {
  const appraisal = appraisals[0]

  return (
    <div className={`grid grid-cols-1 gap-4 lg:grid-cols-2 ${className}`.trim()}>
      <DashboardInsightShell title="My appraisal" subtitle="Rating and compensation outcome" panelClassName="p-4">
        {appraisal ? (
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Rating</dt>
              <dd className="mt-0.5 text-2xl font-bold text-gray-900">{appraisal.rating}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Revision</dt>
              <dd className="mt-0.5 text-2xl font-bold text-orange-600">{appraisal.revision}%</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Promotion</dt>
              <dd className="mt-0.5 font-semibold text-gray-900">{appraisal.promotion}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Effective</dt>
              <dd className="mt-0.5 font-semibold text-gray-900">{appraisal.effective || '—'}</dd>
            </div>
            <div className="col-span-2">
              <Badge variant={appraisal.status === 'Approved' ? 'success' : 'warning'}>
                {appraisal.status}
              </Badge>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-gray-500">Your appraisal will appear here when HR opens the cycle.</p>
        )}
      </DashboardInsightShell>

      <DashboardInsightShell title="Performance improvement" subtitle="PIP status if applicable" panelClassName="p-4">
        {pips.length === 0 ? (
          <p className="text-sm text-gray-500">No active performance improvement plan.</p>
        ) : (
          pips.map((pip) => (
            <div key={pip.employee + pip.start} className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">PIP in progress</span>
                <Badge variant="warning">{pip.status}</Badge>
              </div>
              <p className="text-gray-600">Started {pip.start} · {pip.duration}</p>
              <p className="text-gray-600">Milestones: {pip.milestones}</p>
              <p className="text-gray-500 text-xs">Manager: {pip.manager}</p>
            </div>
          ))
        )}
      </DashboardInsightShell>
    </div>
  )
}
