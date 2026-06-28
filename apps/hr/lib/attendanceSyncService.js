'use client'

import { formatAttendanceStatus, formatDurationMinutes } from './attendanceShared'

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

function formatClock(value) {
  if (!value) return '—'
  const str = String(value)
  const match = str.match(/(\d{1,2}):(\d{2})/)
  if (!match) return '—'
  return `${String(match[1]).padStart(2, '0')}:${match[2]}`
}

export function mapAttendanceRecord(row) {
  const orgUser = row.organizationUser || {}
  const user = orgUser.user || {}
  const profile = row.employeeProfile || {}
  const membershipId = relationId(orgUser)

  return {
    id: row.id,
    organizationUserId: membershipId ? String(membershipId) : '',
    employeeId: membershipId ? String(membershipId) : '',
    employeeCode: profile.employeeCode || '',
    name: userDisplayName(user),
    department: orgUser.primaryDepartment?.name || '—',
    attendanceDate: row.attendanceDate || '',
    clockIn: formatClock(row.clockIn),
    clockOut: formatClock(row.clockOut),
    durationMinutes: Number(row.durationMinutes || 0),
    duration: formatDurationMinutes(row.durationMinutes),
    status: formatAttendanceStatus(row.status),
    statusRaw: String(row.status || 'absent').toLowerCase(),
    location: row.location || '—',
    late: Boolean(row.late),
    notes: row.notes || '',
    inferred: false,
  }
}

export function mapOvertimeRecord(row) {
  const orgUser = row.organizationUser || {}
  const user = orgUser.user || {}
  const statusRaw = String(row.status || 'pending').toLowerCase()

  return {
    id: row.id,
    organizationUserId: relationId(orgUser) ? String(relationId(orgUser)) : '',
    employee: userDisplayName(user),
    date: row.recordDate || '',
    regular: Number(row.regularHours || 8),
    ot: Number(row.overtimeHours || 0),
    amount: Number(row.amount || 0),
    status:
      statusRaw === 'approved' ? 'Approved' : statusRaw === 'paid' ? 'Paid' : 'Pending Approval',
    statusRaw,
    notes: row.notes || '',
  }
}

export async function listAttendanceRecords(params = {}) {
  const qs = buildQueryString({
    limit: params.limit || 500,
    page: params.page || 1,
    ...(params.date ? { date: params.date } : {}),
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
    ...(params.organizationUser ? { organizationUser: params.organizationUser } : {}),
  })
  const response = await request(qs ? `/attendance-records?${qs}` : '/attendance-records')
  return normalizeRows(response).map(mapAttendanceRecord)
}

export async function upsertAttendanceRecord(payload) {
  const response = await request('/attendance-records', {
    method: 'POST',
    body: {
      data: {
        organizationUser: Number(payload.organizationUserId),
        attendanceDate: payload.attendanceDate,
        status: payload.status,
        clockIn: payload.clockIn,
        clockOut: payload.clockOut,
        location: payload.location,
        late: payload.late,
        notes: payload.notes,
      },
    },
  })
  return mapAttendanceRecord(response?.data || response)
}

export async function updateAttendanceRecord(id, payload) {
  const response = await request(`/attendance-records/${id}`, {
    method: 'PUT',
    body: { data: payload },
  })
  return mapAttendanceRecord(response?.data || response)
}

export async function deleteAttendanceRecord(id) {
  await request(`/attendance-records/${id}`, { method: 'DELETE' })
  return true
}

export async function listOvertimeRecords(params = {}) {
  const qs = buildQueryString({ limit: params.limit || 100, page: params.page || 1 })
  const response = await request(qs ? `/overtime-records?${qs}` : '/overtime-records')
  return normalizeRows(response).map(mapOvertimeRecord)
}

export async function createOvertimeRecord(payload) {
  const response = await request('/overtime-records', {
    method: 'POST',
    body: {
      data: {
        organizationUser: Number(payload.organizationUserId),
        recordDate: payload.recordDate,
        regularHours: payload.regularHours,
        overtimeHours: payload.overtimeHours,
        amount: payload.amount,
        notes: payload.notes,
      },
    },
  })
  return mapOvertimeRecord(response?.data || response)
}

export async function approveOvertimeRecord(id) {
  const response = await request(`/overtime-records/${id}/approve`, { method: 'POST', body: {} })
  return mapOvertimeRecord(response?.data || response)
}

export async function deleteOvertimeRecord(id) {
  await request(`/overtime-records/${id}`, { method: 'DELETE' })
  return true
}

export function exportAttendanceCsv(rows = [], { dateLabel = 'Today' } = {}) {
  const header = ['Employee', 'Employee ID', 'Date', 'In', 'Out', 'Duration', 'Status', 'Location', 'Late']
  const lines = rows.map((row) =>
    [
      row.name,
      row.employeeCode || row.employeeId,
      row.attendanceDate,
      row.clockIn,
      row.clockOut,
      row.duration,
      row.status,
      row.location,
      row.late ? 'Yes' : 'No',
    ]
      .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
      .join(','),
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `attendance-${dateLabel.replace(/\s+/g, '-').toLowerCase()}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
