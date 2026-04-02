'use client'

import { Tabs } from '@webfudge/ui'
import DashboardTab, { KpiCards } from './components/DashboardTab'
import QuickActionsWidget from './components/QuickActionsWidget'
import ActivityFeedWidget from './components/ActivityFeedWidget'
import BooksGettingStartedPanel from './components/BooksGettingStartedPanel'
import BooksAnnouncementsPanel from './components/BooksAnnouncementsPanel'
import BooksRecentUpdatesPanel from './components/BooksRecentUpdatesPanel'
import { useEffect, useMemo, useState } from 'react'
import { booksApi } from '@/lib/api'
import type { Expense, Invoice, TimeEntry } from '@/lib/types'

export default function HomePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])

  useEffect(() => {
    booksApi.fetchInvoices().then((res) => setInvoices(res.data ?? [])).catch(() => setInvoices([]))
    booksApi.fetchExpenses().then((res) => setExpenses(res.data ?? [])).catch(() => setExpenses([]))
    booksApi.fetchTimeEntries().then((res) => setTimeEntries(res.data ?? [])).catch(() => setTimeEntries([]))
  }, [])

  const metrics = useMemo(() => {
    const totalReceivables = invoices.reduce((sum, invoice) => sum + (invoice.balanceDue ?? invoice.total ?? 0), 0)
    const totalPayables = expenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)
    const unbilledHours = timeEntries.filter((item) => item.billable && !item.invoiced).reduce((sum, item) => sum + item.hours, 0)
    const unbilledExpenses = expenses.filter((item) => item.billable).reduce((sum, item) => sum + item.amount, 0)
    return { totalReceivables, totalPayables, unbilledHours, unbilledExpenses }
  }, [expenses, invoices, timeEntries])

  return (
    <div className="-mx-4 min-h-full space-y-4 bg-slate-50 px-4 pb-8">
      <KpiCards metrics={metrics} />
      <Tabs
        variant="default"
        tabs={[
          {
            id: 'dashboard',
            label: 'Dashboard',
            content: (
              <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="space-y-6 xl:col-span-2">
                  <DashboardTab hideKpis />
                </div>
                <div className="space-y-6">
                  <QuickActionsWidget />
                  <ActivityFeedWidget />
                </div>
              </div>
            ),
          },
          { id: 'getting-started', label: 'Getting Started', content: <BooksGettingStartedPanel /> },
          { id: 'announcements', label: 'Announcements', content: <BooksAnnouncementsPanel /> },
          { id: 'recent-updates', label: 'Recent Updates', content: <BooksRecentUpdatesPanel /> },
        ]}
      />
    </div>
  )
}
