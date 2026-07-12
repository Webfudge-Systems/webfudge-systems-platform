import { schedulePersistPerformanceWorkspace } from '@webfudge/utils/hrPerformance'

const STORAGE_KEY = 'hr.performance.appraisals'

export const APPRAISALS_UPDATED_EVENT = 'hr:appraisals-updated'
export const APPRAISALS_ESS_UPDATED_EVENT = 'ess:performance-updated'

function readCustomAppraisals() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeCustomAppraisals(rows) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(APPRAISALS_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(APPRAISALS_ESS_UPDATED_EVENT))
  schedulePersistPerformanceWorkspace()
}

function normalizeAppraisal(row) {
  return {
    id: row.id || `appraisal-${Date.now()}`,
    employee: row.employee || '',
    employeeId: row.employeeId ? String(row.employeeId) : '',
    employeeMembershipId: row.employeeMembershipId ? String(row.employeeMembershipId) : '',
    department: row.department || '',
    rating: Number(row.rating || 0),
    revision: Math.min(100, Math.max(0, Number(row.revision || 0))),
    promotion: row.promotion === 'Yes' ? 'Yes' : 'No',
    effective: row.effective || '',
    status: row.status === 'Approved' ? 'Approved' : 'Pending',
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

export function listAppraisals() {
  return readCustomAppraisals().map(normalizeAppraisal)
}

export function isCustomAppraisal(appraisal) {
  return Boolean(appraisal?.id) && !String(appraisal.id).startsWith('seed-')
}

export function createAppraisal(payload) {
  const employee = String(payload.employee || '').trim()
  if (!employee) throw new Error('Employee name is required')

  const record = normalizeAppraisal({
    id: `appraisal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    employee,
    employeeId: payload.employeeId ? String(payload.employeeId) : '',
    employeeMembershipId: payload.employeeMembershipId
      ? String(payload.employeeMembershipId)
      : payload.employeeId
        ? String(payload.employeeId)
        : '',
    department: payload.department || '',
    rating: payload.rating ?? 0,
    revision: payload.revision ?? 0,
    promotion: payload.promotion || 'No',
    effective: payload.effective || '',
    status: payload.status || 'Pending',
    createdAt: new Date().toISOString(),
  })

  const rows = readCustomAppraisals().map(normalizeAppraisal)
  rows.unshift(record)
  writeCustomAppraisals(rows)
  return record
}

export function updateAppraisal(id, payload) {
  if (!isCustomAppraisal({ id })) throw new Error('This appraisal cannot be edited')

  const employee = String(payload.employee || '').trim()
  if (!employee) throw new Error('Employee name is required')

  const rows = readCustomAppraisals().map(normalizeAppraisal)
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) throw new Error('Appraisal not found')

  const updated = normalizeAppraisal({
    ...rows[index],
    employee,
    employeeId: payload.employeeId ? String(payload.employeeId) : '',
    employeeMembershipId: payload.employeeMembershipId
      ? String(payload.employeeMembershipId)
      : payload.employeeId
        ? String(payload.employeeId)
        : '',
    department: payload.department || '',
    rating: payload.rating ?? 0,
    revision: payload.revision ?? 0,
    promotion: payload.promotion || 'No',
    effective: payload.effective || '',
    status: payload.status || 'Pending',
  })

  rows[index] = updated
  writeCustomAppraisals(rows)
  return updated
}

export function deleteAppraisal(id) {
  if (!isCustomAppraisal({ id })) throw new Error('This appraisal cannot be deleted')

  const rows = readCustomAppraisals().map(normalizeAppraisal).filter((row) => row.id !== id)
  writeCustomAppraisals(rows)
  return true
}

export function notifyAppraisalsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(APPRAISALS_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(APPRAISALS_ESS_UPDATED_EVENT))
}
