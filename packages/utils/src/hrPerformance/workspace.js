export const PERFORMANCE_WORKSPACE_FIELDS = {
  goals: 'hr.performance.goals',
  reviewCycles: 'hr.performance.reviewCycles',
  feedbackPending: 'hr.performance.feedback.pending',
  feedbackReceived: 'hr.performance.feedback.received',
  appraisals: 'hr.performance.appraisals',
  pips: 'hr.performance.pips',
}

export const PERFORMANCE_WORKSPACE_UPDATED_EVENT = 'ess:performance-updated'

export const EMPTY_PERFORMANCE_WORKSPACE = {
  goals: [],
  reviewCycles: [],
  feedbackPending: [],
  feedbackReceived: [],
  appraisals: [],
  pips: [],
}

function normalizeName(value = '') {
  return String(value || '').trim().toLowerCase()
}

export function namesMatch(a, b) {
  const left = normalizeName(a)
  const right = normalizeName(b)
  if (!left || !right) return false
  return left === right || left.includes(right) || right.includes(left)
}

export function collectEmployeeIdentifiers(employee, membershipIdOverride) {
  const ids = new Set()
  const add = (value) => {
    const normalized = String(value ?? '').trim()
    if (normalized) ids.add(normalized)
  }

  if (!employee) {
    add(membershipIdOverride)
    return { ids, name: '' }
  }

  add(employee.id)
  add(employee.membershipId)
  add(membershipIdOverride)
  add(employee.userId)
  add(employee.employeeId)
  add(employee.email)

  return {
    ids,
    name: String(employee.name || '').trim(),
  }
}

export function recordMatchesEmployee(
  record,
  employee,
  membershipIdOverride,
  { idFields = ['employeeId', 'assigneeId', 'assigneeMembershipId'], nameFields = ['employee', 'assigneeName', 'employeeName'] } = {},
) {
  if (!record) return false

  const { ids, name } = collectEmployeeIdentifiers(employee, membershipIdOverride)

  for (const field of idFields) {
    const value = record[field]
    if (value != null && value !== '' && ids.has(String(value))) return true
  }

  if (name) {
    for (const field of nameFields) {
      const value = record[field]
      if (value && namesMatch(value, name)) return true
    }
  }

  return false
}

export function readPerformanceWorkspaceFromStorage() {
  if (typeof window === 'undefined') return { ...EMPTY_PERFORMANCE_WORKSPACE }

  const read = (key) => {
    try {
      const raw = localStorage.getItem(key)
      const parsed = raw ? JSON.parse(raw) : []
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  return {
    goals: read(PERFORMANCE_WORKSPACE_FIELDS.goals),
    reviewCycles: read(PERFORMANCE_WORKSPACE_FIELDS.reviewCycles),
    feedbackPending: read(PERFORMANCE_WORKSPACE_FIELDS.feedbackPending),
    feedbackReceived: read(PERFORMANCE_WORKSPACE_FIELDS.feedbackReceived),
    appraisals: read(PERFORMANCE_WORKSPACE_FIELDS.appraisals),
    pips: read(PERFORMANCE_WORKSPACE_FIELDS.pips),
  }
}

export function writePerformanceWorkspaceToStorage(payload = EMPTY_PERFORMANCE_WORKSPACE) {
  if (typeof window === 'undefined') return

  const write = (key, rows) => {
    localStorage.setItem(key, JSON.stringify(Array.isArray(rows) ? rows : []))
  }

  write(PERFORMANCE_WORKSPACE_FIELDS.goals, payload.goals)
  write(PERFORMANCE_WORKSPACE_FIELDS.reviewCycles, payload.reviewCycles)
  write(PERFORMANCE_WORKSPACE_FIELDS.feedbackPending, payload.feedbackPending)
  write(PERFORMANCE_WORKSPACE_FIELDS.feedbackReceived, payload.feedbackReceived)
  write(PERFORMANCE_WORKSPACE_FIELDS.appraisals, payload.appraisals)
  write(PERFORMANCE_WORKSPACE_FIELDS.pips, payload.pips)

  window.dispatchEvent(new CustomEvent(PERFORMANCE_WORKSPACE_UPDATED_EVENT))
}

export function workspaceHasData(payload = EMPTY_PERFORMANCE_WORKSPACE) {
  return Object.values(payload).some((rows) => Array.isArray(rows) && rows.length > 0)
}
