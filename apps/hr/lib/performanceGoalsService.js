import { COMPANY_OKRS } from './mock-data/performance'

const STORAGE_KEY = 'hr.performance.goals'

export const GOALS_UPDATED_EVENT = 'hr:goals-updated'

function readCustomGoals() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeCustomGoals(rows) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  window.dispatchEvent(new CustomEvent(GOALS_UPDATED_EVENT))
}

function normalizeGoal(row) {
  return {
    id: row.id || `goal-${Date.now()}`,
    objective: row.objective || '',
    scope: row.scope || 'company',
    department: row.department || '',
    reviewCycle: row.reviewCycle || '',
    keyResults: Array.isArray(row.keyResults)
      ? row.keyResults.map((keyResult) => ({
          label: keyResult.label || '',
          progress: Number(keyResult.progress || 0),
        }))
      : [],
    createdAt: row.createdAt || new Date().toISOString(),
  }
}

export function createGoal(payload) {
  const objective = String(payload.objective || '').trim()
  if (!objective) throw new Error('Objective is required')

  const keyResults = (payload.keyResults || [])
    .map((keyResult) => ({
      label: String(keyResult.label || '').trim(),
      progress: Math.min(100, Math.max(0, Number(keyResult.progress || 0))),
    }))
    .filter((keyResult) => keyResult.label)

  if (!keyResults.length) throw new Error('Add at least one key result')

  const record = normalizeGoal({
    id: `goal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    objective,
    scope: payload.scope || 'company',
    department: payload.department || '',
    reviewCycle: payload.reviewCycle || '',
    keyResults,
    createdAt: new Date().toISOString(),
  })

  const rows = readCustomGoals().map(normalizeGoal)
  rows.unshift(record)
  writeCustomGoals(rows)
  return record
}

export function listGoals() {
  const custom = readCustomGoals().map(normalizeGoal)
  const seed = COMPANY_OKRS.map((row, index) => normalizeGoal({ ...row, id: `seed-${index}` }))
  return [...custom, ...seed]
}

export function isCustomGoal(goal) {
  return Boolean(goal?.id) && !String(goal.id).startsWith('seed-')
}

export function updateGoal(id, payload) {
  if (!isCustomGoal({ id })) throw new Error('This goal cannot be edited')

  const objective = String(payload.objective || '').trim()
  if (!objective) throw new Error('Objective is required')

  const keyResults = (payload.keyResults || [])
    .map((keyResult) => ({
      label: String(keyResult.label || '').trim(),
      progress: Math.min(100, Math.max(0, Number(keyResult.progress || 0))),
    }))
    .filter((keyResult) => keyResult.label)

  if (!keyResults.length) throw new Error('Add at least one key result')

  const rows = readCustomGoals().map(normalizeGoal)
  const index = rows.findIndex((row) => row.id === id)
  if (index < 0) throw new Error('Goal not found')

  const updated = normalizeGoal({
    ...rows[index],
    objective,
    scope: payload.scope || 'company',
    department: payload.department || '',
    reviewCycle: payload.reviewCycle || '',
    keyResults,
  })

  rows[index] = updated
  writeCustomGoals(rows)
  return updated
}

export function deleteGoal(id) {
  if (!isCustomGoal({ id })) throw new Error('This goal cannot be deleted')

  const rows = readCustomGoals().map(normalizeGoal).filter((row) => row.id !== id)
  writeCustomGoals(rows)
  return true
}

export function notifyGoalsUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(GOALS_UPDATED_EVENT))
}
