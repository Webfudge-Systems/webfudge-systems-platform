'use client'

import ExpensesPageShell from '../../../../components/expenses/ExpensesPageShell'
import ExpensesReportsContent from '../../../../components/expenses/ExpensesReportsContent'
import useExpenseData from '../../../../hooks/useExpenseData'
import { getExpensesPageMeta } from '../../../../lib/expensesNavigation'

export default function ExpensesReportsPage() {
  const { loading } = useExpenseData()
  const pageMeta = getExpensesPageMeta('reports')

  return (
    <ExpensesPageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      stats={{}}
      loading={loading}
      showKpis={false}
    >
      <ExpensesReportsContent />
    </ExpensesPageShell>
  )
}
