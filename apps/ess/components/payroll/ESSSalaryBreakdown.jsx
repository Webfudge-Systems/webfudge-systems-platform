'use client'

import { DashboardInsightShell } from '@webfudge/ui'
import { formatCurrency } from '../../lib/pageUtils'

export default function ESSSalaryBreakdown({
  salaryStructure,
  employee,
  className = '',
}) {
  const earnings = salaryStructure?.earnings || employee?.salaryEarnings || []
  const deductions = salaryStructure?.deductions || employee?.salaryDeductions || []
  const annualCtc = salaryStructure?.annualCtc || employee?.annualCtc

  if (!annualCtc && !earnings.length) {
    return (
      <DashboardInsightShell
        className={className}
        title="Salary breakdown"
        subtitle="Monthly earnings and deductions"
        panelClassName="p-6"
      >
        <p className="text-sm text-gray-500">
          Your salary details will be visible here once HR completes your setup.
        </p>
      </DashboardInsightShell>
    )
  }

  return (
    <DashboardInsightShell
      className={className}
      title="Salary breakdown"
      subtitle="Monthly earnings and deductions"
      panelClassName="p-4 space-y-4"
    >
      <div className="rounded-xl bg-orange-50 p-4 ring-1 ring-orange-100">
        <p className="text-sm text-orange-700">Annual CTC</p>
        <p className="text-2xl font-bold text-orange-900">{formatCurrency(annualCtc)}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Earnings (monthly)</h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {(earnings.length ? earnings : [{ name: 'Basic', monthly: employee?.monthlyBasic }]).map(
              (row, i) => (
                <p key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">{row.name || row.component}</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(row.monthly || row.amount)}
                  </span>
                </p>
              ),
            )}
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-900">Deductions (monthly)</h3>
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
            {deductions.length ? (
              deductions.map((row, i) => (
                <p key={i} className="flex justify-between px-3 py-2 text-sm">
                  <span className="text-gray-700">{row.name || row.component}</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(row.monthly || row.amount)}
                  </span>
                </p>
              ))
            ) : (
              <p className="px-3 py-2 text-sm text-gray-500">No deductions configured</p>
            )}
          </div>
        </div>
      </div>
    </DashboardInsightShell>
  )
}
