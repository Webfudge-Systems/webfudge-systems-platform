'use client'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338')

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth-token')
}

function getOrgId() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('current-org-id')
}

function buildQueryString(params = {}) {
  const parts = []
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    parts.push(`${key}=${encodeURIComponent(value)}`)
  })
  return parts.join('&')
}

async function request(endpoint, options = {}) {
  const token = getToken()
  const orgId = getOrgId()

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
    const data = await response.json().catch(() => ({}))
    const err = data?.error || data
    throw new Error(err?.message || (typeof err === 'string' ? err : `HTTP ${response.status}`))
  }

  return response.json()
}

function normalizeRows(response) {
  if (Array.isArray(response?.data)) return response.data
  if (Array.isArray(response)) return response
  return []
}

function relationId(value) {
  if (value == null) return null
  if (typeof value === 'object') return value.id ?? value.documentId ?? null
  return value
}

export function mapRegularizationRequest(row) {
  const statusRaw = String(row.status || 'pending').toLowerCase()
  return {
    id: row.id,
    organizationUserId: String(relationId(row.organizationUser) || ''),
    attendanceDate: row.attendanceDate || '',
    requestedStatus: row.requestedStatus || 'present',
    clockIn: row.clockIn || '',
    clockOut: row.clockOut || '',
    reason: row.reason || '',
    status:
      statusRaw === 'approved' ? 'Approved' : statusRaw === 'rejected' ? 'Rejected' : 'Pending',
    statusRaw,
    hrComment: row.hrComment || '',
    submittedOn: row.createdAt || '',
  }
}

export async function listRegularizationRequests(params = {}) {
  const qs = buildQueryString({
    limit: params.limit || 100,
    page: params.page || 1,
    ...(params.status ? { status: params.status } : {}),
    ...(params.organizationUser ? { organizationUser: params.organizationUser } : {}),
  })
  const response = await request(
    qs ? `/attendance-regularizations?${qs}` : '/attendance-regularizations',
  )
  return normalizeRows(response).map(mapRegularizationRequest)
}

export async function createRegularizationRequest(payload) {
  const response = await request('/attendance-regularizations', {
    method: 'POST',
    body: {
      data: {
        organizationUser: Number(payload.organizationUserId),
        attendanceDate: payload.attendanceDate,
        requestedStatus: payload.requestedStatus || 'present',
        clockIn: payload.clockIn || null,
        clockOut: payload.clockOut || null,
        reason: payload.reason || '',
      },
    },
  })
  return mapRegularizationRequest(response?.data || response)
}

export const REGULARIZATION_UPDATED_EVENT = 'ess-regularization-updated'

export function notifyRegularizationUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REGULARIZATION_UPDATED_EVENT))
}
