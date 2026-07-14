'use client'

import { listSyncedEmployees } from './employeeSyncService'
import { listLeaveRequests } from './leaveSyncService'
import { listRegularizationRequests } from './regularizationSyncService'
import { listAttendanceRecords } from './attendanceSyncService'
import {
  buildAttendanceSnapshot,
  buildDailyAttendanceRoster,
  toDateInputValue,
} from './attendanceShared'
import { computeLeaveStats } from './leavePage'
import { OPEN_JOBS } from './mock-data/recruitment'

export async function fetchDashboardSnapshot() {
  const today = toDateInputValue()

  const [employeeResult, leaveRequests, regularizations, todayRecords] = await Promise.all([
    listSyncedEmployees(),
    listLeaveRequests(),
    listRegularizationRequests({ status: 'pending', limit: 100 }),
    listAttendanceRecords({ date: today }),
  ])

  const employees = employeeResult?.employees || []
  const activeEmployees = employees.filter((employee) => employee.status !== 'Exited')
  const roster = buildDailyAttendanceRoster({
    employees,
    records: todayRecords || [],
    leaveRequests: leaveRequests || [],
    date: today,
  })
  const attendanceSnapshot = buildAttendanceSnapshot(roster, activeEmployees.length)
  const leaveStats = computeLeaveStats(leaveRequests || [])
  const pendingApprovals = leaveStats.pending + (regularizations?.length || 0)
  const openPositions = OPEN_JOBS.filter((job) => job.status === 'Open').length

  return {
    employees,
    activeEmployeeCount: activeEmployees.length,
    onLeaveToday: attendanceSnapshot.onLeave,
    pendingApprovals,
    openPositions,
    leaveRequests: leaveRequests || [],
    regularizations: regularizations || [],
    attendanceSnapshot,
  }
}
