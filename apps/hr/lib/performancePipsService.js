import { schedulePersistPerformanceWorkspace } from '@webfudge/utils/hrPerformance'

const STORAGE_KEY = 'hr.performance.pips'

export const PIPS_UPDATED_EVENT = 'hr:pips-updated'
export const PIPS_ESS_UPDATED_EVENT = 'ess:performance-updated'

function readCustomPips() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeCustomPips(rows) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(PIPS_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(PIPS_ESS_UPDATED_EVENT))
  schedulePersistPerformanceWorkspace()
}

function normalizeMilestones(value) {
  const raw = String(value || '').trim()
  if (!raw) return '0/0'
  const match = raw.match(/^(\d+)\s*\/\s*(\d+)$/)
  if (match) return `${match[1]}/${match[2]}`
  return raw
}

function normalizePip(row) {
  return {
    id: row.id || `pip-${Date.now()}`,
    employee: row.employee || '',
    employeeId: row.employeeId ? String(row.employeeId) : '',
    employeeMembershipId: row.employeeMembershipId ? String(row.employeeMembershipId) : '',
    manager: row.manager || '',
    start: row.start || '',
    duration: row.duration || '',
    milestones: normalizeMilestones(row.milestones),
    status: ['Active', 'Closed', 'Terminated'].includes(row.status) ? row.status : 'Active',
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

export function listPips() {
  return readCustomPips().map(normalizePip)
}

export function isCustomPip(pip) {
  return Boolean(pip?.id) && !String(pip.id).startsWith('seed-')
}

export function createPip(payload) {
  const employee = String(payload.employee || '').trim()
  if (!employee) throw new Error('Employee name is required')

  const manager = String(payload.manager || '').trim()
  if (!manager) throw new Error('Manager name is required')

  const record = normalizePip({
    id: `pip-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    employee,
    employeeId: payload.employeeId ? String(payload.employeeId) : '',
    employeeMembershipId: payload.employeeMembershipId
      ? String(payload.employeeMembershipId)
      : payload.employeeId
        ? String(payload.employeeId)
        : '',
    manager,
    start: payload.start || '',
    duration: payload.duration || '',
    milestones: payload.milestones || '0/5',
    status: payload.status || 'Active',
    createdAt: new Date().toISOString(),
  })

  const rows = readCustomPips().map(normalizePip)
  rows.unshift(record)
  writeCustomPips(rows)
  return record
}

export function updatePip(id, payload) {
  if (!isCustomPip({ id })) throw new Error('This PIP cannot be edited')

  const employee = String(payload.employee || '').trim()
  if (!employee) throw new Error('Employee name is required')

  const manager = String(payload.manager || '').trim()
  if (!manager) throw new Error('Manager name is required')

  const rows = readCustomPips().map(normalizePip)
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) throw new Error('PIP not found')

  const updated = normalizePip({
    ...rows[index],
    employee,
    employeeId: payload.employeeId ? String(payload.employeeId) : '',
    employeeMembershipId: payload.employeeMembershipId
      ? String(payload.employeeMembershipId)
      : payload.employeeId
        ? String(payload.employeeId)
        : '',
    manager,
    start: payload.start || '',
    duration: payload.duration || '',
    milestones: payload.milestones || '0/5',
    status: payload.status || 'Active',
  })

  rows[index] = updated
  writeCustomPips(rows)
  return updated
}

export function deletePip(id) {
  if (!isCustomPip({ id })) throw new Error('This PIP cannot be deleted')

  const rows = readCustomPips().map(normalizePip).filter((row) => row.id !== id)
  writeCustomPips(rows)
  return true
}

export function notifyPipsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(PIPS_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(PIPS_ESS_UPDATED_EVENT))
}
