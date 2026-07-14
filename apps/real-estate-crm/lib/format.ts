import type { LeadTimeline } from './types'

export function formatTimeline(t?: LeadTimeline | string | null): string {
  if (t === 'immediate') return 'Immediate'
  if (t === 'three_to_six_months') return '3–6 months'
  if (t === 'browsing') return 'Browsing'
  return '—'
}

export function formatPurpose(p?: string | null): string {
  if (p === 'own_use') return 'Own use'
  if (p === 'investment') return 'Investment'
  return '—'
}

export function formatSource(s?: string | null): string {
  switch (s) {
    case 'meta_instant_form':
      return 'Meta form'
    case 'meta_whatsapp':
      return 'Meta WhatsApp'
    case 'landing_page':
      return 'Landing page'
    case 'manual':
      return 'Manual'
    default:
      return s || '—'
  }
}

export function formatSeconds(s?: number | null): string {
  if (s == null || Number.isNaN(s)) return '0s'
  if (s >= 60) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${s}s`
}

/** Indian-notation price: 8000000 -> "80L", 12000000 -> "1.2Cr". */
export function formatInr(value?: number | string | null): string {
  if (value == null || value === '') return '—'
  const n = typeof value === 'string' ? parseFloat(value) : value
  if (Number.isNaN(n)) return '—'
  if (n >= 10_000_000) {
    const cr = n / 10_000_000
    return `₹${cr % 1 === 0 ? cr : cr.toFixed(1)}Cr`
  }
  if (n >= 100_000) {
    const l = n / 100_000
    return `₹${l % 1 === 0 ? l : l.toFixed(1)}L`
  }
  return `₹${n.toLocaleString('en-IN')}`
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(iso)
}
