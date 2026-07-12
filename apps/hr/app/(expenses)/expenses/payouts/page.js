'use client'

import ExpensesPageShell from '../../../../components/expenses/ExpensesPageShell'
import ExpensesPayoutsContent from '../../../../components/expenses/ExpensesPayoutsContent'
import ExpensesPayoutsKpiRow from '../../../../components/expenses/ExpensesPayoutsKpiRow'
import useExpenseData from '../../../../hooks/useExpenseData'
import { getExpensesPageMeta } from '../../../../lib/expensesNavigation'

export default function ExpensesPayoutsPage() {
  const { stats, payouts, loading } = useExpenseData()
  const pageMeta = getExpensesPageMeta('payouts')

  return (
    <ExpensesPageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      stats={stats}
      loading={loading}
      showKpis={pageMeta.showKpis}
      kpiSection={<ExpensesPayoutsKpiRow payouts={payouts} />}
    >
      <ExpensesPayoutsContent />
    </ExpensesPageShell>
  )
}
