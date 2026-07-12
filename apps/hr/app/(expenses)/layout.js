'use client'

import { ExpenseDataProvider } from '../../hooks/useExpenseData'

export default function ExpensesLayout({ children }) {
  return <ExpenseDataProvider>{children}</ExpenseDataProvider>
}
