'use client'

import { useMemo } from 'react'
import { ShieldCheck, Clock, CheckCircle2, Banknote } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import HRKpiRow from '../layout/HRKpiRow'
import { buildComplianceRows, computeComplianceStats, formatPayrollInr } from '../../lib/payrollPage'

export default function PayrollComplianceKpiRow({ selectedRun, filings = {}, sourceLines = [] }) {
  const stats = useMemo(() => {
    const rows = buildComplianceRows(selectedRun, filings, sourceLines)
    return computeComplianceStats(rows)
  }, [selectedRun, filings, sourceLines])

  const runLabel = selectedRun?.monthLabel || 'No run selected'
  const liabilityValue =
    stats.totalLiability > 0 ? formatPayrollInr(stats.totalLiability) : stats.applicable > 0 ? '₹0' : '—'
  const liabilitySubtitle =
    stats.totalLiability > 0
      ? 'PF, ESI, PT, TDS'
      : stats.applicable > 0
        ? 'No liability computed'
        : selectedRun
          ? 'Recalculate run to compute'
          : 'PF, ESI, PT, TDS'

  return (
    <HRKpiRow columns={4}>
      <KPICard
        title="Obligations"
        value={selectedRun ? stats.applicable : 0}
        subtitle={
          selectedRun
            ? stats.applicable > 0
              ? `${stats.applicable} with liability · ${runLabel}`
              : `${stats.total} statutory types · ${runLabel}`
            : 'Select a payroll run'
        }
        icon={ShieldCheck}
        colorScheme="orange"
      />
      <KPICard
        title="Pending"
        value={stats.pending}
        subtitle={
          stats.pending > 0
            ? 'Awaiting payroll lock'
            : selectedRun?.status === 'draft' || selectedRun?.status === 'review'
              ? 'Lock run to mark ready'
              : 'Nothing pending'
        }
        icon={Clock}
        colorScheme="orange"
      />
      <KPICard
        title="Filed"
        value={stats.filed}
        subtitle={stats.ready > 0 ? `${stats.ready} ready to file` : 'Recorded filings'}
        icon={CheckCircle2}
        colorScheme="orange"
      />
      <KPICard
        title="Total Liability"
        value={liabilityValue}
        valueTitle={stats.totalLiability > 0 ? formatPayrollInr(stats.totalLiability) : undefined}
        subtitle={liabilitySubtitle}
        icon={Banknote}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}
