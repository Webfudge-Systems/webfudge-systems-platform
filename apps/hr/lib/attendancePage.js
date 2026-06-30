export const ATTENDANCE_TAB_KEYS = ['today', 'monthly', 'shifts', 'overtime', 'reports']

export function getAttendanceTabItems({ todayCount = 0, monthlyCount = 0, shiftsCount = 0, overtimeCount = 0 } = {}) {
  return [
    { key: 'today', label: 'Today', count: todayCount },
    { key: 'monthly', label: 'Monthly Log', count: monthlyCount },
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
