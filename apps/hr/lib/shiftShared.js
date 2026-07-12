export const WORK_SHIFTS = [
  { id: 'morning', name: 'Morning', timing: '9:00 AM – 6:00 PM', shiftStart: '09:00', shiftEnd: '18:00' },
  { id: 'evening', name: 'Evening', timing: '2:00 PM – 11:00 PM', shiftStart: '14:00', shiftEnd: '23:00' },
  { id: 'night', name: 'Night', timing: '10:00 PM – 7:00 AM', shiftStart: '22:00', shiftEnd: '07:00' },
]

/** @deprecated use WORK_SHIFTS */
export const DEFAULT_SHIFTS = WORK_SHIFTS.map(({ id, name, timing }) => ({
  id,
  name,
  timing,
  employees: 0,
}))

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

export function getShiftStartTime(shiftId) {
  return getShiftById(shiftId).shiftStart
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

export function isEmployeeAssignedToShift(employee, shiftId) {
  const config = readShiftConfigFromProfile(null, employee || {})
  const id = normalizeShiftId(shiftId)
  if (!config.flexibleShift && config.primaryShift === id) return true
  return config.assignedShifts.includes(id)
}

export function buildShiftCardsFromEmployees(employees = []) {
  const activeEmployees = employees.filter((employee) => employee.status !== 'Exited')

  return WORK_SHIFTS.map((shift) => {
    const assigned = activeEmployees.filter((employee) => isEmployeeAssignedToShift(employee, shift.id)).length
    return {
      ...shift,
      shiftCode: shift.id.toUpperCase(),
      employees: assigned,
      assignedLabel:
        assigned === 0 ? 'No employees' : assigned === 1 ? '1 employee' : `${assigned} employees`,
      status: assigned > 0 ? 'Active' : 'Unassigned',
    }
  })
}

export function buildEmployeeProfileShiftPayload(form = {}) {
  const assignedShifts = parseAssignedShifts(form.assignedShifts)
  const primaryShift = normalizeShiftId(form.primaryShift || assignedShifts[0] || 'morning')
  const flexibleShift = Boolean(form.flexibleShift)
  const normalizedAssigned = assignedShifts.length ? assignedShifts : [primaryShift]

  return {
    primaryShift,
    assignedShifts: normalizedAssigned.includes(primaryShift)
      ? normalizedAssigned
      : [primaryShift, ...normalizedAssigned],
    flexibleShift,
  }
}
