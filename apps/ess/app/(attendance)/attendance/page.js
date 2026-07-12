'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import {
  Badge,
  Button,
  DashboardInsightShell,
  EmptyState,
  LoadingSpinner,
  Table,
  TableEmptyBelow,
  TableResultsCount,
  UnifiedWorkspaceCalendar,
} from '@webfudge/ui'
import EmployeeGate from '../../../components/shared/EmployeeGate'
import ESSModulePage from '../../../components/layout/ESSModulePage'
import ESSPageHeader from '../../../components/layout/ESSPageHeader'
import ESSModuleTabBar from '../../../components/layout/ESSModuleTabBar'
import ESSDataTableCard from '../../../components/shared/ESSDataTableCard'
import ESSMarkAttendanceModal from '../../../components/attendance/ESSMarkAttendanceModal'
import ESSAttendanceSummaryRow from '../../../components/attendance/ESSAttendanceSummaryRow'
import ESSAttendanceTodayBanner from '../../../components/attendance/ESSAttendanceTodayBanner'
import ESSAttendanceDayDetail from '../../../components/attendance/ESSAttendanceDayDetail'
import ESSAttendanceMonthBar from '../../../components/attendance/ESSAttendanceMonthBar'
import { ESSRegularizationForm } from '../../../components/leave/ESSLeaveModals'
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee'
import { listAttendanceRecords, updateAttendanceRecord, upsertAttendanceRecord } from '../../../lib/attendanceSyncService'
import {
  ATTENDANCE_UPDATED_EVENT,
  buildEmployeeMonthAttendanceLogs,
  monthDateLabel,
  notifyAttendanceUpdated,
  toDateInputValue,
} from '../../../lib/attendanceShared'
import { ATTENDANCE_STATUS_META, attendanceStatusBadgeVariant, regularizationStatusBadgeVariant } from '../../../lib/attendanceStatusMeta'
import { listLeaveRequests } from '../../../lib/leaveSyncService'
import { LEAVE_UPDATED_EVENT } from '../../../lib/leaveShared'
import {
  listRegularizationRequests,
  REGULARIZATION_UPDATED_EVENT,
} from '../../../lib/regularizationSyncService'
import {
  buildTimePunchPayload,
  getTodayClockState,
} from '../../../lib/attendanceClock'

const TAB_KEYS = {
  THIS_MONTH: 'this-month',
  HISTORY: 'history',
  REGULARIZATION: 'regularization',
}

function resolveDisplayStatus(dateStr, status) {
  const day = new Date(dateStr)
  const isWeekend = day.getDay() === 0 || day.getDay() === 6
  if (isWeekend && status === 'not_marked') return 'weekend'
  return status
}

function buildAttendanceSummary(logs) {
  return logs.reduce(
    (acc, log) => {
      if (log.status === 'weekend') return acc
      acc[log.status] = (acc[log.status] || 0) + 1
      return acc
    },
    { present: 0, absent: 0, leave: 0, wfh: 0, not_marked: 0 },
  )
}

export default function AttendancePage() {
  const { employee, membershipId } = useCurrentEmployee()
  const [activeTab, setActiveTab] = useState(TAB_KEYS.THIS_MONTH)
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [records, setRecords] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [regularizations, setRegularizations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState(null)
  const [markOpen, setMarkOpen] = useState(false)
  const [editLog, setEditLog] = useState(null)
  const [punching, setPunching] = useState(null)
  const [punchError, setPunchError] = useState('')

  const year = monthDate.getFullYear()
  const month = monthDate.getMonth() + 1
  const monthValue = `${year}-${String(month).padStart(2, '0')}`

  const { from, to } = useMemo(() => {
    const lastDay = new Date(year, month, 0).getDate()
    return {
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    }
  }, [year, month])

  const loadData = useCallback(async () => {
    if (!membershipId || !employee) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [attendanceRows, leaveRows, regRows] = await Promise.all([
        listAttendanceRecords({ organizationUser: membershipId, from, to, limit: 62 }),
        listLeaveRequests({ organizationUser: membershipId, limit: 100 }),
        listRegularizationRequests({ organizationUser: membershipId, limit: 50 }),
      ])
      setRecords(attendanceRows)
      setLeaveRequests(leaveRows)
      setRegularizations(regRows)
    } finally {
      setLoading(false)
    }
  }, [membershipId, employee, from, to])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => loadData()
    window.addEventListener(ATTENDANCE_UPDATED_EVENT, refresh)
    window.addEventListener(LEAVE_UPDATED_EVENT, refresh)
    window.addEventListener(REGULARIZATION_UPDATED_EVENT, refresh)
    return () => {
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, refresh)
      window.removeEventListener(LEAVE_UPDATED_EVENT, refresh)
      window.removeEventListener(REGULARIZATION_UPDATED_EVENT, refresh)
    }
  }, [loadData])

  const recordsByDate = useMemo(
    () => Object.fromEntries(records.map((row) => [toDateInputValue(row.attendanceDate), row])),
    [records],
  )

  const attendanceLogs = useMemo(() => {
    return buildEmployeeMonthAttendanceLogs({ employee, records, leaveRequests, year, month }).map(
      (log) => {
        const saved = recordsByDate[log.date] || null
        const displayStatus = resolveDisplayStatus(log.date, log.status)
        return {
          ...log,
          recordId: saved?.id || null,
          inferred: !saved,
          status: displayStatus,
          meta: ATTENDANCE_STATUS_META[displayStatus] || ATTENDANCE_STATUS_META.not_marked,
          source: saved ? 'Self-marked' : log.status === 'leave' ? 'Leave' : 'Pending',
        }
      },
    )
  }, [employee, records, leaveRequests, year, month, recordsByDate])

  const summary = useMemo(() => buildAttendanceSummary(attendanceLogs), [attendanceLogs])

  const today = toDateInputValue(new Date())
  const todaySaved = recordsByDate[today] || null
  const todayLog = attendanceLogs.find((log) => log.date === today)
  const todayClockState = useMemo(
    () => getTodayClockState(todayLog, todaySaved),
    [todayLog, todaySaved],
  )

  const events = attendanceLogs
    .filter((log) => log.status !== 'weekend')
    .map((log) => ({
      id: log.id,
      title: log.meta.label,
      start: log.date,
      allDay: true,
      extendedProps: { kind: 'attendance', entity: log },
    }))

  const handleMonthValueChange = (value) => {
    const [y, m] = String(value).split('-').map(Number)
    if (y && m) {
      setMonthDate(new Date(y, m - 1, 1))
      setSelectedLog(null)
    }
  }

  const handleCalendarDatesSet = useCallback((info) => {
    const active = info?.view?.currentStart || info?.start
    if (!active) return
    const y = active.getFullYear()
    const m = active.getMonth() + 1
    setMonthDate((prev) => {
      if (prev.getFullYear() === y && prev.getMonth() + 1 === m) return prev
      return new Date(y, m - 1, 1)
    })
  }, [])

  const openMarkModal = (log = null) => {
    setEditLog(log || todayLog || null)
    setMarkOpen(true)
  }

  const handleSaveAttendance = async (payload) => {
    if (payload.recordId) {
      await updateAttendanceRecord(payload.recordId, {
        attendanceDate: payload.attendanceDate,
        status: payload.status,
        clockIn: payload.clockIn,
        clockOut: payload.clockOut,
        notes: payload.notes,
        workShift: payload.workShift,
      })
    } else {
      await upsertAttendanceRecord(payload)
    }
    notifyAttendanceUpdated()
  }

  const handleTimePunch = async (action) => {
    if (!membershipId) return
    try {
      setPunching(action)
      setPunchError('')
      const payload = buildTimePunchPayload({
        action,
        membershipId,
        attendanceDate: today,
        clockState: todayClockState,
        employee,
        selectedShift: todayClockState.workShift,
      })
      await handleSaveAttendance(payload)
    } catch (error) {
      setPunchError(error?.message || 'Failed to record time')
    } finally {
      setPunching(null)
    }
  }

  const historyColumns = [
    { key: 'date', label: 'Date' },
    { key: 'weekday', label: 'Day' },
    { key: 'checkIn', label: 'Clock In' },
    { key: 'checkOut', label: 'Clock Out' },
    { key: 'hours', label: 'Hours' },
    { key: 'statusBadge', label: 'Status' },
    { key: 'source', label: 'Source' },
  ]

  const historyData = attendanceLogs
    .filter((log) => log.status !== 'weekend')
    .map((log) => ({
      ...log,
      weekday: new Date(log.date).toLocaleDateString('en-US', { weekday: 'short' }),
      checkIn: log.checkIn || '—',
      checkOut: log.checkOut || '—',
      hours: log.hours || '—',
      statusBadge: <Badge variant={attendanceStatusBadgeVariant(log.status)}>{log.meta.label}</Badge>,
    }))

  const regColumns = [
    { key: 'attendanceDate', label: 'Date' },
    { key: 'requestedStatus', label: 'Requested Status' },
    { key: 'reason', label: 'Reason' },
    { key: 'submittedOn', label: 'Submitted On' },
    { key: 'status', label: 'Status' },
    { key: 'hrComment', label: 'HR Comments' },
  ]

  const regData = regularizations.map((row) => ({
    ...row,
    submittedOn: row.submittedOn ? new Date(row.submittedOn).toLocaleDateString() : '—',
    status: <Badge variant={regularizationStatusBadgeVariant(row.status)}>{row.status}</Badge>,
    hrComment: row.hrComment || '—',
  }))

  const tabItems = useMemo(
    () => [
      {
        key: TAB_KEYS.THIS_MONTH,
        label: 'This Month',
        badge: attendanceLogs.filter((log) => log.status !== 'weekend').length,
      },
      { key: TAB_KEYS.HISTORY, label: 'History', badge: historyData.length },
      { key: TAB_KEYS.REGULARIZATION, label: 'Regularization', badge: regularizations.length },
    ],
    [attendanceLogs, historyData.length, regularizations.length],
  )

  return (
    <EmployeeGate>
      <ESSModulePage className={`!space-y-6 transition-opacity ${loading ? 'opacity-90' : ''}`}>
        <ESSPageHeader
          title="My Attendance"
          subtitle="View and mark your daily attendance"
          breadcrumb={[
            { label: 'Overview', href: '/overview' },
            { label: 'Attendance', href: '/attendance' },
          ]}
          actions={
            <ESSAttendanceMonthBar
              variant="header"
              monthValue={monthValue}
              onMonthChange={handleMonthValueChange}
            />
          }
        />

        {punchError ? <p className="text-sm text-red-600">{punchError}</p> : null}

        <ESSAttendanceSummaryRow summary={summary} />

        <ESSModuleTabBar
          tabs={tabItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === TAB_KEYS.THIS_MONTH ? (
          <div className="space-y-4">
            {!todayClockState.blocked ? (
              <ESSAttendanceTodayBanner
                clockState={todayClockState}
                onTimeIn={() => handleTimePunch('in')}
                onTimeOut={() => handleTimePunch('out')}
                punching={punching}
              />
            ) : null}

            <DashboardInsightShell
              title="Monthly calendar"
              subtitle={monthDateLabel(monthValue)}
              panelClassName="p-3"
            >
              {loading ? (
                <div className="flex justify-center py-10">
                  <LoadingSpinner message="Loading calendar…" />
                </div>
              ) : (
                <UnifiedWorkspaceCalendar
                  events={events}
                  initialDate={`${monthValue}-01`}
                  onDatesSet={handleCalendarDatesSet}
                  onEventClick={({ kind, entity }) => {
                    if (kind === 'attendance') setSelectedLog(entity)
                  }}
                  height="auto"
                />
              )}
            </DashboardInsightShell>

            <ESSAttendanceDayDetail
              log={selectedLog}
              isToday={selectedLog?.date === today}
              clockState={selectedLog?.date === today ? todayClockState : null}
              onTimeIn={() => handleTimePunch('in')}
              onTimeOut={() => handleTimePunch('out')}
              punching={punching}
              onEdit={(log) => openMarkModal(log)}
            />
          </div>
        ) : null}

        {activeTab === TAB_KEYS.HISTORY ? (
          <div className="space-y-4">
            <DashboardInsightShell
              title="Calendar view"
              subtitle={`${monthDateLabel(monthValue)} · ${historyData.length} working day${historyData.length === 1 ? '' : 's'}`}
              panelClassName="p-3"
            >
              <UnifiedWorkspaceCalendar
                events={events}
                initialDate={`${monthValue}-01`}
                onDatesSet={handleCalendarDatesSet}
                onEventClick={({ kind, entity }) => {
                  if (kind === 'attendance') setSelectedLog(entity)
                }}
                height="auto"
              />
            </DashboardInsightShell>

            <TableResultsCount count={historyData.length} />

            <ESSDataTableCard>
              <Table variant="modernEmbedded" columns={historyColumns} data={historyData} keyField="date" />
              {!loading && historyData.length === 0 ? (
                <TableEmptyBelow
                  title="No attendance history"
                  description="Use Time In on the This Month tab to start building your log."
                />
              ) : null}
            </ESSDataTableCard>
          </div>
        ) : null}

        {activeTab === TAB_KEYS.REGULARIZATION ? (
          <div className="space-y-4">
            <DashboardInsightShell
              title="Request regularization"
              subtitle="Ask HR to correct a past attendance record"
              panelClassName="p-4"
            >
              <ESSRegularizationForm membershipId={membershipId} onSubmitted={loadData} />
            </DashboardInsightShell>

            <ESSDataTableCard>
              {regularizations.length ? (
                <Table variant="modernEmbedded" columns={regColumns} data={regData} keyField="id" />
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title="No regularization requests"
                  description="Past requests will appear here once submitted."
                  className="py-8"
                />
              )}
            </ESSDataTableCard>
          </div>
        ) : null}

        <ESSMarkAttendanceModal
          open={markOpen}
          onClose={() => {
            setMarkOpen(false)
            setEditLog(null)
          }}
          membershipId={membershipId}
          employee={employee}
          selectedDate={editLog?.date || today}
          initialRow={
            editLog
              ? {
                  ...editLog,
                  id: editLog.recordId,
                  attendanceDate: editLog.date,
                }
              : null
          }
          onSaved={handleSaveAttendance}
        />
      </ESSModulePage>
    </EmployeeGate>
  )
}
