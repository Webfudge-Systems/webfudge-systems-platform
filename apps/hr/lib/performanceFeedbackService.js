import { PENDING_FEEDBACK, RECEIVED_FEEDBACK } from './performancePage'

const PENDING_STORAGE_KEY = 'hr.performance.feedback.pending'
const RECEIVED_STORAGE_KEY = 'hr.performance.feedback.received'
const COMPLETED_SEED_KEY = 'hr.performance.feedback.completedSeeds'

export const FEEDBACK_UPDATED_EVENT = 'hr:feedback-updated'

const SEED_PENDING = PENDING_FEEDBACK.map((row, index) => ({
  ...row,
  id: `seed-pending-${index}`,
  kind: 'pending',
}))

const SEED_RECEIVED = RECEIVED_FEEDBACK.map((row, index) => ({
  ...row,
  id: `seed-received-${index}`,
  kind: 'received',
}))

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
}

function readCompletedSeeds() {
  return readJson(COMPLETED_SEED_KEY, [])
}

function writeCompletedSeeds(ids) {
  writeJson(COMPLETED_SEED_KEY, ids)
}

function normalizePending(row) {
  return {
    id: row.id || `feedback-pending-${Date.now()}`,
    kind: 'pending',
    label: row.label || '',
    due: row.due || '',
    type: row.type === 'Manager' ? 'Manager' : 'Peer',
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
    sourceLabel: row.sourceLabel || '',
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

export function listPendingFeedback() {
  const completed = readCompletedSeeds()
  const custom = readJson(PENDING_STORAGE_KEY, []).map(normalizePending)
  const seed = SEED_PENDING.filter((row) => !completed.includes(row.id))
  return [...custom, ...seed]
}

export function listReceivedFeedback() {
  const custom = readJson(RECEIVED_STORAGE_KEY, []).map(normalizeReceived)
  return [...custom, ...SEED_RECEIVED]
}

export function isCustomFeedbackItem(item) {
  return Boolean(item?.id) && !String(item.id).startsWith('seed-')
}

export function isSeedPending(item) {
  return Boolean(item?.id) && String(item.id).startsWith('seed-pending-')
}

export function createFeedbackRequest(payload) {
  const label = String(payload.label || '').trim()
  if (!label) throw new Error('Request label is required')

  const record = normalizePending({
    id: `feedback-pending-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    label,
    due: payload.due || '',
    type: payload.type || 'Peer',
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

  const rows = readJson(PENDING_STORAGE_KEY, []).map(normalizePending)
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) throw new Error('Feedback request not found')

  rows[index] = normalizePending({
    ...rows[index],
    label,
    due: payload.due || '',
    type: payload.type || 'Peer',
    reviewCycle: payload.reviewCycle || '',
  })

  writeJson(PENDING_STORAGE_KEY, rows)
  return rows[index]
}

export function deleteFeedbackRequest(id) {
  if (isSeedPending({ id })) {
    const completed = readCompletedSeeds()
    if (!completed.includes(id)) {
      writeCompletedSeeds([...completed, id])
    }
    return true
  }

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
    sourceLabel: pending.label,
    createdAt: new Date().toISOString(),
  })

  const receivedRows = readJson(RECEIVED_STORAGE_KEY, []).map(normalizeReceived)
  receivedRows.unshift(received)
  writeJson(RECEIVED_STORAGE_KEY, receivedRows)

  if (isSeedPending(pending)) {
    const completed = readCompletedSeeds()
    if (!completed.includes(pendingId)) {
      writeCompletedSeeds([...completed, pendingId])
    }
  } else {
    const rows = readJson(PENDING_STORAGE_KEY, []).map(normalizePending).filter((row) => row.id !== pendingId)
    writeJson(PENDING_STORAGE_KEY, rows)
  }

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
