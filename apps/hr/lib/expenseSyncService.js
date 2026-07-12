'use client'

import {
  mapExpenseClaimFromApi,
  mapExpenseClaimToApi,
  mapPayoutFromClaim,
  mapUiPaymentToApi,
} from './expensesShared'

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

export async function listExpenseClaims(params = {}) {
  const qs = buildQueryString({
    limit: params.limit || 200,
    page: params.page || 1,
    reimbursable: 'true',
    ...(params.status ? { status: params.status } : {}),
    ...(params.category ? { category: params.category } : {}),
  })
  const response = await request(qs ? `/expenses?${qs}` : '/expenses?reimbursable=true')
  return normalizeRows(response).map(mapExpenseClaimFromApi)
}

export async function createExpenseClaim(form, { submittedById } = {}) {
  const response = await request('/expenses', {
    method: 'POST',
    body: { data: mapExpenseClaimToApi(form, { submittedById }) },
  })
  return mapExpenseClaimFromApi(unwrapRow(response))
}

export async function updateExpenseClaim(id, form, { submittedById } = {}) {
  const response = await request(`/expenses/${id}`, {
    method: 'PUT',
    body: { data: mapExpenseClaimToApi(form, { submittedById }) },
  })
  return mapExpenseClaimFromApi(unwrapRow(response))
}

export async function deleteExpenseClaim(id) {
  await request(`/expenses/${id}`, { method: 'DELETE' })
}

export async function approveExpenseClaim(id) {
  const response = await request(`/expenses/${id}/approve`, { method: 'POST', body: {} })
  return mapExpenseClaimFromApi(unwrapRow(response))
}

export async function rejectExpenseClaim(id, reason = '') {
  const response = await request(`/expenses/${id}/reject`, {
    method: 'POST',
    body: { data: reason ? { reason } : {} },
  })
  return mapExpenseClaimFromApi(unwrapRow(response))
}

export async function reimburseExpenseClaim(id, payload = {}) {
  const response = await request(`/expenses/${id}/reimburse`, {
    method: 'POST',
    body: {
      data: {
        paymentMode: mapUiPaymentToApi(payload.method || 'Bank Transfer'),
        paymentDate: payload.scheduled || new Date().toISOString().slice(0, 10),
        referenceNumber: payload.reference || undefined,
      },
    },
  })
  const row = unwrapRow(response)
  const expense = row?.expense || row
  return mapExpenseClaimFromApi(expense)
}

export function buildPayoutRowsFromClaims(claims = []) {
  return claims
    .filter((claim) => claim.status === 'Approved' || claim.status === 'Paid')
    .map(mapPayoutFromClaim)
}

export async function listExpensePayouts() {
  const claims = await listExpenseClaims()
  return buildPayoutRowsFromClaims(claims)
}
