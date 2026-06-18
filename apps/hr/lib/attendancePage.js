import { ATTENDANCE_LOG, OVERTIME_RECORDS, SHIFTS } from './mock-data/attendance'

export const ATTENDANCE_TAB_KEYS = ['today', 'monthly', 'shifts', 'overtime', 'reports']

export function getAttendanceTabItems() {
  return [
    { key: 'today', label: 'Today', count: ATTENDANCE_LOG.length },
    { key: 'monthly', label: 'Monthly Log', count: 0 },
    { key: 'shifts', label: 'Shifts', count: SHIFTS.length },
    { key: 'overtime', label: 'Overtime', count: OVERTIME_RECORDS.length },
    { key: 'reports', label: 'Reports', count: 0 },
  ]
}

export function filterAttendanceLog(log, { search = '', statusFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return log.filter((row) => {
    if (statusFilter && row.status !== statusFilter) return false
    if (!q) return true
    return (
      row.name.toLowerCase().includes(q) ||
      row.employeeId.toLowerCase().includes(q) ||
      (row.location || '').toLowerCase().includes(q)
    )
  })
}

export function filterOvertimeRecords(records, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return records
  return records.filter(
    (r) =>
      r.employee.toLowerCase().includes(q) ||
      r.date.includes(q) ||
      r.status.toLowerCase().includes(q)
  )
}

export function todayDateLabel() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
