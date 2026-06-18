'use client'

import { useMemo, useState } from 'react'
import { TrendingDown, AlertTriangle, Users } from 'lucide-react'
import { Table, TableCellText, TableCellOrangePill } from '@webfudge/ui'
import { ATTRITION_ANALYTICS } from '../../../lib/mock-data/analytics'
import { computeAttritionKpis } from '../../../lib/analyticsPage'
import HRAnalyticsKpiRow from '../HRAnalyticsKpiRow'
import { HRAnalyticsTableSection } from '../HRAnalyticsChartCard'
import AttritionByDeptChart from '../charts/AttritionByDeptChart'

export default function AttritionAnalyticsPanel() {
  const [search, setSearch] = useState('')
  const kpis = computeAttritionKpis()

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    return ATTRITION_ANALYTICS.byDept.filter((d) => !q || d.dept.toLowerCase().includes(q))
  }, [search])

  const stats = [
    { title: 'Monthly attrition', value: kpis.monthly, subtitle: 'Current month', icon: TrendingDown },
    { title: '12-mo rolling', value: kpis.rolling12, subtitle: 'Trailing year', icon: TrendingDown },
    {
      title: 'High-risk',
      value: String(kpis.highRisk),
      change: 'Review 1:1s',
      changeType: 'decrease',
      icon: AlertTriangle,
    },
    {
      title: 'Departments',
      value: String(ATTRITION_ANALYTICS.byDept.length),
      subtitle: 'Tracked',
      icon: Users,
    },
  ]

  const columns = [
    {
      key: 'dept',
      label: 'DEPARTMENT',
      render: (_, row) => <TableCellOrangePill value={row.dept} />,
    },
    {
      key: 'rate',
      label: 'ATTRITION %',
      render: (_, row) => <TableCellText value={`${row.rate}%`} emphasized />,
    },
  ]

  return (
    <div className="space-y-4">
      <HRAnalyticsKpiRow items={stats} />
      <AttritionByDeptChart />
      <HRAnalyticsTableSection
        title="Department detail"
        subtitle="Filter and compare exit rates"
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
