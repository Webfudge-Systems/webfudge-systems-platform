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

async function request(endpoint) {
  const token = getToken()
  const orgId = getOrgId()

  const response = await fetch(`${API_BASE_URL}/api${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
    },
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

export function mapCompanyHoliday(row) {
  return {
    id: row.id,
    name: row.name || 'Holiday',
    date: row.date || '',
  }
}

export async function listCompanyHolidays(params = {}) {
  const qs = buildQueryString({
    limit: params.limit || 50,
    page: params.page || 1,
    ...(params.from ? { from: params.from } : {}),
    ...(params.to ? { to: params.to } : {}),
  })
  try {
    const response = await request(qs ? `/company-holidays?${qs}` : '/company-holidays')
    return normalizeRows(response).map(mapCompanyHoliday)
  } catch {
    return []
  }
}

export function getUpcomingHolidays(holidays = [], limit = 3, referenceDate = new Date()) {
  const today = referenceDate.toISOString().slice(0, 10)
  return holidays
    .filter((row) => row.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, limit)
}
