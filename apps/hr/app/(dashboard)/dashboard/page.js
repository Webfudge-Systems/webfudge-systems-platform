'use client'

import { useMemo } from 'react'
import { useAuth, resolveUserDisplayName } from '@webfudge/auth'
import { Users, Calendar, Clock, Briefcase } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRPageLayout from '../../../components/shared/HRPageLayout'
import { HR_GLASS_CARD_CLASS } from '../../../components/shared/HRGlassCard'
import HeadcountTrendChart from '../../../components/dashboard/HeadcountTrendChart'
import DepartmentDistributionChart from '../../../components/dashboard/DepartmentDistributionChart'
import RecentActivityPanel from '../../../components/dashboard/RecentActivityPanel'
import DashboardMetricTiles from '../../../components/dashboard/DashboardMetricTiles'
import DashboardSidebar from '../../../components/dashboard/sidebar/DashboardSidebarPanels'
import { EMPLOYEES } from '../../../lib/mock-data/employees'
import { DASHBOARD_KPIS } from '../../../lib/mock-data/dashboard'
import { RECENT_ACTIVITIES } from '../../../lib/mock-data/activities'

const KPI_GLASS = `${HR_GLASS_CARD_CLASS} !border-white/40`

const activityItems = RECENT_ACTIVITIES.map((a) => ({
  id: a.id,
  action: a.action,
  summary: `${a.title} — ${a.detail}`,
  createdAt: new Date().toISOString(),
  actor: { username: a.user },
}))

export default function DashboardPage() {
  const { user } = useAuth()
  const displayName = resolveUserDisplayName(user) || 'there'
  const firstName = displayName.split(' ')[0] || displayName
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const activeCount = useMemo(
    () => EMPLOYEES.filter((e) => e.status !== 'Exited').length,
    []
  )

  return (
    <HRPageLayout>
      <HRPageHeader
        title={`Welcome, ${firstName}`}
        subtitle={dateStr}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        showSearch
        searchPlaceholder="Search anything…"
      />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Employees"
          value={String(activeCount)}
          change={DASHBOARD_KPIS.totalEmployees.change}
          changeType="increase"
          icon={Users}
          colorScheme="orange"
          className={KPI_GLASS}
        />
        <KPICard
          title="On Leave Today"
          value={String(DASHBOARD_KPIS.onLeaveToday.value)}
          change={DASHBOARD_KPIS.onLeaveToday.change}
          changeType="neutral"
          icon={Calendar}
          colorScheme="orange"
          className={KPI_GLASS}
        />
        <KPICard
          title="Pending Approvals"
          value={String(DASHBOARD_KPIS.pendingApprovals.value)}
          icon={Clock}
          colorScheme="orange"
          className={KPI_GLASS}
        />
        <KPICard
          title="Open Positions"
          value={String(DASHBOARD_KPIS.openPositions.value)}
          change={DASHBOARD_KPIS.openPositions.change}
          changeType="increase"
          icon={Briefcase}
          colorScheme="orange"
          className={KPI_GLASS}
        />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <HeadcountTrendChart employees={EMPLOYEES} />
          <DepartmentDistributionChart employees={EMPLOYEES} />
          <DashboardMetricTiles activeEmployeeCount={activeCount} />
        </div>
        <div className="space-y-6">
          <DashboardSidebar />
          <RecentActivityPanel items={activityItems} />
        </div>
      </div>
    </HRPageLayout>
  )
}
