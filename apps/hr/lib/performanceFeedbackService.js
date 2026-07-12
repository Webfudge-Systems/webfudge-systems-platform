import { schedulePersistPerformanceWorkspace } from '@webfudge/utils/hrPerformance'

const PENDING_STORAGE_KEY = 'hr.performance.feedback.pending'
const RECEIVED_STORAGE_KEY = 'hr.performance.feedback.received'

export const FEEDBACK_UPDATED_EVENT = 'hr:feedback-updated'
export const FEEDBACK_ESS_UPDATED_EVENT = 'ess:performance-updated'

function readJson(key, fallback = []) {
  if (typeof window === 'undefined') return fallback
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
  window.dispatchEvent(new CustomEvent(FEEDBACK_UPDATED_EVENT))
  window.dispatchEvent(new CustomEvent(FEEDBACK_ESS_UPDATED_EVENT))
  schedulePersistPerformanceWorkspace()
}

function normalizePending(row) {
  return {
    id: row.id || `feedback-pending-${Date.now()}`,
    kind: 'pending',
    label: row.label || '',
    due: row.due || '',
    type: row.type === 'Manager' ? 'Manager' : 'Peer',
    employeeId: row.employeeId ? String(row.employeeId) : '',
    employeeMembershipId: row.employeeMembershipId ? String(row.employeeMembershipId) : '',
    employeeName: row.employeeName || '',
    reviewCycle: row.reviewCycle || '',
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

function normalizeReceived(row) {
  return {
    id: row.id || `feedback-received-${Date.now()}`,
    kind: 'received',
    quote: row.quote || '',
    period: row.period || '',
    type: row.type === 'Manager' ? 'Manager' : 'Peer',
    employeeId: row.employeeId ? String(row.employeeId) : '',
    employeeMembershipId: row.employeeMembershipId ? String(row.employeeMembershipId) : '',
    employeeName: row.employeeName || '',
    sourceLabel: row.sourceLabel || '',
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

export function listPendingFeedback() {
  return readJson(PENDING_STORAGE_KEY, []).map(normalizePending)
}

export function listReceivedFeedback() {
  return readJson(RECEIVED_STORAGE_KEY, []).map(normalizeReceived)
}

export function isCustomFeedbackItem(item) {
  return Boolean(item?.id) && !String(item.id).startsWith('seed-')
}

export function isSeedPending(item) {
  return false
}

export function createFeedbackRequest(payload) {
  const label = String(payload.label || '').trim()
  if (!label) throw new Error('Request label is required')
  const employeeName = String(payload.employeeName || '').trim()
  if (!employeeName) throw new Error('Employee is required')

  const record = normalizePending({
    id: `feedback-pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    due: payload.due || '',
    type: payload.type || 'Peer',
    employeeId: payload.employeeId ? String(payload.employeeId) : '',
    employeeMembershipId: payload.employeeMembershipId
      ? String(payload.employeeMembershipId)
      : payload.employeeId
        ? String(payload.employeeId)
        : '',
    employeeName,
    reviewCycle: payload.reviewCycle || '',
    createdAt: new Date().toISOString(),
  })

  const rows = readJson(PENDING_STORAGE_KEY, []).map(normalizePending)
  rows.unshift(record)
  writeJson(PENDING_STORAGE_KEY, rows)
  return record
}

export function updateFeedbackRequest(id, payload) {
  if (!isCustomFeedbackItem({ id })) throw new Error('This feedback request cannot be edited')

  const label = String(payload.label || '').trim()
  if (!label) throw new Error('Request label is required')
  const employeeName = String(payload.employeeName || '').trim()
  if (!employeeName) throw new Error('Employee is required')

  const rows = readJson(PENDING_STORAGE_KEY, []).map(normalizePending)
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) throw new Error('Feedback request not found')

  rows[index] = normalizePending({
    ...rows[index],
    label,
    due: payload.due || '',
    type: payload.type || 'Peer',
    employeeId: payload.employeeId ? String(payload.employeeId) : '',
    employeeMembershipId: payload.employeeMembershipId
      ? String(payload.employeeMembershipId)
      : payload.employeeId
        ? String(payload.employeeId)
        : '',
    employeeName,
    reviewCycle: payload.reviewCycle || '',
  })

  writeJson(PENDING_STORAGE_KEY, rows)
  return rows[index]
}

export function deleteFeedbackRequest(id) {
  if (!isCustomFeedbackItem({ id })) throw new Error('This feedback request cannot be deleted')

  const rows = readJson(PENDING_STORAGE_KEY, []).map(normalizePending).filter((row) => row.id !== id)
  writeJson(PENDING_STORAGE_KEY, rows)
  return true
}

export function submitFeedback(pendingId, payload) {
  const quote = String(payload.quote || '').trim()
  if (!quote) throw new Error('Feedback response is required')

  const pendingRows = listPendingFeedback()
  const pending = pendingRows.find((row) => row.id === pendingId)
  if (!pending) throw new Error('Feedback request not found')

  const received = normalizeReceived({
    id: `feedback-received-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    quote,
    period: payload.period || pending.reviewCycle || '',
    type: pending.type || 'Peer',
    employeeId: pending.employeeId || '',
    employeeMembershipId: pending.employeeMembershipId || pending.employeeId || '',
    employeeName: pending.employeeName || '',
    sourceLabel: pending.label,
    createdAt: new Date().toISOString(),
  })

  const receivedRows = readJson(RECEIVED_STORAGE_KEY, []).map(normalizeReceived)
  receivedRows.unshift(received)
  writeJson(RECEIVED_STORAGE_KEY, receivedRows)

  const rows = readJson(PENDING_STORAGE_KEY, []).map(normalizePending).filter((row) => row.id !== pendingId)
  writeJson(PENDING_STORAGE_KEY, rows)

  return received
}

export function updateReceivedFeedback(id, payload) {
  if (!isCustomFeedbackItem({ id })) throw new Error('This feedback cannot be edited')

  const quote = String(payload.quote || '').trim()
  if (!quote) throw new Error('Feedback text is required')

  const rows = readJson(RECEIVED_STORAGE_KEY, []).map(normalizeReceived)
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) throw new Error('Feedback not found')

  rows[index] = normalizeReceived({
    ...rows[index],
    quote,
    period: payload.period || '',
    type: payload.type || 'Peer',
  })

  writeJson(RECEIVED_STORAGE_KEY, rows)
  return rows[index]
}

export function deleteReceivedFeedback(id) {
  if (!isCustomFeedbackItem({ id })) throw new Error('This feedback cannot be deleted')

  const rows = readJson(RECEIVED_STORAGE_KEY, []).map(normalizeReceived).filter((row) => row.id !== id)
  writeJson(RECEIVED_STORAGE_KEY, rows)
  return true
}
