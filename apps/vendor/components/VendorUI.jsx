'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Modal, Button } from '@webfudge/ui'
import {
  STAGES,
  SUB_STATES,
  ACCESS,
  PAYMENT_STATUS,
  APP_ICONS,
  appColor,
  initials,
} from '../lib/format'

export function Pill({ className = '', children, title }) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  )
}

export const StageBadge = ({ stage }) => {
  const s = STAGES[stage] || STAGES.no_apps
  return <Pill className={s.className}>{s.label}</Pill>
}

export const SubStateBadge = ({ state }) => {
  const s = SUB_STATES[state] || { label: state || '—', className: 'bg-gray-50 text-gray-600 border-gray-200' }
  return <Pill className={s.className}>{s.label}</Pill>
}

export const PaymentBadge = ({ status }) => {
  const s = PAYMENT_STATUS[status] || PAYMENT_STATUS.created
  return <Pill className={s.className}>{s.label}</Pill>
}

export function AccessDot({ access, showLabel = true }) {
  const a = ACCESS[access] || ACCESS.locked
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-gray-600">
      <span className={`h-2 w-2 rounded-full ${a.dot}`} aria-hidden />
      {showLabel ? a.label : <span className="sr-only">{a.label}</span>}
    </span>
  )
}

export function AppIcon({ app, size = 20 }) {
  const src = APP_ICONS[app?.slug]
  if (src) {
    return <Image src={src} alt="" width={size} height={size} className="shrink-0" style={{ width: size, height: size }} />
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-md text-[10px] font-bold text-white"
      style={{ width: size, height: size, background: appColor(app) }}
      aria-hidden
    >
      {(app?.name || '?')[0]}
    </span>
  )
}

export function AppChip({ app, suffix }) {
  if (!app) return <span className="text-sm text-gray-400">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-gray-800">
      <AppIcon app={app} size={18} />
      {app.name}
      {suffix ? <span className="text-gray-400">{suffix}</span> : null}
    </span>
  )
}

/** Small row of app icons with a coloured ring for each app's access. */
export function AppStack({ apps = [] }) {
  if (!apps.length) return <span className="text-xs text-gray-400">No apps</span>
  const ring = { full: 'ring-emerald-300', read_only: 'ring-amber-300', locked: 'ring-gray-200 opacity-50' }
  return (
    <span className="inline-flex items-center gap-1">
      {apps.map((a) => (
        <span
          key={a.subscriptionId || a.slug}
          title={`${a.name}: ${a.planName || a.state}${a.daysLeft != null && a.state === 'trial' ? ` · ${a.daysLeft}d left` : ''}`}
          className={`inline-flex rounded-md bg-white p-0.5 ring-2 ${ring[a.access] || ring.locked}`}
        >
          <AppIcon app={a} size={18} />
        </span>
      ))}
    </span>
  )
}

const AVATAR_TONES = [
  'bg-orange-500',
  'bg-sky-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-cyan-600',
  'bg-indigo-500',
]

export function OrgAvatar({ name, id, size = 'md' }) {
  const n = String(id ?? name ?? '')
    .split('')
    .reduce((s, c) => s + c.charCodeAt(0), 0)
  const dims = size === 'lg' ? 'h-14 w-14 text-lg rounded-2xl' : size === 'sm' ? 'h-7 w-7 text-[10px] rounded-lg' : 'h-9 w-9 text-xs rounded-xl'
  return (
    <span className={`inline-flex shrink-0 items-center justify-center font-bold text-white shadow-sm ${dims} ${AVATAR_TONES[n % AVATAR_TONES.length]}`}>
      {initials(name)}
    </span>
  )
}

export function TitleCell({ title, subtitle, avatar }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {avatar}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
        {subtitle ? <p className="truncate text-xs text-gray-500">{subtitle}</p> : null}
      </div>
    </div>
  )
}

/** Card shell matching the shared DashboardChartPanel look. */
export function Panel({ title, subtitle, icon: Icon, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/60 p-5 shadow-md ${className}`}>
      {(title || action || Icon) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h3 className="text-lg font-semibold text-gray-900">{title}</h3> : null}
            {subtitle ? <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {action}
            {Icon ? (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-orange-200 bg-orange-50">
                <Icon className="h-5 w-5 text-orange-600" aria-hidden />
              </div>
            ) : null}
          </div>
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}

export function EmptyLine({ children }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center text-sm text-gray-500">
      {children}
    </div>
  )
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Could not load this page</p>
        <p className="mt-1 text-sm text-red-700">{error?.message || 'Something went wrong.'}</p>
      </div>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="text-sm font-semibold text-red-700 hover:text-red-900">
          Retry
        </button>
      ) : null}
    </div>
  )
}

export function RefreshButton({ onClick, refreshing }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      title="Refresh data"
      className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-brand-text-light shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      <span className="hidden sm:inline">Refresh</span>
    </button>
  )
}

/** Segmented range picker, e.g. 30 days / 90 days / 12 months. */
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm transition-colors ${
            value === o.value ? 'bg-[#FF7A20] font-semibold text-white shadow-sm' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Confirmation dialog for staff actions. children may render extra inputs. */
export function ConfirmDialog({ isOpen, onClose, title, description, confirmLabel, danger = false, onConfirm, children }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const handle = async () => {
    setBusy(true)
    setError('')
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err?.message || 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title={title} size="md" closeOnBackdrop={!busy}>
      <div className="space-y-5">
        {description ? <p className="text-sm leading-relaxed text-gray-600">{description}</p> : null}
        {children}
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={handle} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** Horizontal bar list used for breakdowns (industry, plan, app…). */
export function BarList({ rows, format = (v) => v, colorFor }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  if (!rows.length) return <EmptyLine>No data in this range.</EmptyLine>
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key ?? r.name}>
          <div className="mb-1 flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-gray-800">{r.name}</span>
            <span className="shrink-0 tabular-nums text-gray-600">{format(r.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: colorFor?.(r) || '#F5630F' }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}
