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

function userDisplayName(user = {}) {
  const full = `${user.firstName || ''} ${user.lastName || ''}`.trim()
  return full || user.username || user.email || 'Employee'
}

export function mapRegularizationRequest(row) {
  const orgUser = row.organizationUser || {}
  const user = orgUser.user || {}
  const statusRaw = String(row.status || 'pending').toLowerCase()
  return {
    id: row.id,
    organizationUserId: String(relationId(orgUser) || ''),
    employeeName: userDisplayName(user),
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

export async function approveRegularizationRequest(id, hrComment = '') {
  const response = await request(`/attendance-regularizations/${id}/approve`, {
    method: 'POST',
    body: { data: { hrComment } },
  })
  return mapRegularizationRequest(response?.data || response)
}

export async function rejectRegularizationRequest(id, hrComment = '') {
  const response = await request(`/attendance-regularizations/${id}/reject`, {
    method: 'POST',
    body: { data: { hrComment } },
  })
  return mapRegularizationRequest(response?.data || response)
}

export const REGULARIZATION_UPDATED_EVENT = 'hr-regularization-updated'

export function notifyRegularizationUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(REGULARIZATION_UPDATED_EVENT))
}
