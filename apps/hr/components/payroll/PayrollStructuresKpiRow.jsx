'use client'

import { useMemo } from 'react'
import { Landmark, CheckCircle2, Users, AlertTriangle } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import HRKpiRow from '../layout/HRKpiRow'
import { computeSalaryStructureStats } from '../../lib/payrollPage'

function countLabel(count, singular, plural = `${singular}s`) {
  if (count === 0) return `No ${plural}`
  if (count === 1) return `1 ${singular}`
  return `${count} ${plural}`
}

export default function PayrollStructuresKpiRow({ structures = [] }) {
  const stats = useMemo(() => computeSalaryStructureStats(structures), [structures])

  return (
    <HRKpiRow columns={4}>
      <KPICard
        title="Total Structures"
        value={stats.total}
        subtitle={countLabel(stats.total, 'structure')}
        icon={Landmark}
        colorScheme="orange"
      />
      <KPICard
        title="Active"
        value={stats.active}
        subtitle={stats.total === 0 ? 'No structures' : `${stats.active} of ${stats.total} active`}
        icon={CheckCircle2}
        colorScheme="orange"
      />
      <KPICard
        title="In Use"
        value={stats.inUse}
        subtitle={
          stats.assignedEmployees === 0
            ? 'Not assigned yet'
            : countLabel(stats.assignedEmployees, 'employee assigned', 'employees assigned')
        }
        icon={Users}
        colorScheme="orange"
      />
      <KPICard
        title="Invalid Split"
        value={stats.invalidSplit}
        subtitle={stats.invalidSplit === 0 ? 'All splits valid' : 'Needs component fix'}
        icon={AlertTriangle}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}
