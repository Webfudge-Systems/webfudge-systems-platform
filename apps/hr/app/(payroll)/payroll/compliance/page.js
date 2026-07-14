'use client'

import { useCallback, useEffect, useState } from 'react'
import PayrollPageShell from '../../../../components/payroll/PayrollPageShell'
import PayrollComplianceContent from '../../../../components/payroll/PayrollComplianceContent'
import PayrollComplianceKpiRow from '../../../../components/payroll/PayrollComplianceKpiRow'
import PayrollRunToolbar from '../../../../components/payroll/PayrollRunToolbar'
import usePayrollRunData from '../../../../hooks/usePayrollRunData'
import { getPayrollPageMeta } from '../../../../lib/payrollNavigation'
import { loadComplianceFilings } from '../../../../lib/complianceFilings'

export default function PayrollCompliancePage() {
  const payroll = usePayrollRunData()
  const pageMeta = getPayrollPageMeta('compliance')
  const [filings, setFilings] = useState({})

  const refreshFilings = useCallback((runId) => {
    setFilings(runId ? loadComplianceFilings(runId) : {})
  }, [])

  useEffect(() => {
    refreshFilings(payroll.selectedRun?.id)
  }, [payroll.selectedRun?.id, refreshFilings])

  const sourceLines = payroll.selectedRun?.lineItems || []

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
      <PayrollComplianceKpiRow selectedRun={payroll.selectedRun} filings={filings} sourceLines={sourceLines} />
      <PayrollRunToolbar
        runs={payroll.runs}
        selectedRunId={payroll.selectedRunId}
        onRunChange={payroll.handleRunChange}
        onCreateRun={() => payroll.setRunCreateOpen(true)}
        showRecalculate={payroll.selectedRun?.status === 'draft'}
        onRecalculate={payroll.handleRecalculate}
      />
      <PayrollComplianceContent
        selectedRun={payroll.selectedRun}
        sourceLines={sourceLines}
        filings={filings}
        onFilingsChange={setFilings}
        onRecalculate={payroll.handleRecalculate}
        onTransition={payroll.transition}
        onReload={payroll.loadData}
        actionError={payroll.actionError}
        lockBlockers={payroll.lockBlockers}
        readOnlyRun={payroll.readOnlyRun}
      />
    </PayrollPageShell>
  )
}
