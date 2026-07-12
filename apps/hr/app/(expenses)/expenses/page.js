'use client'

import ExpensesPageShell from '../../../components/expenses/ExpensesPageShell'
import ExpensesClaimsContent from '../../../components/expenses/ExpensesClaimsContent'
import useExpenseData from '../../../hooks/useExpenseData'
import { getExpensesPageMeta } from '../../../lib/expensesNavigation'

export default function ExpensesClaimsPage() {
  const { stats, loading } = useExpenseData()
  const pageMeta = getExpensesPageMeta('claims')

  return (
    <ExpensesPageShell
      sectionLabel={pageMeta.breadcrumbLabel}
      subtitle={pageMeta.subtitle}
      stats={stats}
      loading={loading}
      showKpis={pageMeta.showKpis}
      onImportClick={() => console.log('Import expenses')}
      onExportClick={() => console.log('Export expenses')}
    >
      <ExpensesClaimsContent />
    </ExpensesPageShell>
  )
}
