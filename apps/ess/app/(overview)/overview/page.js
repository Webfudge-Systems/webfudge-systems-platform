'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { CalendarCheck, Clock, Palmtree, Wallet } from 'lucide-react'
import EmployeeGate from '../../../components/shared/EmployeeGate'
import ESSModulePage from '../../../components/layout/ESSModulePage'
import ESSPageHeader from '../../../components/layout/ESSPageHeader'
import ESSDashboardKpiRow from '../../../components/dashboard/ESSDashboardKpiRow'
import ESSWeekAttendanceWidget from '../../../components/dashboard/ESSWeekAttendanceWidget'
import ESSLeaveBalancesWidget from '../../../components/dashboard/ESSLeaveBalancesWidget'
import ESSQuickActionsWidget from '../../../components/dashboard/ESSQuickActionsWidget'
import ESSOverviewSidebar from '../../../components/dashboard/ESSOverviewSidebar'
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee'
import { listAttendanceRecords } from '../../../lib/attendanceSyncService'
import {
  ATTENDANCE_UPDATED_EVENT,
  buildEmployeeMonthAttendanceLogs,
  toDateInputValue,
} from '../../../lib/attendanceShared'
import { ATTENDANCE_STATUS_META } from '../../../lib/attendanceStatusMeta'
import { listLeaveRequests } from '../../../lib/leaveSyncService'
import {
  LEAVE_UPDATED_EVENT,
  computeEmployeeLeaveBalanceRows,
  formatLeaveStatus,
} from '../../../lib/leaveShared'
import { listEmployeePayrollLineItems } from '../../../lib/payrollSyncService'
import { mapEmployeePayrollHistoryRow, sortEmployeePayrollHistory } from '../../../lib/payrollShared'
import { fetchEmployeeActivityTimeline } from '../../../lib/api/employeeActivityService'
import { listCompanyHolidays, getUpcomingHolidays } from '../../../lib/holidaySyncService'
import {
  buildOverviewTitle,
  formatCurrency,
  getCurrentDate,
  getMonthRange,
  getWeekDates,
} from '../../../lib/pageUtils'

const TILE_CLASS = 'h-full min-h-0'

export default function OverviewPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { employee, membershipId } = useCurrentEmployee()
  const [loading, setLoading] = useState(true)
  const [attendanceLogs, setAttendanceLogs] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [payrollRows, setPayrollRows] = useState([])
  const [activities, setActivities] = useState([])
  const [holidays, setHolidays] = useState([])

  const loadData = useCallback(async () => {
    if (!membershipId || !employee) {
      setLoading(false)
      return
    }
    const { year, month, from, to } = getMonthRange()
    const weekDates = getWeekDates()
    const weekFrom = weekDates[0]

    try {
      setLoading(true)
      const [attendanceRows, leaveRows, payrollItems, activityRes, holidayRows] = await Promise.all([
        listAttendanceRecords({ organizationUser: membershipId, from: weekFrom, to, limit: 62 }),
        listLeaveRequests({ organizationUser: membershipId, limit: 100 }),
        listEmployeePayrollLineItems(membershipId),
        fetchEmployeeActivityTimeline({ organizationUserId: membershipId, limit: 5 }),
        listCompanyHolidays({ from: new Date().toISOString().slice(0, 10), limit: 10 }),
      ])

      const monthLogs = buildEmployeeMonthAttendanceLogs({
        employee,
        records: attendanceRows,
        leaveRequests: leaveRows,
        year,
        month,
      })
      setAttendanceLogs(monthLogs)
      setLeaveRequests(leaveRows)
      setPayrollRows(sortEmployeePayrollHistory(payrollItems.map(mapEmployeePayrollHistoryRow)))
      setActivities(activityRes.data || [])
      setHolidays(getUpcomingHolidays(holidayRows, 3))
    } finally {
      setLoading(false)
    }
  }, [membershipId, employee])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => loadData()
    window.addEventListener(ATTENDANCE_UPDATED_EVENT, refresh)
    window.addEventListener(LEAVE_UPDATED_EVENT, refresh)
    return () => {
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, refresh)
      window.removeEventListener(LEAVE_UPDATED_EVENT, refresh)
    }
  }, [loadData])

  const leaveBalanceRows = useMemo(
    () => computeEmployeeLeaveBalanceRows(employee, leaveRequests),
    [employee, leaveRequests],
  )

  const totalLeaveBalance = leaveBalanceRows.reduce((sum, row) => sum + row.balance, 0)
  const presentThisMonth = attendanceLogs.filter((log) => log.status === 'present').length
  const pendingRequests = leaveRequests.filter((row) => formatLeaveStatus(row.status) === 'Pending')
  const lastPay = payrollRows[0]

  const weekStrip = useMemo(() => {
    const weekDates = getWeekDates()
    const byDate = Object.fromEntries(attendanceLogs.map((log) => [log.date, log]))
    return weekDates.map((date) => {
      const log = byDate[date]
      const day = new Date(date)
      const isWeekend = day.getDay() === 0 || day.getDay() === 6
      const status = log?.status || (isWeekend ? 'weekend' : 'not_marked')
      const meta = ATTENDANCE_STATUS_META[status] || ATTENDANCE_STATUS_META.not_marked
      return {
        date,
        label: day.toLocaleDateString('en-US', { weekday: 'short' }),
        status,
        meta,
        isToday: date === toDateInputValue(new Date()),
      }
    })
  }, [attendanceLogs])

  const kpiStats = useMemo(
    () => [
      {
        title: 'Leave Balance',
        value: String(totalLeaveBalance),
        subtitle: totalLeaveBalance === 1 ? 'day available' : 'days available',
        icon: Palmtree,
        colorScheme: 'orange',
        onClick: () => router.push('/leave'),
      },
      {
        title: 'Present This Month',
        value: String(presentThisMonth),
        subtitle: presentThisMonth === 1 ? 'day marked present' : 'days marked present',
        icon: CalendarCheck,
        colorScheme: 'orange',
        onClick: () => router.push('/attendance'),
      },
      {
        title: 'Pending Requests',
        value: String(pendingRequests.length),
        subtitle:
          pendingRequests.length === 0 ? 'none awaiting approval' : 'awaiting approval',
        icon: Clock,
        colorScheme: 'orange',
        onClick: () => router.push('/leave'),
      },
      {
        title: 'Last Net Pay',
        value: lastPay ? formatCurrency(lastPay.net) : '—',
        subtitle: lastPay?.month || 'No payslip yet',
        icon: Wallet,
        colorScheme: 'orange',
        onClick: () => router.push('/payroll'),
      },
    ],
    [totalLeaveBalance, presentThisMonth, pendingRequests.length, lastPay, router],
  )

  return (
    <EmployeeGate>
      <ESSModulePage className={`!space-y-6 transition-opacity ${loading ? 'opacity-90' : ''}`}>
        <ESSPageHeader
          title={buildOverviewTitle(user, employee)}
          subtitle={getCurrentDate()}
          breadcrumb={[{ label: 'Overview', href: '/overview' }]}
          showBack={false}
        />

        <ESSDashboardKpiRow stats={kpiStats} />

        <div className="grid grid-cols-1 items-stretch gap-6 xl:grid-cols-3">
          <div className="flex min-h-0 flex-col gap-4 xl:col-span-2">
            <ESSWeekAttendanceWidget weekStrip={weekStrip} className={TILE_CLASS} />
            <ESSLeaveBalancesWidget rows={leaveBalanceRows} className={TILE_CLASS} />
            <ESSQuickActionsWidget className={TILE_CLASS} />
          </div>

          <ESSOverviewSidebar
            pendingRequests={pendingRequests.slice(0, 5)}
            activities={activities.slice(0, 5)}
            holidays={holidays}
            className="xl:col-span-1"
          />
        </div>
      </ESSModulePage>
    </EmployeeGate>
  )
}
