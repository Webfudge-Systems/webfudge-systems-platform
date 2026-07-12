export const ATTENDANCE_TAB_KEYS = ['today', 'monthly', 'shifts', 'overtime', 'reports']

export function getAttendanceTabItems({ todayCount = 0, monthlyCount = 0, shiftsCount = 0, overtimeCount = 0, regularizationCount = 0 } = {}) {
  return [
    { key: 'today', label: 'Today', count: todayCount },
    { key: 'monthly', label: 'Monthly Log', count: monthlyCount },
    { key: 'regularization', label: 'Regularization', count: regularizationCount },
    { key: 'shifts', label: 'Shifts', count: shiftsCount },
    { key: 'overtime', label: 'Overtime', count: overtimeCount },
    { key: 'reports', label: 'Reports', count: 0 },
  ]
}

export function filterAttendanceLog(log, { search = '', statusFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return log.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false
    if (!q) return true
    return (
      (row.name || '').toLowerCase().includes(q) ||
      (row.employeeCode || row.employeeId || '').toLowerCase().includes(q) ||
      (row.location || '').toLowerCase().includes(q)
    )
  })
}

function monthlyRecordCalendarStatus(statusRaw = '') {
  switch (String(statusRaw).toLowerCase()) {
    case 'present':
      return 'present'
    case 'absent':
      return 'absent'
    case 'on_leave':
      return 'leave'
    case 'wfh':
      return 'wfh'
    default:
      return 'default'
  }
}

export function mapMonthlyAttendanceToCalendarEvents(records = []) {
  return records.map((record) => {
    const clockIn = record.clockIn && record.clockIn !== '—' ? record.clockIn : ''
    const clockOut = record.clockOut && record.clockOut !== '—' ? record.clockOut : ''
    const hours =
      record.duration && record.duration !== '—'
        ? record.duration
        : clockIn && clockOut
          ? `${clockIn} – ${clockOut}`
          : clockIn
            ? `In ${clockIn}`
            : null

    return {
      id: String(record.id),
      title: record.name || 'Employee',
      start: record.attendanceDate,
      allDay: true,
      extendedProps: {
        kind: 'attendance',
        entity: {
          status: monthlyRecordCalendarStatus(record.statusRaw),
          label: record.status || 'Present',
          summary: record.name || 'Employee',
          hours,
          note: record.notes || (record.late ? 'Late arrival' : null),
          record,
        },
      },
    }
  })
}

export function summarizeMonthlyAttendanceRecords(records = []) {
  return records.reduce(
    (acc, record) => {
      const key = String(record.statusRaw || '').toLowerCase()
      if (key === 'present') acc.present += 1
      else if (key === 'absent') acc.absent += 1
      else if (key === 'on_leave') acc.onLeave += 1
      else if (key === 'wfh') acc.wfh += 1
      else acc.other += 1
      return acc
    },
    { present: 0, absent: 0, onLeave: 0, wfh: 0, other: 0 },
  )
}

export function filterShifts(shifts = [], search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return shifts
  return shifts.filter(
    (row) =>
      (row.name || '').toLowerCase().includes(q) ||
      (row.timing || '').toLowerCase().includes(q) ||
      (row.status || '').toLowerCase().includes(q),
  )
}

export function filterOvertimeRecords(records, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return records
  return records.filter(
    (r) =>
      (r.name || r.employee || '').toLowerCase().includes(q) ||
      (r.employeeCode || '').toLowerCase().includes(q) ||
      (r.date || '').includes(q) ||
      (r.status || '').toLowerCase().includes(q),
  )
}

export function attendanceSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.name || ''
    case 'clockIn':
      return row.clockIn || ''
    case 'clockOut':
      return row.clockOut || ''
    case 'duration':
      return row.durationMinutes || 0
    case 'status':
      return row.status || ''
    case 'location':
      return row.location || ''
    case 'date':
      return row.attendanceDate || row.date || ''
    default:
      return row[key]
  }
}

export function shiftSortValue(row, key) {
  switch (key) {
    case 'shift':
      return row.name || ''
    case 'timing':
      return row.timing || ''
    case 'employees':
      return Number(row.employees || 0)
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}

export function overtimeSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.name || row.employee || ''
    case 'date':
      return row.date || ''
    case 'ot':
      return Number(row.ot || 0)
    case 'amount':
      return Number(row.amount || 0)
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}
