import { APPRAISALS } from './mock-data/performance'

const STORAGE_KEY = 'hr.performance.appraisals'

export const APPRAISALS_UPDATED_EVENT = 'hr:appraisals-updated'

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
}

function normalizeAppraisal(row) {
  return {
    id: row.id || `appraisal-${Date.now()}`,
    employee: row.employee || '',
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
  const custom = readCustomAppraisals().map(normalizeAppraisal)
  const seed = APPRAISALS.map((row, index) => normalizeAppraisal({ ...row, id: `seed-${index}` }))
  return [...custom, ...seed]
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
