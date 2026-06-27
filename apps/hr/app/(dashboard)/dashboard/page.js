'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { Users, Calendar, Clock, Briefcase } from 'lucide-react'
import HRDashboardKpiRow from '../../../components/dashboard/HRDashboardKpiRow'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import { buildDashboardTitle, getCurrentDate } from '../../../lib/pageHeader'
import HeadcountTrendChart from '../../../components/dashboard/HeadcountTrendChart'
import DepartmentDistributionChart from '../../../components/dashboard/DepartmentDistributionChart'
import WorkforceStatusWidget from '../../../components/dashboard/WorkforceStatusWidget'
import PendingApprovalsWidget from '../../../components/dashboard/PendingApprovalsWidget'
import AttendanceSnapshotWidget from '../../../components/dashboard/AttendanceSnapshotWidget'
import DashboardSidebar from '../../../components/dashboard/sidebar/DashboardSidebarPanels'
import { EMPLOYEES } from '../../../lib/mock-data/employees'
import { DASHBOARD_KPIS, PENDING_APPROVALS } from '../../../lib/mock-data/dashboard'

const TILE_CLASS = 'h-full min-h-0'
const INSIGHT_TILE_CLASS = 'h-full min-h-[17.5rem]'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const dateStr = getCurrentDate()

  const activeCount = useMemo(
    () => EMPLOYEES.filter((e) => e.status !== 'Exited').length,
    []
  )

  const kpiStats = useMemo(
    () => [
      {
        title: 'Total Employees',
        value: String(activeCount),
        subtitle:
          activeCount === 0
            ? 'No employees'
            : activeCount === 1
              ? '1 employee'
              : `${activeCount} employees`,
        icon: Users,
        colorScheme: 'orange',
        onClick: () => router.push('/employees'),
      },
      {
        title: 'On Leave Today',
        value: String(DASHBOARD_KPIS.onLeaveToday.value),
        subtitle:
          DASHBOARD_KPIS.onLeaveToday.value === 0
            ? 'No one on leave'
            : `${DASHBOARD_KPIS.onLeaveToday.value} on leave`,
        icon: Calendar,
        colorScheme: 'orange',
        onClick: () => router.push('/leave'),
      },
      {
        title: 'Pending Approvals',
        value: String(PENDING_APPROVALS.length),
        subtitle:
          PENDING_APPROVALS.length === 0
            ? 'None pending'
            : `${PENDING_APPROVALS.length} pending`,
        icon: Clock,
        colorScheme: 'orange',
        onClick: () => router.push('/leave'),
      },
      {
        title: 'Open Positions',
        value: String(DASHBOARD_KPIS.openPositions.value),
        subtitle:
          DASHBOARD_KPIS.openPositions.value === 0
            ? 'No openings'
            : `${DASHBOARD_KPIS.openPositions.value} open`,
        icon: Briefcase,
        colorScheme: 'orange',
        onClick: () => router.push('/recruitment'),
      },
    ],
    [activeCount, router]
  )

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title={buildDashboardTitle(user)}
        subtitle={dateStr}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        showSearch
      />
      <HRDashboardKpiRow stats={kpiStats} />
      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
        <div className="flex min-h-0 flex-col gap-4 xl:col-span-2">
          <HeadcountTrendChart employees={EMPLOYEES} />
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
            <WorkforceStatusWidget activeEmployeeCount={activeCount} className={TILE_CLASS} />
            <PendingApprovalsWidget className={TILE_CLASS} />
          </div>
        </div>
        <DashboardSidebar />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <AttendanceSnapshotWidget
          activeEmployeeCount={activeCount}
          className={`${INSIGHT_TILE_CLASS} xl:col-span-1`}
        />
        <DepartmentDistributionChart
          employees={EMPLOYEES}
          className={`${INSIGHT_TILE_CLASS} xl:col-span-2`}
        />
      </div>
    </HRModulePage>
  )
}
