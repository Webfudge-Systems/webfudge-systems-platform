'use client'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338')

class StrapiClient {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  getToken() {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth-token') || localStorage.getItem('strapi_token')
  }

  getCurrentOrgId() {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('current-org-id')
  }

  buildQueryString(params = {}, prefix = '') {
    const parts = []
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return
      const paramKey = prefix ? `${prefix}[${key}]` : key
      if (typeof value === 'object' && !Array.isArray(value)) {
        parts.push(this.buildQueryString(value, paramKey))
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          parts.push(`${paramKey}[${index}]=${encodeURIComponent(item)}`)
        })
      } else {
        parts.push(`${paramKey}=${encodeURIComponent(value)}`)
      }
    })
    return parts.filter(Boolean).join('&')
  }

  async request(endpoint, options = {}) {
    const token = this.getToken()
    const orgId = this.getCurrentOrgId()
    const { body, headers, ...rest } = options
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData

    const response = await fetch(`${this.baseURL}/api${endpoint}`, {
      method: 'GET',
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(orgId ? { 'X-Organization-Id': orgId } : {}),
        ...(headers || {}),
      },
      ...(body !== undefined
        ? {
            body: isFormData || typeof body === 'string' ? body : JSON.stringify(body),
          }
        : {}),
    })

    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      const err = data?.error || data
      throw new Error(err?.message || (typeof err === 'string' ? err : `HTTP ${response.status}`))
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) return response.json()
    return response
  }

  get(endpoint, params = {}) {
    const qs = this.buildQueryString(params)
    return this.request(qs ? `${endpoint}?${qs}` : endpoint)
  }

  post(endpoint, data = {}) {
    return this.request(endpoint, { method: 'POST', body: data })
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' })
  }
}

const strapiClient = new StrapiClient()

export default strapiClient
