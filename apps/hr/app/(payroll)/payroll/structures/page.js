'use client'

import PayrollPageShell from '../../../../components/payroll/PayrollPageShell'
import PayrollStructuresContent from '../../../../components/payroll/PayrollStructuresContent'
import PayrollStructuresKpiRow from '../../../../components/payroll/PayrollStructuresKpiRow'
import usePayrollRunData from '../../../../hooks/usePayrollRunData'
import { getPayrollPageMeta } from '../../../../lib/payrollNavigation'

export default function PayrollStructuresPage() {
  const payroll = usePayrollRunData()
  const pageMeta = getPayrollPageMeta('structures')

  return (
    <PayrollPageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      stats={payroll.stats}
      selectedRun={payroll.selectedRun}
      loading={payroll.loading}
      showKpis={pageMeta.showKpis}
      showRunToolbar={pageMeta.showRunToolbar}
    >
      <PayrollStructuresKpiRow structures={payroll.structures} />
      <PayrollStructuresContent structures={payroll.structures} onReload={payroll.loadData} selectedRunId={payroll.selectedRun?.id} />
    </PayrollPageShell>
  )
}
