'use client'

import { useMemo, useState } from 'react'
import { Users, UserPlus, UserMinus, TrendingUp } from 'lucide-react'
import { Table, TableCellText, TableCellOrangePill } from '@webfudge/ui'
import { HEADCOUNT_ANALYTICS } from '../../../lib/mock-data/analytics'
import { computeHeadcountKpis } from '../../../lib/analyticsPage'
import HRDashboardKpiRow from '../../dashboard/HRDashboardKpiRow'
import { HRAnalyticsTableSection } from '../HRAnalyticsChartCard'
import HeadcountTrendAnalyticsChart from '../charts/HeadcountTrendAnalyticsChart'
import HiresExitsChart from '../charts/HiresExitsChart'

export default function HeadcountAnalyticsPanel() {
  const [search, setSearch] = useState('')
  const kpis = useMemo(() => computeHeadcountKpis(), [])

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return HEADCOUNT_ANALYTICS.byDept.filter((d) => !q || d.dept.toLowerCase().includes(q))
  }, [search])

  const stats = [
    {
      title: 'Total workforce',
      value: String(kpis.total),
      subtitle: 'Active employees',
      icon: Users,
    },
    {
      title: 'New hires',
      value: String(kpis.newHires),
      change: '+6 vs Q1',
      changeType: 'increase',
      icon: UserPlus,
    },
    {
      title: 'Exits',
      value: String(kpis.exits),
      change: '−2 vs Q1',
      changeType: 'decrease',
      icon: UserMinus,
    },
    {
      title: 'Net change',
      value: `+${kpis.netChange}`,
      change: '+2.9% YoY',
      changeType: 'increase',
      icon: TrendingUp,
    },
  ]

  const columns = [
    {
      key: 'dept',
      label: 'DEPARTMENT',
      render: (_, row) => <TableCellOrangePill value={row.dept} />,
    },
    {
      key: 'headcount',
      label: 'HEADCOUNT',
      render: (_, row) => <TableCellText value={String(row.headcount)} emphasized />,
    },
    {
      key: 'pct',
      label: '% OF TOTAL',
      render: (_, row) => <TableCellText value={`${row.pct}%`} />,
    },
    {
      key: 'tenure',
      label: 'AVG TENURE',
      render: (_, row) => <TableCellText value={row.tenure} />,
    },
    {
      key: 'salary',
      label: 'AVG CTC',
      render: (_, row) => (
        <TableCellText value={`₹${(row.avgSalary / 100000).toFixed(1)}L`} />
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <HRDashboardKpiRow stats={stats} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <HeadcountTrendAnalyticsChart className="xl:col-span-8" />
        <HiresExitsChart data={HEADCOUNT_ANALYTICS.hiresVsExits} className="xl:col-span-4" />
      </div>

      <HRAnalyticsTableSection
        title="Department breakdown"
        subtitle="Headcount and share of workforce"
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Filter departments…"
        resultCount={rows.length}
      >
        <Table columns={columns} data={rows} keyField="dept" variant="modern" />
      </HRAnalyticsTableSection>
    </div>
  )
}
