import { resolveAttendanceShift } from './shiftShared'

export function currentTimeValue(date = new Date()) {
  const now = date instanceof Date ? date : new Date(date)
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

export function hasValidClock(value) {
  return Boolean(value && value !== '—' && String(value).trim() !== '')
}

export function getTodayClockState(todayLog, savedRecord) {
  const clockIn = savedRecord?.clockIn || todayLog?.checkIn || ''
  const clockOut = savedRecord?.clockOut || todayLog?.checkOut || ''
  const hasIn = hasValidClock(clockIn)
  const hasOut = hasValidClock(clockOut)
  const status = todayLog?.status || 'not_marked'
  const blocked = status === 'leave' || status === 'weekend'

  return {
    blocked,
    canTimeIn: !blocked && !hasIn,
    canTimeOut: !blocked && hasIn && !hasOut,
    isComplete: !blocked && hasIn && hasOut,
    hasIn,
    hasOut,
    clockIn: hasIn ? clockIn : '',
    clockOut: hasOut ? clockOut : '',
    recordId: savedRecord?.id || todayLog?.recordId || null,
    workShift: savedRecord?.workShift || todayLog?.workShift || '',
    statusRaw: savedRecord?.statusRaw || (status === 'wfh' ? 'wfh' : 'present'),
  }
}

export function buildTimePunchPayload({ action, membershipId, attendanceDate, clockState, employee, selectedShift }) {
  const now = currentTimeValue()
  const workShift = resolveAttendanceShift(employee, selectedShift || clockState.workShift)
  if (action === 'in') {
    return {
      recordId: clockState.recordId,
      organizationUserId: membershipId,
      attendanceDate,
      status: 'present',
      workShift,
      clockIn: now,
      clockOut: clockState.hasOut ? clockState.clockOut : '',
      notes: '',
    }
  }

  return {
    recordId: clockState.recordId,
    organizationUserId: membershipId,
    attendanceDate,
    status: clockState.statusRaw === 'wfh' ? 'wfh' : 'present',
    workShift,
    clockIn: clockState.clockIn,
    clockOut: now,
    notes: '',
  }
}
