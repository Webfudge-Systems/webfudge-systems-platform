'use client'

import { clsx } from 'clsx'
import { ArrowDownRight, ArrowUpRight, RefreshCw, AlertTriangle } from 'lucide-react'
import { Badge, Button } from '@webfudge/ui'
import { formatINR, formatPct, relativeAge, KIND_LABELS, KIND_COLORS } from '../lib/format'
import { useInvest } from './InvestDataProvider'

export function PageHeader({ title, subtitle, actions, children }) {
  return (
    <div className="border-b border-gray-100 bg-white px-4 sm:px-6 lg:px-8 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-brand-dark">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}

export function PageBody({ children, className }) {
  return <div className={clsx('px-4 sm:px-6 lg:px-8 py-6 space-y-6', className)}>{children}</div>
}

export function Panel({ title, action, children, className, bodyClassName }) {
  return (
    <section className={clsx('rounded-2xl border border-gray-100 bg-white shadow-card', className)}>
      {title ? (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-brand-dark">{title}</h2>
          {action}
        </div>
      ) : null}
      <div className={clsx('p-5', bodyClassName)}>{children}</div>
    </section>
  )
}

/** Gain/loss value: colour plus sign and arrow, so it never relies on colour alone. */
export function Gain({ value, pct, compact = false, className }) {
  if (value == null || !Number.isFinite(Number(value))) return <span className="text-gray-400">—</span>
  const v = Number(value)
  const up = v > 0
  const down = v < 0
  const Icon = up ? ArrowUpRight : down ? ArrowDownRight : null
  const tone = clsx(up && 'text-emerald-700', down && 'text-red-600', !up && !down && 'text-gray-600')
  if (compact) {
    // Table cells: amount on top, % underneath, so wide portfolios still fit.
    return (
      <span className={clsx('inline-flex flex-col items-end tabular-nums font-medium leading-tight', tone, className)}>
        <span className="inline-flex items-center gap-0.5">
          {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
          {formatINR(v, { signed: true })}
        </span>
        {pct != null && Number.isFinite(pct) ? <span className="text-xs opacity-90">{formatPct(pct)}</span> : null}
      </span>
    )
  }
  return (
    <span className={clsx('inline-flex items-center gap-0.5 tabular-nums font-medium', up && 'text-emerald-700', down && 'text-red-600', !up && !down && 'text-gray-600', className)}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {formatINR(v, { signed: true })}
      {pct != null && Number.isFinite(pct) ? <span className={clsx('ml-1', compact ? 'text-xs' : 'text-sm', 'opacity-90')}>({formatPct(pct)})</span> : null}
    </span>
  )
}

export function PctText({ value }) {
  if (value == null || !Number.isFinite(Number(value))) return <span className="text-gray-400">—</span>
  const v = Number(value)
  return <span className={clsx('tabular-nums font-medium', v > 0 && 'text-emerald-700', v < 0 && 'text-red-600')}>{formatPct(v)}</span>
}

export function KindBadge({ kind }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
      <span className="h-2 w-2 rounded-full" style={{ background: KIND_COLORS[kind] || KIND_COLORS.other }} aria-hidden />
      {KIND_LABELS[kind] || kind}
    </span>
  )
}

export function TypeBadge({ type }) {
  const map = { buy: ['success', 'Buy'], sell: ['danger', 'Sell'], sip: ['info', 'SIP'], dividend: ['purple', 'Dividend'] }
  const [variant, label] = map[type] || ['default', type]
  return <Badge variant={variant} size="sm">{label}</Badge>
}

/** "Prices as of …" with the refresh button and any provider errors. */
export function PriceStatus() {
  const { lastPriceAt, refreshing, refreshPrices, priceErrors, providers } = useInvest()
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
      <span title={providers ? `Funds: ${providers.mutualFunds?.join(' → ')} · Stocks: ${providers.stocks}` : undefined}>
        Prices updated {relativeAge(lastPriceAt)}
      </span>
      {priceErrors.length ? (
        <span className="inline-flex items-center gap-1 text-amber-700" title={priceErrors.map((e) => `${e.name}: ${e.error}`).join('\n')}>
          <AlertTriangle className="h-3.5 w-3.5" /> {priceErrors.length} price{priceErrors.length > 1 ? 's' : ''} failed
        </span>
      ) : null}
      <Button variant="outline" size="sm" onClick={() => refreshPrices(true)} disabled={refreshing}>
        <span className="inline-flex items-center gap-1.5">
          <RefreshCw className={clsx('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          {refreshing ? 'Refreshing…' : 'Refresh prices'}
        </span>
      </Button>
    </div>
  )
}

export function Stat({ label, value, sub, title }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white px-5 py-4 shadow-card min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold text-brand-dark tabular-nums truncate" title={title}>{value}</p>
      {sub ? <div className="mt-1 text-sm">{sub}</div> : null}
    </div>
  )
}

export function LoadingBlock({ label = 'Loading portfolio…' }) {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-gray-500">
      <RefreshCw className="mr-2 h-4 w-4 animate-spin text-brand-primary" /> {label}
    </div>
  )
}

export function ErrorBanner({ message }) {
  if (!message) return null
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
      {message}
    </div>
  )
}

/** Plain, accessible data table with right-aligned numeric columns. */
export function DataTable({ columns, rows, rowKey = (r) => r.id, onRowClick, empty, footer }) {
  if (!rows.length) return empty || null
  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-card">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/60 text-xs uppercase tracking-wide text-gray-500">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={clsx('px-3 py-3 font-medium whitespace-nowrap', c.numeric ? 'text-right' : 'text-left')}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx('border-b border-gray-50 last:border-0', onRowClick && 'cursor-pointer hover:bg-orange-50/40')}
            >
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-3 py-3 align-middle', c.numeric ? 'text-right tabular-nums whitespace-nowrap' : 'text-left', c.className)}>
                  {c.render ? c.render(row) : row[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer ? <tfoot>{footer}</tfoot> : null}
      </table>
    </div>
  )
}

export function EmptyBox({ title, description, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-14 text-center">
      <p className="text-base font-semibold text-brand-dark">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function FilterTabs({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            value === o.value ? 'bg-brand-primary text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          {o.label}
          {o.count != null ? <span className={clsx('ml-1.5 text-xs', value === o.value ? 'text-white/80' : 'text-gray-400')}>{o.count}</span> : null}
        </button>
      ))}
    </div>
  )
}
