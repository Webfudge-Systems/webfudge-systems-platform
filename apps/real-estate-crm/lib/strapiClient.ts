// Org-scoped Strapi client — same pattern as apps/crm/lib/strapiClient.js.
// Every request carries the JWT plus X-Organization-Id so the backend
// jwt-auth middleware resolves ctx.state.orgId (tenant isolation).

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://api.webfudge.in'
    : 'http://localhost:1338')

type QueryParams = Record<string, unknown>

class StrapiClient {
  baseURL: string
  token: string | null

  constructor() {
    this.baseURL = API_BASE_URL
    this.token = null
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      this.token =
        localStorage.getItem('auth-token') || localStorage.getItem('strapi_token')
    }
    return this.token
  }

  /** Active organization id, set by @webfudge/auth after login. */
  getCurrentOrgId(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('current-org-id')
  }

  async request<T = any>(
    endpoint: string,
    options: Omit<RequestInit, 'body'> & { body?: unknown } = {}
  ): Promise<T> {
    const url = `${this.baseURL}/api${endpoint}`
    const token = this.getToken()
    const orgId = this.getCurrentOrgId()
    const { headers: optionHeaders, body, ...rest } = options

    const config: RequestInit = {
      method: 'GET',
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(orgId && { 'X-Organization-Id': orgId }),
        ...(optionHeaders && typeof optionHeaders === 'object' ? (optionHeaders as Record<string, string>) : {}),
      },
    }

    if (body !== undefined && body !== null) {
      config.body = typeof body === 'string' ? body : JSON.stringify(body)
    }

    const response = await fetch(url, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error(`API Error ${response.status} for ${url}:`, errorData)
      throw new Error(
        errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      return response.json()
    }
    return response as unknown as T
  }

  buildQueryString(params: QueryParams, prefix = ''): string {
    const parts: string[] = []
    for (const key of Object.keys(params)) {
      const value = (params as Record<string, unknown>)[key]
      const paramKey = prefix ? `${prefix}[${key}]` : key
      if (value === null || value === undefined) continue
      if (typeof value === 'object' && !Array.isArray(value)) {
        parts.push(this.buildQueryString(value as QueryParams, paramKey))
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            parts.push(this.buildQueryString(item as QueryParams, `${paramKey}[${index}]`))
          } else {
            parts.push(`${paramKey}[${index}]=${encodeURIComponent(String(item))}`)
          }
        })
      } else {
        parts.push(`${paramKey}=${encodeURIComponent(String(value))}`)
      }
    }
    return parts.filter(Boolean).join('&')
  }

  async get<T = any>(endpoint: string, params: QueryParams = {}): Promise<T> {
    const queryString = this.buildQueryString(params)
    const url = queryString ? `${endpoint}?${queryString}` : endpoint
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T = any>(endpoint: string, data: unknown = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: data })
  }

  async put<T = any>(endpoint: string, data: unknown = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body: data })
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

const strapiClient = new StrapiClient()

export default strapiClient
