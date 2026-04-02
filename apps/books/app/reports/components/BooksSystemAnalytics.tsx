'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, KPICard, Select } from '@webfudge/ui'
import { Banknote, Clock3, Receipt, Wallet } from 'lucide-react'
import { booksApi } from '@/lib/api'
import type { BankAccount, Expense, Invoice, Project, TimeEntry } from '@/lib/types'
import { formatCurrency } from '@webfudge/utils'
import BooksFinancialCharts from './BooksFinancialCharts'

export default function BooksSystemAnalytics() {
  const [timeRange, setTimeRange] = useState<'this_fiscal_year' | 'previous_fiscal_year' | 'last_12_months'>('this_fiscal_year')
  // Backend analytics not connected yet: keep the UI in "0-data" placeholder mode,
  // even when "This Fiscal Year" is selected (to match reference screenshots).
  const zeroMode = true

  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      try {
        const [invRes, expRes, teRes, projRes, bankRes] = await Promise.allSettled([
          booksApi.fetchInvoices(),
          booksApi.fetchExpenses(),
          booksApi.fetchTimeEntries(),
          booksApi.fetchProjects(),
          booksApi.fetchBankAccounts(),
        ])

        if (cancelled) return

        setInvoices(invRes.status === 'fulfilled' ? invRes.value.data ?? [] : [])
        setExpenses(expRes.status === 'fulfilled' ? expRes.value.data ?? [] : [])
        setTimeEntries(teRes.status === 'fulfilled' ? teRes.value.data ?? [] : [])
        setProjects(projRes.status === 'fulfilled' ? projRes.value.data ?? [] : [])
        setBankAccounts(bankRes.status === 'fulfilled' ? bankRes.value.data ?? [] : [])
      } catch {
        if (cancelled) return
        setInvoices([])
        setExpenses([])
        setTimeEntries([])
        setProjects([])
        setBankAccounts([])
      }
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

  const kpis = useMemo(() => {
    const totalReceivables = invoices.reduce((sum, invoice) => sum + (invoice.balanceDue ?? invoice.total ?? 0), 0)
    const totalPayables = expenses.reduce((sum, expense) => sum + (expense.amount ?? 0), 0)

    const unbilledHours = timeEntries.filter((t) => t.billable && !t.invoiced).reduce((sum, t) => sum + t.hours, 0)
    const unbilledExpenses = expenses.filter((e) => e.billable).reduce((sum, e) => sum + e.amount, 0)

    return { totalReceivables, totalPayables, unbilledHours, unbilledExpenses }
  }, [expenses, invoices, timeEntries])

  const displayKpis = useMemo(() => {
    if (!zeroMode) return kpis
    return { totalReceivables: 0, totalPayables: 0, unbilledHours: 0, unbilledExpenses: 0 }
  }, [kpis, zeroMode])

  const topProjects = useMemo(() => {
    return projects.slice(0, 4).map((p) => ({
      id: p.id,
      name: p.name,
      status: p.status,
    }))
  }, [projects])

  const topBankAccounts = useMemo(() => {
    return [...bankAccounts]
      .sort((a, b) => (b.balance ?? 0) - (a.balance ?? 0))
      .slice(0, 4)
  }, [bankAccounts])

  const timeRangeOptions = useMemo(
    () => [
      { value: 'this_fiscal_year', label: 'This Fiscal Year' },
      { value: 'previous_fiscal_year', label: 'Previous Fiscal Year' },
      { value: 'last_12_months', label: 'Last 12 Months' },
    ],
    []
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-2">
        <KPICard
          title="Total Receivables"
          value={formatCurrency(displayKpis.totalReceivables)}
          subtitle={zeroMode ? '0 for selected range' : 'Current + overdue'}
          icon={Receipt}
          colorScheme="orange"
        />
        <KPICard
          title="Total Payables"
          value={formatCurrency(displayKpis.totalPayables)}
          subtitle={zeroMode ? '0 for selected range' : 'Current + overdue'}
          icon={Wallet}
          colorScheme="orange"
        />
      </div>

      <div className="flex items-center justify-end">
        <div className="w-56">
          <Select
            value={timeRange}
            options={timeRangeOptions}
            onChange={(v) => setTimeRange(v as typeof timeRange)}
          />
        </div>
      </div>

      <BooksFinancialCharts timeRange={timeRange} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card variant="elevated" padding={false} className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Projects</h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Clock3 className="h-4 w-4" />
                Unbilled Hours
              </span>
              <span className="font-medium text-gray-900">{displayKpis.unbilledHours.toFixed(1)}h</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-gray-600">
                <Banknote className="h-4 w-4" />
                Unbilled Expenses
              </span>
              <span className="font-medium text-gray-900">{formatCurrency(displayKpis.unbilledExpenses)}</span>
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Project list</h4>
            {topProjects.length === 0 ? (
              <div className="text-xs text-gray-500 py-4 text-center">No projects yet</div>
            ) : (
              <div className="space-y-2">
                {topProjects.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-gray-700">{p.name}</span>
                    <span className="text-xs text-gray-500">{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card variant="elevated" padding={false} className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Bank and Credit Cards</h3>
          </div>

          <div className="space-y-2">
            {topBankAccounts.length === 0 ? (
              <div className="text-xs text-gray-500 py-4 text-center">No bank accounts yet</div>
            ) : (
              topBankAccounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-gray-700">{acc.name}</span>
                  <span className="font-medium text-gray-900">{formatCurrency(zeroMode ? 0 : acc.balance ?? 0)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

