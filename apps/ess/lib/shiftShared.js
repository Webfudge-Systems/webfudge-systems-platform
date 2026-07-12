export const WORK_SHIFTS = [
  { id: 'morning', name: 'Morning', timing: '9:00 AM – 6:00 PM', shiftStart: '09:00', shiftEnd: '18:00' },
  { id: 'evening', name: 'Evening', timing: '2:00 PM – 11:00 PM', shiftStart: '14:00', shiftEnd: '23:00' },
  { id: 'night', name: 'Night', timing: '10:00 PM – 7:00 AM', shiftStart: '22:00', shiftEnd: '07:00' },
]

export const SHIFT_OPTIONS = WORK_SHIFTS.map((shift) => ({
  value: shift.id,
  label: `${shift.name} (${shift.timing})`,
}))

const SHIFT_IDS = new Set(WORK_SHIFTS.map((shift) => shift.id))

export function normalizeShiftId(value = '') {
  const raw = String(value || 'morning').toLowerCase().trim()
  return SHIFT_IDS.has(raw) ? raw : 'morning'
}

export function getShiftById(shiftId) {
  const id = normalizeShiftId(shiftId)
  return WORK_SHIFTS.find((shift) => shift.id === id) || WORK_SHIFTS[0]
}

export function formatShiftLabel(shiftId) {
  const shift = getShiftById(shiftId)
  return `${shift.name} (${shift.timing})`
}

export function parseAssignedShifts(source) {
  if (Array.isArray(source)) {
    return source.map(normalizeShiftId).filter((id, index, list) => list.indexOf(id) === index)
  }
  if (typeof source === 'string' && source.trim()) {
    try {
      const parsed = JSON.parse(source)
      if (Array.isArray(parsed)) return parseAssignedShifts(parsed)
    } catch {
      return [normalizeShiftId(source)]
    }
  }
  return []
}

export function readShiftConfigFromProfile(profile = null, meta = {}) {
  const assignedShifts = parseAssignedShifts(profile?.assignedShifts).length
    ? parseAssignedShifts(profile?.assignedShifts)
    : parseAssignedShifts(meta.assignedShifts).length
      ? parseAssignedShifts(meta.assignedShifts)
      : [normalizeShiftId(profile?.primaryShift || meta.primaryShift || 'morning')]

  const primaryShift = normalizeShiftId(
    profile?.primaryShift || meta.primaryShift || assignedShifts[0] || 'morning',
  )
  const flexibleShift = Boolean(profile?.flexibleShift ?? meta.flexibleShift)

  const normalizedAssigned = assignedShifts.includes(primaryShift)
    ? assignedShifts
    : [primaryShift, ...assignedShifts]

  return {
    primaryShift,
    assignedShifts: normalizedAssigned,
    flexibleShift,
  }
}

export function getShiftOptionsForEmployee(employee) {
  const config = readShiftConfigFromProfile(null, employee || {})
  const ids = config.assignedShifts?.length ? config.assignedShifts : [config.primaryShift]
  return SHIFT_OPTIONS.filter((option) => ids.includes(option.value))
}

export function resolveAttendanceShift(employee, selectedShift) {
  const config = readShiftConfigFromProfile(null, employee || {})
  const assigned = config.assignedShifts?.length ? config.assignedShifts : [config.primaryShift]

  if (!config.flexibleShift) {
    return config.primaryShift
  }

  const picked = normalizeShiftId(selectedShift)
  if (assigned.includes(picked)) return picked
  return assigned[0] || config.primaryShift
}

export function shouldShowShiftPicker(employee) {
  const config = readShiftConfigFromProfile(null, employee || {})
  return Boolean(config.flexibleShift && config.assignedShifts.length > 1)
}
