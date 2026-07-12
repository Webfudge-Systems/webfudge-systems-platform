'use client'

import { mapExpenseClaimFromApi, mapExpenseClaimToApi } from './expenseShared'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338')

function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth-token') || localStorage.getItem('strapi_token')
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

function unwrapRow(response) {
  return response?.data ?? response
}

/** Lists current employee's reimbursable claims (backend scopes by submittedBy). */
export async function listMyExpenseClaims(params = {}) {
  const qs = buildQueryString({
    limit: params.limit || 200,
    page: params.page || 1,
    reimbursable: 'true',
    ...(params.status ? { status: params.status } : {}),
  })
  const response = await request(qs ? `/expenses?${qs}` : '/expenses?reimbursable=true')
  return normalizeRows(response).map(mapExpenseClaimFromApi)
}

export async function createExpenseClaim(form) {
  const response = await request('/expenses', {
    method: 'POST',
    body: { data: mapExpenseClaimToApi(form) },
  })
  return mapExpenseClaimFromApi(unwrapRow(response))
}

export async function updateExpenseClaim(id, form) {
  const response = await request(`/expenses/${id}`, {
    method: 'PUT',
    body: { data: mapExpenseClaimToApi(form) },
  })
  return mapExpenseClaimFromApi(unwrapRow(response))
}

export async function deleteExpenseClaim(id) {
  await request(`/expenses/${id}`, { method: 'DELETE' })
}
