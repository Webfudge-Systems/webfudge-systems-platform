'use client'

import PayrollPageShell from '../../../../components/payroll/PayrollPageShell'
import PayrollPayslipsContent from '../../../../components/payroll/PayrollPayslipsContent'
import PayrollPayslipsKpiRow from '../../../../components/payroll/PayrollPayslipsKpiRow'
import PayrollRunToolbar from '../../../../components/payroll/PayrollRunToolbar'
import usePayrollRunData from '../../../../hooks/usePayrollRunData'
import { getPayrollPageMeta } from '../../../../lib/payrollNavigation'

export default function PayrollPayslipsPage() {
  const payroll = usePayrollRunData()
  const pageMeta = getPayrollPageMeta('payslips')

  return (
    <PayrollPageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      stats={payroll.stats}
      selectedRun={payroll.selectedRun}
      runs={payroll.runs}
      selectedRunId={payroll.selectedRunId}
      onRunChange={payroll.handleRunChange}
      onCreateRun={() => payroll.setRunCreateOpen(true)}
      showRecalculate={payroll.selectedRun?.status === 'draft'}
      onRecalculate={payroll.handleRecalculate}
      loading={payroll.loading}
      runCreateOpen={payroll.runCreateOpen}
      onRunCreateClose={() => payroll.setRunCreateOpen(false)}
      newRunMonth={payroll.newRunMonth}
      onNewRunMonthChange={payroll.setNewRunMonth}
      newRunYear={payroll.newRunYear}
      onNewRunYearChange={payroll.setNewRunYear}
      onCreateRunSubmit={payroll.handleCreateRun}
      showKpis={pageMeta.showKpis}
      showRunToolbar={false}
    >
      <PayrollPayslipsKpiRow
        payslips={payroll.payslips}
        lineItems={payroll.lineItems}
        selectedRun={payroll.selectedRun}
      />
      <PayrollRunToolbar
        runs={payroll.runs}
        selectedRunId={payroll.selectedRunId}
        onRunChange={payroll.handleRunChange}
        onCreateRun={() => payroll.setRunCreateOpen(true)}
        showRecalculate={payroll.selectedRun?.status === 'draft'}
        onRecalculate={payroll.handleRecalculate}
      />
      {payroll.actionError ? <p className="text-sm text-red-600">{payroll.actionError}</p> : null}
      <PayrollPayslipsContent
        payslips={payroll.payslips}
        lineItems={payroll.lineItems}
        selectedRun={payroll.selectedRun}
        readOnlyRun={payroll.readOnlyRun}
        onReload={payroll.loadData}
        onRecalculate={payroll.handleRecalculate}
      />
    </PayrollPageShell>
  )
}
