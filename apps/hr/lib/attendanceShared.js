export { DEFAULT_SHIFTS, WORK_SHIFTS, buildShiftCardsFromEmployees, formatShiftLabel } from './shiftShared'

export const ATTENDANCE_STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'wfh', label: 'WFH' },
  { value: 'absent', label: 'Absent' },
]

export const ATTENDANCE_UPDATED_EVENT = 'hr-attendance-updated'

export function notifyAttendanceUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(ATTENDANCE_UPDATED_EVENT))
}

export function toDateInputValue(date = new Date()) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date)) {
    return date.slice(0, 10)
  }
  const d = date instanceof Date ? date : new Date(date)
  if (Number.isNaN(d.getTime())) return toDateInputValue(new Date())
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateInInclusiveRange(dateStr, fromStr, toStr) {
  const day = toDateInputValue(dateStr)
  const from = toDateInputValue(fromStr)
  const to = toDateInputValue(toStr || fromStr)
  return day >= from && day <= to
}

export function formatAttendanceStatus(status = '') {
  const raw = String(status || 'not_marked').toLowerCase()
  if (raw === 'present') return 'Present'
  if (raw === 'on_leave') return 'On Leave'
  if (raw === 'wfh') return 'WFH'
  if (raw === 'absent') return 'Absent'
  if (raw === 'not_marked' || raw === 'not marked' || raw === 'unmarked') return 'Not Marked'
  return 'Not Marked'
}

export function attendanceStatusToApi(label = '') {
  const raw = String(label || '').toLowerCase()
  if (raw === 'present') return 'present'
  if (raw === 'on leave' || raw === 'on_leave') return 'on_leave'
  if (raw === 'wfh') return 'wfh'
  if (raw === 'absent') return 'absent'
  if (raw === 'not marked' || raw === 'not_marked' || raw === 'unmarked') return 'not_marked'
  return 'absent'
}

export function isAttendanceOnLeave(row = {}) {
  const raw = String(row.statusRaw || row.status || '').toLowerCase()
  return raw === 'on_leave' || raw === 'on leave'
}

export function formatDurationMinutes(minutes = 0) {
  const total = Number(minutes || 0)
  if (total <= 0) return '—'
  const hours = Math.floor(total / 60)
  const mins = total % 60
  return `${hours}h ${String(mins).padStart(2, '0')}m`
}

export function calcDurationMinutes(clockIn, clockOut) {
  const parse = (value) => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim())
    if (!match) return null
    return Number(match[1]) * 60 + Number(match[2])
  }
  const inMin = parse(clockIn)
  const outMin = parse(clockOut)
  if (inMin == null || outMin == null || outMin <= inMin) return 0
  return outMin - inMin
}

function isOnApprovedLeave(leaveRequests = [], organizationUserId, dateStr) {
  return leaveRequests.some((request) => {
    if (request.status !== 'Approved') return false
    if (String(request.organizationUserId) !== String(organizationUserId)) return false
    return dateInInclusiveRange(dateStr, request.from, request.to)
  })
}

function buildInferredAttendanceRow(employee, orgUserId, dateStr, statusRaw) {
  const status = formatAttendanceStatus(statusRaw)
  const onLeave = statusRaw === 'on_leave'
  const notMarked = statusRaw === 'not_marked'

  return {
    id: null,
    organizationUserId: orgUserId,
    employeeId: orgUserId,
    employeeCode: employee.employeeId,
    name: employee.name,
    department: employee.department,
    attendanceDate: dateStr,
    clockIn: '—',
    clockOut: '—',
    duration: '—',
    durationMinutes: 0,
    status,
    statusRaw,
    location: '—',
    late: false,
    notes: onLeave ? 'Approved leave' : notMarked ? 'Attendance not marked yet' : '',
    inferred: true,
  }
}

function resolveAttendanceRowForDay({ employee, orgUserId, dateStr, saved, leaveRequests }) {
  const onLeave = isOnApprovedLeave(leaveRequests, orgUserId, dateStr)

  if (saved) {
    const savedStatus = String(saved.statusRaw || attendanceStatusToApi(saved.status)).toLowerCase()

    if (onLeave && savedStatus !== 'present' && savedStatus !== 'wfh') {
      return {
        ...buildInferredAttendanceRow(employee, orgUserId, dateStr, 'on_leave'),
        id: saved.id,
      }
    }

    return {
      ...saved,
      name: saved.name || employee.name,
      employeeId: orgUserId,
      employeeCode: saved.employeeCode || employee.employeeId,
      department: saved.department || employee.department,
      attendanceDate: saved.attendanceDate || dateStr,
      inferred: false,
    }
  }

  if (onLeave) {
    return buildInferredAttendanceRow(employee, orgUserId, dateStr, 'on_leave')
  }

  return buildInferredAttendanceRow(employee, orgUserId, dateStr, 'not_marked')
}

export function buildAttendanceSnapshot(rows = [], rosterCount = 0) {
  const roster = Math.max(rosterCount, rows.length)
  let present = 0
  let onLeave = 0
  let wfh = 0
  let absent = 0
  let notMarked = 0

  for (const row of rows) {
    const status = formatAttendanceStatus(row.status)
    if (status === 'Present') present += 1
    else if (status === 'On Leave') onLeave += 1
    else if (status === 'WFH') wfh += 1
    else if (status === 'Absent') absent += 1
    else notMarked += 1
  }

  const marked = present + onLeave + wfh + absent

  return {
    roster,
    present,
    onLeave,
    wfh,
    absent,
    notMarked,
    marked,
    markedPct: roster > 0 ? Math.round((marked / roster) * 100) : 0,
  }
}

export function buildDailyAttendanceRoster({
  employees = [],
  records = [],
  leaveRequests = [],
  date = toDateInputValue(),
} = {}) {
  const dateStr = toDateInputValue(date)
  const recordByUser = new Map(
    records.map((row) => [String(row.organizationUserId), row]),
  )

  return employees
    .filter((employee) => employee.status !== 'Exited')
    .map((employee) => {
      const orgUserId = String(employee.membershipId || employee.id)
      const saved = recordByUser.get(orgUserId)
      return resolveAttendanceRowForDay({
        employee,
        orgUserId,
        dateStr,
        saved,
        leaveRequests,
      })
    })
}

export function buildEmployeeMonthAttendanceLogs({
  employee,
  records = [],
  leaveRequests = [],
  year,
  month,
} = {}) {
  if (!employee) return []
  const orgUserId = String(employee.membershipId || employee.id)
  const daysInMonth = new Date(year, month, 0).getDate()
  const recordsByDate = Object.fromEntries(
    records.map((row) => [toDateInputValue(row.attendanceDate), row]),
  )

  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    const saved = recordsByDate[dateStr] || null
    const row = resolveAttendanceRowForDay({
      employee,
      orgUserId,
      dateStr,
      saved,
      leaveRequests,
    })

    const statusKey =
      row.statusRaw === 'present'
        ? 'present'
        : row.statusRaw === 'on_leave'
          ? 'leave'
          : row.statusRaw === 'wfh'
            ? 'wfh'
            : row.statusRaw === 'absent'
              ? 'absent'
              : 'not_marked'

    return {
      id: `attendance-${dateStr}`,
      date: dateStr,
      status: statusKey,
      label: row.status,
      checkIn: row.clockIn && row.clockIn !== '—' ? row.clockIn : '',
      checkOut: row.clockOut && row.clockOut !== '—' ? row.clockOut : '',
      hours: row.duration && row.duration !== '—' ? row.duration : '',
      note:
        row.statusRaw === 'on_leave'
          ? 'Approved leave from Leave module.'
          : row.statusRaw === 'not_marked'
            ? 'Attendance not marked yet. Mark Present or Absent to save.'
            : row.inferred
              ? 'No attendance record saved.'
              : 'Attendance log saved.',
      summary: `${row.status}${row.duration && row.duration !== '—' ? ` · ${row.duration}` : ''}`,
      source: row.inferred ? (row.statusRaw === 'on_leave' ? 'Leave' : 'Pending') : 'HR log',
    }
  })
}

export function todayDateLabel(date = new Date()) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function monthDateLabel(monthValue = '') {
  const [year, month] = String(monthValue || '').split('-').map(Number)
  if (!year || !month) return monthValue || ''
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function monthRange(year, month) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}
