const inr0 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
const inr2 = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 4 })

export function formatINR(value, { decimals = 0, signed = false } = {}) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const v = Number(value)
  const s = (decimals ? inr2 : inr0).format(Math.abs(v))
  if (v < 0) return `−${s}`
  return signed && v > 0 ? `+${s}` : s
}

/** ₹1.25 Cr / ₹4.3 L / ₹12,500 for compact KPI values. */
export function formatINRCompact(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const v = Number(value)
  const a = Math.abs(v)
  const sign = v < 0 ? '−' : ''
  if (a >= 1e7) return `${sign}₹${(a / 1e7).toFixed(2)} Cr`
  if (a >= 1e5) return `${sign}₹${(a / 1e5).toFixed(2)} L`
  return `${sign}${inr0.format(a)}`
}

export function formatPrice(value) {
  return formatINR(value, { decimals: 2 })
}

export function formatUnits(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return num.format(Number(value))
}

export function formatPct(value, { signed = true } = {}) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const v = Number(value) * 100
  const s = `${Math.abs(v).toFixed(2)}%`
  if (v < 0) return `−${s}`
  return signed && v > 0 ? `+${s}` : s
}

export function formatDate(value) {
  if (!value) return '—'
  const d = new Date(String(value).length === 10 ? `${value}T00:00:00` : value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function relativeAge(value) {
  if (!value) return 'never'
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs} h ago`
  return `${Math.round(hrs / 24)} days ago`
}

export const KIND_LABELS = { stock: 'Stock', etf: 'ETF', mutual_fund: 'Mutual fund', other: 'Other' }
export const TYPE_LABELS = { buy: 'Buy', sell: 'Sell', sip: 'SIP instalment', dividend: 'Dividend' }

/** Fixed categorical order (validated palette): colour follows the kind, never its rank. */
export const KIND_COLORS = { stock: '#F5630F', mutual_fund: '#2F6FDE', etf: '#12A38A', other: '#8B5CF6' }
