import {
  EMPTY_PERFORMANCE_WORKSPACE,
  PERFORMANCE_WORKSPACE_UPDATED_EVENT,
  readPerformanceWorkspaceFromStorage,
  workspaceHasData,
  writePerformanceWorkspaceToStorage,
} from './workspace.js'

const API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'
    ? 'https://api.webfudge.in'
    : 'http://localhost:1338')

function readOrgId() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('current-org-id')
}

function readToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth-token')
}

async function request(endpoint, options = {}) {
  const token = readToken()
  const orgId = readOrgId()
  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    const err = errorData?.error || errorData
    const message =
      err?.message ||
      (Array.isArray(err?.details?.errors) && err.details.errors[0]?.message) ||
      (typeof err === 'string' ? err : null) ||
      `HTTP ${response.status}`
    throw new Error(message)
  }

  return response.json()
}

function normalizeRemotePayload(raw = EMPTY_PERFORMANCE_WORKSPACE) {
  return {
    goals: Array.isArray(raw.goals) ? raw.goals : [],
    reviewCycles: Array.isArray(raw.reviewCycles) ? raw.reviewCycles : [],
    feedbackPending: Array.isArray(raw.feedbackPending) ? raw.feedbackPending : [],
    feedbackReceived: Array.isArray(raw.feedbackReceived) ? raw.feedbackReceived : [],
    appraisals: Array.isArray(raw.appraisals) ? raw.appraisals : [],
    pips: Array.isArray(raw.pips) ? raw.pips : [],
  }
}

export async function fetchPerformanceWorkspace() {
  const response = await request('/hr-performance-workspace/current')
  return normalizeRemotePayload(response?.data?.payload || EMPTY_PERFORMANCE_WORKSPACE)
}

export async function savePerformanceWorkspace(payload) {
  const normalized = normalizeRemotePayload(payload)
  await request('/hr-performance-workspace/current', {
    method: 'PUT',
    body: { payload: normalized },
  })
  return normalized
}

let persistTimer = null
let hydratePromise = null

export function schedulePersistPerformanceWorkspace(delayMs = 400) {
  if (typeof window === 'undefined') return
  if (persistTimer) window.clearTimeout(persistTimer)
  persistTimer = window.setTimeout(() => {
    persistTimer = null
    persistPerformanceWorkspace().catch(() => {})
  }, delayMs)
}

export async function persistPerformanceWorkspace() {
  const local = readPerformanceWorkspaceFromStorage()
  await savePerformanceWorkspace(local)
  return local
}

export async function hydratePerformanceWorkspace({ pushLocalIfRemoteEmpty = true } = {}) {
  if (typeof window === 'undefined') return EMPTY_PERFORMANCE_WORKSPACE

  if (!readToken() || !readOrgId()) {
    return readPerformanceWorkspaceFromStorage()
  }

  const local = readPerformanceWorkspaceFromStorage()

  try {
    const remote = await fetchPerformanceWorkspace()
    if (workspaceHasData(remote)) {
      writePerformanceWorkspaceToStorage(remote)
      return remote
    }

    if (pushLocalIfRemoteEmpty && workspaceHasData(local)) {
      await savePerformanceWorkspace(local)
      return local
    }

    writePerformanceWorkspaceToStorage(remote)
    return remote
  } catch {
    return local
  }
}

export function hydratePerformanceWorkspaceOnce(options = {}) {
  if (typeof window === 'undefined') {
    return Promise.resolve(EMPTY_PERFORMANCE_WORKSPACE)
  }
  if (!hydratePromise) {
    hydratePromise = hydratePerformanceWorkspace(options).finally(() => {
      hydratePromise = null
    })
  }
  return hydratePromise
}

export { PERFORMANCE_WORKSPACE_UPDATED_EVENT }
