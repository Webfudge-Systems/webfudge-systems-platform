'use client'

import { Badge, Button, DashboardInsightShell } from '@webfudge/ui'
import { formatCurrency } from '../../lib/pageUtils'

export default function ESSPayslipView({
  employee,
  latest,
  payslip,
  onDownload,
  downloading,
  className = '',
}) {
  if (!latest) {
    return (
      <DashboardInsightShell
        className={className}
        title="Latest payslip"
        subtitle="Most recent processed payroll"
        panelClassName="p-6"
      >
        <p className="text-sm text-gray-500">Your payslip will appear here once HR processes payroll.</p>
      </DashboardInsightShell>
    )
  }

  return (
    <DashboardInsightShell
      className={className}
      title="Latest payslip"
      subtitle={`Pay period · ${latest.month}`}
      action={
        payslip?.id ? (
          <Button
            variant="primary"
            size="sm"
            className="!h-7 bg-orange-500 hover:bg-orange-600"
            disabled={downloading}
            onClick={() => onDownload?.(payslip.id, `payslip-${latest.month}.pdf`)}
          >
            Download PDF
          </Button>
        ) : null
      }
      panelClassName="p-5 space-y-5"
    >
      <div className="grid grid-cols-1 gap-3 border-b border-gray-100 pb-4 text-sm md:grid-cols-2">
        <p><span className="text-gray-500">Name:</span> {employee?.name}</p>
        <p><span className="text-gray-500">Employee ID:</span> {employee?.employeeId}</p>
        <p><span className="text-gray-500">Department:</span> {employee?.department}</p>
        <p><span className="text-gray-500">Designation:</span> {employee?.designation || employee?.role}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-sm">
        <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Gross</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(latest.gross)}</p>
        </div>
        <div className="rounded-lg border border-gray-100 bg-gray-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Deductions</p>
          <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(latest.deductions)}</p>
        </div>
      </div>
      <div className="rounded-xl bg-orange-50 p-4 ring-1 ring-orange-100">
        <p className="text-sm font-medium text-orange-700">Net pay</p>
        <p className="text-3xl font-bold text-orange-900">{formatCurrency(latest.net)}</p>
      </div>
      <Badge variant="success">{latest.status}</Badge>
    </DashboardInsightShell>
  )
}
