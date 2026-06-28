'use client'

import { useCallback, useEffect, useState } from 'react'
import PayrollPageShell from '../../../../components/payroll/PayrollPageShell'
import PayrollLoansContent from '../../../../components/payroll/PayrollLoansContent'
import PayrollLoansKpiRow from '../../../../components/payroll/PayrollLoansKpiRow'
import PayrollRunToolbar from '../../../../components/payroll/PayrollRunToolbar'
import usePayrollRunData from '../../../../hooks/usePayrollRunData'
import { getPayrollPageMeta } from '../../../../lib/payrollNavigation'
import { loadLoanAdvances } from '../../../../lib/loanAdvances'

export default function PayrollLoansPage() {
  const payroll = usePayrollRunData()
  const pageMeta = getPayrollPageMeta('loans')
  const [loans, setLoans] = useState([])

  const refreshLoans = useCallback(() => {
    setLoans(loadLoanAdvances(payroll.selectedRun?.id, payroll.lineItems))
  }, [payroll.selectedRun?.id, payroll.lineItems])

  useEffect(() => {
    refreshLoans()
  }, [refreshLoans])

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
      <PayrollLoansKpiRow loans={loans} selectedRun={payroll.selectedRun} />
      <PayrollRunToolbar
        runs={payroll.runs}
        selectedRunId={payroll.selectedRunId}
        onRunChange={payroll.handleRunChange}
        onCreateRun={() => payroll.setRunCreateOpen(true)}
        showRecalculate={payroll.selectedRun?.status === 'draft'}
        onRecalculate={payroll.handleRecalculate}
      />
      <PayrollLoansContent
        selectedRun={payroll.selectedRun}
        lineItems={payroll.lineItems}
        loans={loans}
        onLoansChange={refreshLoans}
        onRecalculate={payroll.handleRecalculate}
        readOnlyRun={payroll.readOnlyRun}
        actionError={payroll.actionError}
      />
    </PayrollPageShell>
  )
}
