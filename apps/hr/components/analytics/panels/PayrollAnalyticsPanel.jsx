'use client'

import { Wallet, TrendingUp, Users, BarChart3 } from 'lucide-react'
import { computePayrollKpis } from '../../../lib/analyticsPage'
import { PAYROLL_ANALYTICS } from '../../../lib/mock-data/analytics'
import HRAnalyticsKpiRow from '../HRAnalyticsKpiRow'
import PayrollAnalyticsCharts from '../charts/PayrollAnalyticsCharts'

export default function PayrollAnalyticsPanel() {
  const kpis = computePayrollKpis()

  const stats = [
    { title: 'Monthly gross', value: kpis.monthlyCost, subtitle: 'June 2026 run', icon: Wallet },
    { title: 'Per employee', value: kpis.costPerEmployee, subtitle: 'Average cost', icon: Users },
    {
      title: 'MoM change',
      value: kpis.momChange,
      change: 'Within budget',
      changeType: 'increase',
      icon: TrendingUp,
    },
    {
      title: 'Cost centers',
      value: String(PAYROLL_ANALYTICS.byDept.length),
      subtitle: 'Departments',
      icon: BarChart3,
    },
  ]

  return (
    <div className="space-y-4">
      <HRAnalyticsKpiRow items={stats} />
      <PayrollAnalyticsCharts />
    </div>
  )
}
