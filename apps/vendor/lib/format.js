/** Formatting and label helpers shared by every vendor page. */

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('en-IN')

export const formatINR = (value, { precise = false } = {}) =>
  (precise ? inr2 : inr).format(Number(value) || 0)

/** ₹1.2L / ₹3.4Cr style for KPI tiles. */
export function formatINRCompact(value) {
  const n = Number(value) || 0
  const abs = Math.abs(n)
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(abs >= 1e8 ? 0 : 1)}Cr`
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(abs >= 1e6 ? 0 : 1)}L`
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}K`
  return inr.format(n)
}

export const formatNumber = (value) => num.format(Number(value) || 0)

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function formatRelative(value) {
  if (!value) return 'Never'
  const diff = Date.now() - new Date(value).getTime()
  const abs = Math.abs(diff)
  const future = diff < 0
  const units = [
    ['year', 365 * 864e5],
    ['month', 30 * 864e5],
    ['day', 864e5],
    ['hour', 36e5],
    ['minute', 6e4],
  ]
  for (const [unit, ms] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms)
      const label = `${n} ${unit}${n === 1 ? '' : 's'}`
      return future ? `in ${label}` : `${label} ago`
    }
  }
  return 'just now'
}

export const formatPercent = (value) => (value == null ? '—' : `${value}%`)

export const STAGES = {
  paying: { label: 'Paying', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trial: { label: 'Trial', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  free: { label: 'Free', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  at_risk: { label: 'Read-only', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  churned: { label: 'Churned', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700 border-red-200' },
  no_apps: { label: 'No apps', className: 'bg-gray-50 text-gray-500 border-gray-200' },
}

export const SUB_STATES = {
  active: { label: 'Active', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trial: { label: 'Trial', className: 'bg-orange-50 text-orange-700 border-orange-200' },
  trial_ended: { label: 'Trial ended', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  expired: { label: 'Expired', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
  suspended: { label: 'Suspended', className: 'bg-red-50 text-red-700 border-red-200' },
}

export const ACCESS = {
  full: { label: 'Full access', dot: 'bg-emerald-500' },
  read_only: { label: 'Read-only', dot: 'bg-amber-500' },
  locked: { label: 'Locked', dot: 'bg-gray-400' },
}

export const PAYMENT_STATUS = {
  paid: { label: 'Paid', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  failed: { label: 'Failed', className: 'bg-red-50 text-red-700 border-red-200' },
  created: { label: 'Pending', className: 'bg-gray-100 text-gray-600 border-gray-200' },
}

export const PAYMENT_KIND = { new: 'New plan', renewal: 'Renewal', seats: 'Added seats' }

const INDUSTRY = {
  technology: 'Technology',
  finance: 'Finance',
  healthcare: 'Healthcare',
  education: 'Education',
  retail: 'Retail',
  manufacturing: 'Manufacturing',
  services: 'Services',
  other: 'Other',
  unspecified: 'Not set',
}
const SIZE = {
  size_1_10: '1–10',
  size_11_50: '11–50',
  size_51_200: '51–200',
  size_201_500: '201–500',
  size_500_plus: '500+',
  unspecified: 'Not set',
}
export const industryLabel = (v) => INDUSTRY[v] || v || '—'
export const sizeLabel = (v) => (SIZE[v] ? `${SIZE[v]}${v === 'unspecified' ? '' : ' people'}` : v || '—')
export const stageLabel = (v) => STAGES[v]?.label || v || '—'
export const planLabel = (code) =>
  code ? String(code).replace(/(^|_)(\w)/g, (_, sep, c) => `${sep ? ' ' : ''}${c.toUpperCase()}`) : '—'
export const cycleLabel = (v) => (v === 'annual' ? 'Yearly' : v === 'monthly' ? 'Monthly' : v || '—')

export const APP_ICONS = { crm: '/apps/crm.svg', pm: '/apps/projects.svg', books: '/apps/books.svg', hr: '/apps/hr.svg' }
export const APP_COLORS = { crm: '#F5630F', pm: '#1F4FFF', books: '#0E9F6E', hr: '#7A3FF2', other: '#9CA3AF' }
// Brand colours win for known apps; older catalogue rows store names like "teal".
export const appColor = (app) =>
  APP_COLORS[app?.slug] || (/^#[0-9a-f]{3,8}$/i.test(app?.color || '') ? app.color : APP_COLORS.other)

export function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}
