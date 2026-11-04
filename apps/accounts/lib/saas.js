'use client'

import { authService } from '@webfudge/auth'
import { getAppUrl } from '@webfudge/utils'

/** NEXT_PUBLIC_PLATFORM_MODE=saas switches Accounts to the self-serve sign-up, Home hub and billing. */
export const IS_SAAS = (process.env.NEXT_PUBLIC_PLATFORM_MODE || '').toLowerCase() === 'saas'

export const API_BASE = (
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? 'https://api.webfudge.in' : 'http://localhost:1338')
).replace(/\/$/, '')

export const WEBSITE_URL = getAppUrl('landing')
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'contact@webfudge.in'

/** App catalogue as shown in Accounts. `href` opens the app for the current organization. */
export const APP_META = {
  crm: { name: 'CRM', icon: '/apps/crm.svg', tint: '#FFF1E8', accent: '#F5630F', url: () => getAppUrl('crm') },
  pm: { name: 'Projects', icon: '/apps/projects.svg', tint: '#EEF1FF', accent: '#1F4FFF', url: () => getAppUrl('pm') },
  books: { name: 'Books', icon: '/apps/books.svg', tint: '#E9F8F1', accent: '#0E9F6E', url: null },
  hr: { name: 'HR', icon: '/apps/hr.svg', tint: '#F3EEFF', accent: '#7A3FF2', url: null },
}

export function appName(slug, fallback) {
  return APP_META[slug]?.name || fallback || slug
}

export function openAppUrl(slug, orgId) {
  const base = APP_META[slug]?.url?.()
  if (!base) return null
  return orgId ? `${base}/?org=${orgId}` : base
}

export class ApiError extends Error {
  constructor(message, { status, details } = {}) {
    super(message)
    this.status = status
    this.details = details || {}
    this.code = this.details.code
    this.field = this.details.field
  }
}

/**
 * Calls the Webfudge API with the signed-in user's token and (optionally) organization.
 * Throws ApiError with the server's message and details.
 */
export async function api(path, { method = 'GET', body, orgId, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' }
  if (auth) {
    const token = authService.getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  if (orgId) headers['X-Organization-Id'] = String(orgId)
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined })
  } catch {
    throw new ApiError("We can't reach Webfudge right now. Check your connection and try again.", { status: 0 })
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = data?.error?.message || data?.message || 'Something went wrong. Please try again.'
    throw new ApiError(message, { status: res.status, details: data?.error?.details })
  }
  return data
}

/** Only follow `next` to our own pages or Webfudge apps, never to other sites. */
export function safeNext(next, fallback = '/home') {
  if (!next) return fallback
  if (next.startsWith('/') && !next.startsWith('//')) return next
  try {
    const url = new URL(next)
    const allowed = ['crm', 'pm', 'landing', 'accounts'].map((s) => new URL(getAppUrl(s)).host)
    if (allowed.includes(url.host)) return url.toString()
  } catch {
    /* not a URL */
  }
  return fallback
}

/** Navigates to a `next` value that may be another Webfudge app. */
export function goTo(router, target) {
  if (/^https?:\/\//.test(target)) window.location.assign(target)
  else router.replace(target)
}

export const INDUSTRIES = [
  ['technology', 'Technology'],
  ['services', 'Professional services'],
  ['manufacturing', 'Manufacturing'],
  ['retail', 'Retail and distribution'],
  ['finance', 'Finance'],
  ['healthcare', 'Healthcare'],
  ['education', 'Education'],
  ['other', 'Something else'],
]

export const TEAM_SIZES = [
  ['size_1_10', '1–10'],
  ['size_11_50', '11–50'],
  ['size_51_200', '51–200'],
  ['size_201_500', '201–500'],
  ['size_500_plus', '500+'],
]

export const formatINR = (n, { decimals = 0 } = {}) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`

export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''

export const SIGNUP_STEPS = ['Account', 'Verify', 'Organization', 'Apps', 'Team']

/** Where to go after signing in: organization setup first, then `next`, then the Home hub. */
export function postSignInTarget(organizations, next) {
  if (IS_SAAS && (!organizations || organizations.length === 0)) return '/setup/organization'
  return safeNext(next, IS_SAAS ? '/home' : '/')
}
