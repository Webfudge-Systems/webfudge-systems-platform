'use client'

import HRDashboardKpiRow from '../dashboard/HRDashboardKpiRow'

/** HR analytics KPI row — app-local wrapper; shared KPICard UI unchanged. */
export default function HRAnalyticsKpiRow({ items }) {
  return <HRDashboardKpiRow stats={items} />
}
