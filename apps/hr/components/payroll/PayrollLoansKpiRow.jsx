'use client'

import { useMemo } from 'react'
import { CreditCard, CheckCircle2, Clock, Banknote } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import HRKpiRow from '../layout/HRKpiRow'
import { computeLoanAdvanceStats, formatPayrollInr } from '../../lib/payrollPage'

export default function PayrollLoansKpiRow({ loans = [], selectedRun }) {
  const stats = useMemo(() => computeLoanAdvanceStats(loans), [loans])
  const runLabel = selectedRun?.monthLabel || 'No run selected'

  return (
    <HRKpiRow columns={4}>
      <KPICard
        title="Active"
        value={stats.active}
        subtitle={
          stats.active > 0
            ? `${stats.loans} loan${stats.loans === 1 ? '' : 's'} · ${stats.advances} advance${stats.advances === 1 ? '' : 's'}`
            : selectedRun
              ? 'No active records'
              : 'Select a payroll run'
        }
        icon={CheckCircle2}
        colorScheme="orange"
      />
      <KPICard
        title="Outstanding"
        value={stats.outstandingTotal > 0 ? formatPayrollInr(stats.outstandingTotal) : '₹0'}
        valueTitle={stats.outstandingTotal > 0 ? formatPayrollInr(stats.outstandingTotal) : undefined}
        subtitle="Total balance remaining"
        icon={Banknote}
        colorScheme="orange"
      />
      <KPICard
        title="Monthly EMI"
        value={
          stats.appliedDeductionsThisRun > 0
            ? formatPayrollInr(stats.appliedDeductionsThisRun)
            : stats.pendingDeductionsThisRun > 0
              ? formatPayrollInr(stats.pendingDeductionsThisRun)
              : '₹0'
        }
        subtitle={
          stats.appliedDeductionsThisRun > 0
            ? `Applied in ${runLabel}`
            : stats.pendingDeductionsThisRun > 0
              ? `${formatPayrollInr(stats.pendingDeductionsThisRun)} pending this run`
              : 'Payroll deductions this run'
        }
        icon={Clock}
        colorScheme="orange"
      />
      <KPICard
        title="Records"
        value={stats.total}
        subtitle={
          stats.pending > 0
            ? `${stats.pending} pending approval · ${runLabel}`
            : selectedRun
              ? runLabel
              : 'All runs'
        }
        icon={CreditCard}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}
