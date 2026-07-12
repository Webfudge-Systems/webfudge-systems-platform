'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
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
import { fetchDashboardSnapshot } from '../../../lib/dashboardSyncService'
import { buildDashboardKpiStats } from '../../../lib/dashboardPage'
import { LEAVE_UPDATED_EVENT } from '../../../lib/leaveShared'
import { REGULARIZATION_UPDATED_EVENT } from '../../../lib/regularizationSyncService'
import { ATTENDANCE_UPDATED_EVENT } from '../../../lib/attendanceShared'

const TILE_CLASS = 'h-full min-h-0'
const INSIGHT_TILE_CLASS = 'h-full min-h-[17.5rem]'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const dateStr = getCurrentDate()
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [dashboardData, setDashboardData] = useState({
    employees: [],
    activeEmployeeCount: 0,
    onLeaveToday: 0,
    pendingApprovals: 0,
    openPositions: 0,
    attendanceSnapshot: null,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        setLoading(true)
        setLoadError('')
        const snapshot = await fetchDashboardSnapshot()
        if (!cancelled) setDashboardData(snapshot)
      } catch (error) {
        if (!cancelled) {
          setLoadError(error?.message || 'Failed to load dashboard data')
          setDashboardData({
            employees: [],
            activeEmployeeCount: 0,
            onLeaveToday: 0,
            pendingApprovals: 0,
            openPositions: 0,
            attendanceSnapshot: null,
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    const onRefresh = () => load()
    window.addEventListener(LEAVE_UPDATED_EVENT, onRefresh)
    window.addEventListener(REGULARIZATION_UPDATED_EVENT, onRefresh)
    window.addEventListener(ATTENDANCE_UPDATED_EVENT, onRefresh)

    return () => {
      cancelled = true
      window.removeEventListener(LEAVE_UPDATED_EVENT, onRefresh)
      window.removeEventListener(REGULARIZATION_UPDATED_EVENT, onRefresh)
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, onRefresh)
    }
  }, [])

  const kpiStats = useMemo(
    () =>
      buildDashboardKpiStats({
        activeEmployeeCount: dashboardData.activeEmployeeCount,
        onLeaveToday: dashboardData.onLeaveToday,
        pendingApprovals: dashboardData.pendingApprovals,
        openPositions: dashboardData.openPositions,
        loading,
        router,
      }),
    [dashboardData, loading, router],
  )

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title={buildDashboardTitle(user)}
        subtitle={dateStr}
        breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }]}
        showSearch
      />
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      <HRDashboardKpiRow stats={kpiStats} />
      <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
        <div className="flex min-h-0 flex-col gap-4 xl:col-span-2">
          <HeadcountTrendChart employees={dashboardData.employees} />
          <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
            <WorkforceStatusWidget
              activeEmployeeCount={dashboardData.activeEmployeeCount}
              className={TILE_CLASS}
            />
            <PendingApprovalsWidget className={TILE_CLASS} />
          </div>
        </div>
        <DashboardSidebar />
      </div>

      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-3">
        <AttendanceSnapshotWidget
          activeEmployeeCount={dashboardData.activeEmployeeCount}
          attendanceSnapshot={dashboardData.attendanceSnapshot}
          className={`${INSIGHT_TILE_CLASS} xl:col-span-1`}
        />
        <DepartmentDistributionChart
          employees={dashboardData.employees}
          className={`${INSIGHT_TILE_CLASS} xl:col-span-2`}
        />
      </div>
    </HRModulePage>
  )
}
