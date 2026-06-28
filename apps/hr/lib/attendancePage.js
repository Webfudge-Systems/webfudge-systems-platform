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

export function filterOvertimeRecords(records, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return records
  return records.filter(
    (r) =>
      (r.employee || '').toLowerCase().includes(q) ||
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
      return row.attendanceDate || ''
    default:
      return row[key]
  }
}
