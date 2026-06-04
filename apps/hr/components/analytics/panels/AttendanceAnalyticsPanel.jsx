'use client'

import Link from 'next/link'
import { CalendarCheck, Clock, TrendingDown, Home } from 'lucide-react'
import { Button, Table, TableCellText, TableCellOrangePill } from '@webfudge/ui'
import { ATTENDANCE_ANALYTICS } from '../../../lib/mock-data/analytics'
import { computeAttendanceKpis } from '../../../lib/analyticsPage'
import HRAnalyticsKpiRow from '../HRAnalyticsKpiRow'
import { HRAnalyticsTableSection } from '../HRAnalyticsChartCard'
import AttendanceAnalyticsCharts from '../charts/AttendanceAnalyticsCharts'

export default function AttendanceAnalyticsPanel() {
  const kpis = computeAttendanceKpis()

  const stats = [
    { title: 'Avg attendance', value: kpis.avgRate, subtitle: 'This month', icon: CalendarCheck },
    { title: 'Late arrivals', value: String(kpis.lateArrivals), subtitle: 'Flagged check-ins', icon: Clock },
    { title: 'Absenteeism', value: kpis.absenteeism, subtitle: 'Unplanned', icon: TrendingDown },
    { title: 'WFH days', value: String(ATTENDANCE_ANALYTICS.wfhDays), subtitle: 'Approved', icon: Home },
  ]

  const columns = [
    {
      key: 'dept',
      label: 'DEPARTMENT',
      render: (_, row) => <TableCellOrangePill value={row.dept} />,
    },
    {
      key: 'rate',
      label: 'ATTENDANCE %',
      render: (_, row) => <TableCellText value={`${row.rate}%`} emphasized />,
    },
    {
      key: 'late',
      label: 'LATE',
      render: (_, row) => <TableCellText value={String(row.late)} />,
    },
  ]

  return (
    <div className="space-y-4">
      <HRAnalyticsKpiRow items={stats} />
      <AttendanceAnalyticsCharts />
      <HRAnalyticsTableSection
        title="Department attendance"
        subtitle="Rates for the current period"
        resultCount={ATTENDANCE_ANALYTICS.byDept.length}
        headerRight={
          <Link href="/attendance">
            <Button variant="primary" size="sm" className="bg-orange-500 hover:bg-orange-600">
              Open attendance
            </Button>
          </Link>
        }
      >
        <Table columns={columns} data={ATTENDANCE_ANALYTICS.byDept} keyField="dept" variant="modern" />
      </HRAnalyticsTableSection>
    </div>
  )
}
