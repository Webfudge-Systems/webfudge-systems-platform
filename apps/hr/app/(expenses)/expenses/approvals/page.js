'use client'

import ExpensesPageShell from '../../../../components/expenses/ExpensesPageShell'
import ExpensesApprovalsContent from '../../../../components/expenses/ExpensesApprovalsContent'
import useExpenseData from '../../../../hooks/useExpenseData'
import { getExpensesPageMeta } from '../../../../lib/expensesNavigation'

export default function ExpensesApprovalsPage() {
  const { stats, loading } = useExpenseData()
  const pageMeta = getExpensesPageMeta('approvals')

  return (
    <ExpensesPageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle ?? `${stats.pending} pending approval${stats.pending === 1 ? '' : 's'}`}
      stats={stats}
      loading={loading}
      showKpis={pageMeta.showKpis}
    >
      <ExpensesApprovalsContent />
    </ExpensesPageShell>
  )
}
