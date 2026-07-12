'use client'

import { Banknote, CheckCircle, Clock } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import HRKpiRow from '../layout/HRKpiRow'
import { computePayoutStats } from '../../lib/expensesPage'

export default function ExpensesPayoutsKpiRow({ payouts = [] }) {
  const stats = computePayoutStats(payouts)

  return (
    <HRKpiRow>
      <KPICard
        title="All Payouts"
        value={stats.total}
        subtitle={`${stats.scheduledLabel} scheduled`}
        icon={Banknote}
        colorScheme="orange"
      />
      <KPICard
        title="Scheduled"
        value={stats.scheduled}
        subtitle={`${stats.scheduledLabel} pending`}
        icon={Clock}
        colorScheme="orange"
      />
      <KPICard
        title="Completed"
        value={stats.completed}
        subtitle={`${stats.completedLabel} paid out`}
        icon={CheckCircle}
        colorScheme="orange"
      />
      <KPICard
        title="Total Value"
        value={stats.totalValueLabel}
        subtitle={`${stats.total} payout${stats.total === 1 ? '' : 's'} total`}
        icon={Banknote}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}
