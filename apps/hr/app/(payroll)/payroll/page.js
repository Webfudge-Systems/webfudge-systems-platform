'use client'

import PayrollPageShell from '../../../components/payroll/PayrollPageShell'
import PayrollOverviewContent from '../../../components/payroll/PayrollOverviewContent'
import usePayrollRunData from '../../../hooks/usePayrollRunData'
import { getPayrollPageMeta } from '../../../lib/payrollNavigation'

export default function PayrollOverviewPage() {
  const payroll = usePayrollRunData()
  const { breadcrumbLabel } = getPayrollPageMeta('overview')

  return (
    <PayrollPageShell
      sectionLabel={breadcrumbLabel}
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
    >
      <PayrollOverviewContent
        selectedRun={payroll.selectedRun}
        employeeRows={payroll.lineItems}
        readOnlyRun={payroll.readOnlyRun}
        actionError={payroll.actionError}
        lockBlockers={payroll.lockBlockers}
        error={payroll.error}
        onTransition={payroll.transition}
        onRecalculate={payroll.handleRecalculate}
        onReload={payroll.loadData}
        onOpenCreateRun={() => payroll.setRunCreateOpen(true)}
      />
    </PayrollPageShell>
  )
}
