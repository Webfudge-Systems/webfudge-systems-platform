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

function readField(row, key) {
  if (row == null) return undefined
  if (row[key] !== undefined) return row[key]
  if (row?.attributes?.[key] !== undefined) return row.attributes[key]
  return undefined
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

export function mapLeaveRequest(row) {
  const orgUser = row.organizationUser || {}
  const user = orgUser.user || {}
  const profile = row.employeeProfile || {}
  const membershipId = relationId(orgUser) || relationId(row.organizationUser)

  return {
    id: row.id,
    organizationUserId: membershipId ? String(membershipId) : '',
    employeeId: membershipId ? String(membershipId) : '',
    employeeName: userDisplayName(user),
    employeeCode: profile.employeeCode || '',
    department: orgUser.primaryDepartment?.name || '—',
    type: row.leaveType || '',
    from: row.fromDate || '',
    to: row.toDate || row.fromDate || '',
    days: Number(row.days || 1),
    reason: row.reason || '',
    appliedOn: row.appliedOn || row.createdAt || '',
    status: String(row.status || 'pending').toLowerCase() === 'approved'
      ? 'Approved'
      : String(row.status || 'pending').toLowerCase() === 'rejected'
        ? 'Rejected'
        : String(row.status || 'pending').toLowerCase() === 'cancelled'
          ? 'Cancelled'
          : 'Pending',
    statusRaw: String(row.status || 'pending').toLowerCase(),
    rejectionReason: row.rejectionReason || '',
    approvedAt: row.approvedAt || null,
  }
}

export async function listLeaveRequests(params = {}) {
  const qs = buildQueryString({
    limit: params.limit || 200,
    page: params.page || 1,
    ...(params.status ? { status: params.status } : {}),
    ...(params.organizationUser ? { organizationUser: params.organizationUser } : {}),
  })
  const response = await request(qs ? `/leave-requests?${qs}` : '/leave-requests')
  return normalizeRows(response).map(mapLeaveRequest)
}

export async function createLeaveRequest(payload) {
  const response = await request('/leave-requests', {
    method: 'POST',
    body: {
      data: {
        organizationUser: Number(payload.organizationUserId),
        leaveType: payload.leaveType,
        fromDate: payload.fromDate,
        toDate: payload.toDate || payload.fromDate,
        reason: payload.reason || '',
      },
    },
  })
  return mapLeaveRequest(response?.data || response)
}

export async function approveLeaveRequest(id) {
  const response = await request(`/leave-requests/${id}/approve`, { method: 'POST', body: {} })
  return mapLeaveRequest(response?.data || response)
}

export async function rejectLeaveRequest(id, rejectionReason = '') {
  const response = await request(`/leave-requests/${id}/reject`, {
    method: 'POST',
    body: { data: { rejectionReason } },
  })
  return mapLeaveRequest(response?.data || response)
}

export async function deleteLeaveRequest(id) {
  await request(`/leave-requests/${id}`, { method: 'DELETE' })
  return true
}

export async function cancelLeaveRequest(id) {
  const response = await request(`/leave-requests/${id}/cancel`, { method: 'POST', body: {} })
  return mapLeaveRequest(response?.data || response)
}

export function exportLeaveRequestsCsv(requests = []) {
  const header = ['Employee', 'Employee ID', 'Type', 'From', 'To', 'Days', 'Status', 'Reason', 'Applied On']
  const lines = requests.map((row) =>
    [
      row.employeeName,
      row.employeeCode || row.employeeId,
      row.type,
      row.from,
      row.to,
      row.days,
      row.status,
      (row.reason || '').replace(/"/g, '""'),
      row.appliedOn,
    ]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
      .join(','),
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `leave-requests-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
