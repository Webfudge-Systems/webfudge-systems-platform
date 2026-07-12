import { schedulePersistPerformanceWorkspace } from '@webfudge/utils/hrPerformance'

const STORAGE_KEY = 'hr.performance.reviewCycles'

export const REVIEWS_UPDATED_EVENT = 'hr:reviews-updated'
export const REVIEWS_ESS_UPDATED_EVENT = 'ess:performance-updated'

function readCustomCycles() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeCustomCycles(rows) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(REVIEWS_ESS_UPDATED_EVENT))
  schedulePersistPerformanceWorkspace()
}

function normalizeCycle(row) {
  return {
    id: row.id || `review-${Date.now()}`,
    name: row.name || '',
    period: row.period || '',
    due: row.due || '',
    completion: Math.min(100, Math.max(0, Number(row.completion || 0))),
    status: row.status === 'Closed' ? 'Closed' : 'Active',
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

export function listReviewCycles() {
  return readCustomCycles().map(normalizeCycle)
}

export function isCustomReviewCycle(cycle) {
  return Boolean(cycle?.id) && !String(cycle.id).startsWith('seed-')
}

export function createReviewCycle(payload) {
  const name = String(payload.name || '').trim()
  if (!name) throw new Error('Cycle name is required')

  const period = String(payload.period || '').trim()
  if (!period) throw new Error('Period is required')

  const record = normalizeCycle({
    id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    period,
    due: payload.due || '',
    completion: payload.completion ?? 0,
    status: payload.status || 'Active',
    createdAt: new Date().toISOString(),
  })

  const rows = readCustomCycles().map(normalizeCycle)
  rows.unshift(record)
  writeCustomCycles(rows)
  return record
}

export function updateReviewCycle(id, payload) {
  if (!isCustomReviewCycle({ id })) throw new Error('This review cycle cannot be edited')

  const name = String(payload.name || '').trim()
  if (!name) throw new Error('Cycle name is required')

  const period = String(payload.period || '').trim()
  if (!period) throw new Error('Period is required')

  const rows = readCustomCycles().map(normalizeCycle)
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) throw new Error('Review cycle not found')

  const updated = normalizeCycle({
    ...rows[index],
    name,
    period,
    due: payload.due || '',
    completion: payload.completion ?? 0,
    status: payload.status || 'Active',
  })

  rows[index] = updated
  writeCustomCycles(rows)
  return updated
}

export function deleteReviewCycle(id) {
  if (!isCustomReviewCycle({ id })) throw new Error('This review cycle cannot be deleted')

  const rows = readCustomCycles().map(normalizeCycle).filter((row) => row.id !== id)
  writeCustomCycles(rows)
  return true
}

export function notifyReviewsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REVIEWS_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(REVIEWS_ESS_UPDATED_EVENT))
}
