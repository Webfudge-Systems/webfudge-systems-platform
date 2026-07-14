'use client'

import { useMemo } from 'react'
import { FileText, CheckCircle2, Clock, Users } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import HRKpiRow from '../layout/HRKpiRow'
import { computePayslipStats } from '../../lib/payrollPage'

function countLabel(count, singular, plural = `${singular}s`) {
  if (count === 0) return `No ${plural}`
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural}`
}

export default function PayrollPayslipsKpiRow({ payslips = [], lineItems = [], selectedRun }) {
  const stats = useMemo(() => computePayslipStats(payslips, lineItems), [payslips, lineItems])
  const runLabel = selectedRun?.monthLabel || 'No run selected'
  const runStatus = String(selectedRun?.status || 'draft')

  return (
    <HRKpiRow columns={4}>
      <KPICard
        title="Generated"
        value={stats.generated}
        subtitle={countLabel(stats.generated, 'payslip')}
        icon={CheckCircle2}
        colorScheme="orange"
      />
      <KPICard
        title="Pending"
        value={stats.pending}
        subtitle={stats.pending === 0 ? 'All payslips ready' : 'Awaiting generation'}
        icon={Clock}
        colorScheme="orange"
      />
      <KPICard
        title="Employees"
        value={stats.employeesInRun}
        subtitle={stats.employeesInRun === 0 ? 'No employees in run' : `In ${runLabel}`}
        icon={Users}
        colorScheme="orange"
      />
      <KPICard
        title="Run Status"
        value={runStatus.charAt(0).toUpperCase() + runStatus.slice(1)}
        subtitle={runLabel}
        icon={FileText}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}
