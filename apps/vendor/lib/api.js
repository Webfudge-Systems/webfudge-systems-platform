import { authService } from '@webfudge/auth'

const API_BASE = (
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudgesystems.in' : 'http://localhost:1338')
).replace(/\/$/, '')

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

async function request(path, { method = 'GET', body } = {}) {
  const token = authService.getToken()
  const res = await fetch(`${API_BASE}/api/vendor${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })
  let data = null
  try {
    data = await res.json()
  } catch {
    data = null
  }
  if (!res.ok) {
    throw new ApiError(data?.error?.message || `Request failed (${res.status})`, res.status)
  }
  return data
}

const qs = (params = {}) => {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '' && v !== false)
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : ''
}

export const vendorApi = {
  me: () => request('/me'),
  overview: (opts) => request(`/overview${qs(opts)}`),
  reports: (range, opts = {}) => request(`/reports${qs({ range, ...opts })}`),
  organizations: (opts) => request(`/organizations${qs(opts)}`),
  organization: (id, opts) => request(`/organizations/${id}${qs(opts)}`),
  subscriptions: (opts) => request(`/subscriptions${qs(opts)}`),
  payments: (opts) => request(`/payments${qs(opts)}`),
  users: (opts) => request(`/users${qs(opts)}`),
  apps: (opts) => request(`/apps${qs(opts)}`),
  extendTrial: (subscriptionId, days) =>
    request(`/subscriptions/${subscriptionId}/extend-trial`, { method: 'POST', body: { days } }),
  suspend: (orgId, reason) => request(`/organizations/${orgId}/suspend`, { method: 'POST', body: { reason } }),
  reactivate: (orgId) => request(`/organizations/${orgId}/reactivate`, { method: 'POST' }),
}

export default vendorApi
