// @ts-nocheck
'use client'

import { Card, KPICard } from '@webfudge/ui'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'
import { Banknote, Clock3, Receipt, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { booksApi } from '@/lib/api'
import type { Expense, Invoice, TimeEntry } from '@/lib/types'
import { formatCurrency } from '@webfudge/utils'

const colors = ['#f97316', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa']
const monthKeys = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']

/** Matches CRM dashboard KPI grid + `KPICard` usage (`packages/ui/components/KPICard/KPICard.jsx`). */
const kpiColorSchemes = ['orange', 'orange', 'orange', 'orange'] as const

function KpiCards({ metrics }: { metrics: { totalReceivables: number; totalPayables: number; unbilledHours: number; unbilledExpenses: number } }) {
  const items = [
    {
      title: 'Total Receivables',
      value: formatCurrency(metrics.totalReceivables),
      subtitle: 'Current + overdue',
      icon: Receipt,
    },
    {
      title: 'Total Payables',
      value: formatCurrency(metrics.totalPayables),
      subtitle: 'Current + overdue',
      icon: Wallet,
    },
    {
      title: 'Unbilled Hours',
      value: `${metrics.unbilledHours.toFixed(1)}h`,
      subtitle: 'No unbilled time entries',
      icon: Clock3,
    },
    {
      title: 'Unbilled Expenses',
      value: formatCurrency(metrics.unbilledExpenses),
      subtitle: 'No pending billable expenses',
      icon: Banknote,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, index) => (
        <KPICard
          key={item.title}
          title={item.title}
          value={item.value}
          subtitle={item.subtitle}
          icon={item.icon}
          colorScheme={kpiColorSchemes[index] ?? 'orange'}
          iconColorScheme="orange"
        />
      ))}
    </div>
  )
}

export default function DashboardTab({ hideKpis = false }: { hideKpis?: boolean }) {
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

  const incomeVsExpense = useMemo(() => {
    const map = new Map<string, { month: string; income: number; expense: number }>()
    monthKeys.forEach((month) => map.set(month, { month, income: 0, expense: 0 }))

    invoices.forEach((invoice) => {
      const key = new Date(invoice.date).toLocaleString('en-US', { month: 'short' })
      if (map.has(key)) map.get(key)!.income += invoice.total ?? 0
    })
    expenses.forEach((expense) => {
      const key = new Date(expense.date).toLocaleString('en-US', { month: 'short' })
      if (map.has(key)) map.get(key)!.expense += expense.amount ?? 0
    })

    const values = Array.from(map.values())
    const hasData = values.some((v) => v.income > 0 || v.expense > 0)
    return hasData
      ? values
      : [
          { month: 'Jan', income: 12000, expense: 5000 },
          { month: 'Feb', income: 15000, expense: 7000 },
          { month: 'Mar', income: 18000, expense: 9000 },
          { month: 'Apr', income: 16000, expense: 8500 },
          { month: 'May', income: 19000, expense: 9500 },
        ]
  }, [expenses, invoices])

  const cashFlow = useMemo(
    () =>
      incomeVsExpense.map((row) => ({
        month: row.month,
        amount: row.income - row.expense,
      })),
    [incomeVsExpense]
  )

  const topExpenses = useMemo(() => {
    const grouped = expenses.reduce<Record<string, number>>((acc, item) => {
      const key = item.category || 'Other'
      acc[key] = (acc[key] ?? 0) + (item.amount ?? 0)
      return acc
    }, {})

    const sorted = Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    if (sorted.length === 0) {
      return [
        { name: 'Software', value: 35 },
        { name: 'Subcontractor', value: 30 },
        { name: 'Marketing', value: 20 },
        { name: 'Travel', value: 15 },
      ]
    }

    return sorted
  }, [expenses])

  return (
    <div className="space-y-4">
      {!hideKpis && <KpiCards metrics={metrics} />}

      <Card glass={true} className="p-4 bg-brand-light/40 backdrop-blur-md border border-white/40 rounded-xl shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Cash Flow</h3>
          <span className="text-xs text-brand-text-light">This Fiscal Year</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cashFlow}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Area type="monotone" dataKey="amount" stroke="#f97316" fill="#fed7aa" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card
          glass={true}
          className="p-4 xl:col-span-2 bg-brand-light/40 backdrop-blur-md border border-white/40 rounded-xl shadow-xl"
        >
          <h3 className="text-sm font-medium mb-3">Income and Expense</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeVsExpense}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="income" fill="#60a5fa" />
                <Bar dataKey="expense" fill="#f97316" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card glass={true} className="p-4 bg-brand-light/40 backdrop-blur-md border border-white/40 rounded-xl shadow-xl">
          <h3 className="text-sm font-medium mb-3">Top Expenses</h3>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={topExpenses} dataKey="value" nameKey="name" outerRadius={90}>
                  {topExpenses.map((_, index) => <Cell key={index} fill={colors[index % colors.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  )
}

export { KpiCards }
