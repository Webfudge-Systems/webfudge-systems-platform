'use client'

import { Card, Tabs } from '@webfudge/ui'
import DashboardTab, { KpiCards } from './components/DashboardTab'
import { useEffect, useMemo, useState } from 'react'
import { booksApi } from '@/lib/api'
import type { Expense, Invoice, TimeEntry } from '@/lib/types'

const TabPanel = ({ title, body }: { title: string; body: string }) => (
  <Card className="p-6">
    <h3 className="text-base font-semibold">{title}</h3>
    <p className="text-sm text-gray-600 mt-2">{body}</p>
  </Card>
)

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
    <div className="space-y-4 bg-white min-h-full">
      <KpiCards metrics={metrics} />
      <Tabs
        variant="segmented"
        tabs={[
          { id: 'dashboard', label: 'Dashboard', content: <DashboardTab hideKpis /> },
          { id: 'getting-started', label: 'Getting Started', content: <TabPanel title="Getting Started" body="Connect accounts, configure invoice settings, and create your first agency client." /> },
          { id: 'announcements', label: 'Announcements', content: <TabPanel title="Announcements" body="Release notes and product updates for Books are shown here." /> },
          { id: 'recent-updates', label: 'Recent Updates', content: <TabPanel title="Recent Updates" body="Track recently updated invoices, projects, and expenses." /> },
        ]}
      />
    </div>
  )
}
