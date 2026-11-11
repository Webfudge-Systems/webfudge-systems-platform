'use client'

import { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { ArrowDownRight, ArrowUpRight, RefreshCw, AlertTriangle, Trash2, Eye, Pencil } from 'lucide-react'
import {
  Badge,
  Button,
  Modal,
  Table,
  TabsWithActions,
  TableSortDropdown,
  TableResultsCount,
  TableEmptyBelow,
  Pagination,
  LoadingSpinner,
} from '@webfudge/ui'
import { formatINR, formatPct, relativeAge, KIND_LABELS, KIND_COLORS } from '../lib/format'
import { useInvest } from './InvestDataProvider'

/** KPI grid: ₹ values need more room than CRM's counts, so three columns on desktop. */
export const KPI_GRID = 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'

/** Page wrapper — same spacing as CRM / PM list pages. */
export function Page({ children }) {
  return <div className="p-4 md:p-6 space-y-6 bg-white min-h-full">{children}</div>
}

/** Card shell matching DashboardChartPanel (CRM / PM dashboards). */
export function Panel({ title, subtitle, icon: Icon, action, children, className, bodyClassName }) {
  return (
    <section className={clsx('rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50/60 p-5 shadow-md', className)}>
      {title ? (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
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
      ) : null}
      <div className={clsx('rounded-xl border border-gray-100 bg-white p-3', bodyClassName)}>{children}</div>
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
    <span className={clsx('inline-flex items-center gap-0.5 tabular-nums font-medium', tone, className)}>
      {Icon ? <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden /> : null}
      {formatINR(v, { signed: true })}
      {pct != null && Number.isFinite(pct) ? <span className="ml-1 text-sm opacity-90">({formatPct(pct)})</span> : null}
    </span>
  )
}

export function PctText({ value }) {
  if (value == null || !Number.isFinite(Number(value))) return <span className="text-gray-400">—</span>
  const v = Number(value)
  return <span className={clsx('tabular-nums font-medium', v > 0 && 'text-emerald-700', v < 0 && 'text-red-600')}>{formatPct(v)}</span>
}

/** Plain-text change for KPI subtitles ("▲ +0.44%"); the arrow carries direction without colour. */
export function changeLabel(pct, suffix = '') {
  if (pct == null || !Number.isFinite(pct)) return suffix ? `— ${suffix}` : '—'
  const arrow = pct > 0 ? '▲' : pct < 0 ? '▼' : '•'
  return `${arrow} ${formatPct(pct)}${suffix ? ` ${suffix}` : ''}`
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

/** "Prices updated … · Refresh" strip shown under the header on price-driven pages. */
export function PriceStatus() {
  const { lastPriceAt, refreshing, refreshPrices, priceErrors, providers } = useInvest()
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <span title={providers ? `Funds: ${providers.mutualFunds?.join(' → ')} · Stocks: ${providers.stocks}` : undefined}>
          Prices updated <span className="font-medium text-gray-900">{relativeAge(lastPriceAt)}</span>
          {providers ? <span className="text-gray-500"> · {providers.stocks} · AMFI NAV</span> : null}
        </span>
        {priceErrors.length ? (
          <span className="inline-flex items-center gap-1 text-amber-700" title={priceErrors.map((e) => `${e.name}: ${e.error}`).join('\n')}>
            <AlertTriangle className="h-4 w-4" /> {priceErrors.length} price{priceErrors.length > 1 ? 's' : ''} failed
          </span>
        ) : null}
      </div>
      <Button variant="outline" size="sm" onClick={() => refreshPrices(true)} disabled={refreshing}>
        <RefreshCw className={clsx('mr-1.5 inline h-4 w-4', refreshing && 'animate-spin')} />
        {refreshing ? 'Refreshing…' : 'Refresh prices'}
      </Button>
    </div>
  )
}

export function LoadingBlock({ message = 'Loading portfolio...' }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" message={message} />
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

const ACTION = 'inline-flex rounded-md p-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300'

/** View / edit / delete icons — same look as TableCellCrmRowActions, plus delete. */
export function RowActions({ onView, onEdit, onDelete, extra }) {
  return (
    <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
      {extra}
      {onView ? (
        <button type="button" className={`${ACTION} text-orange-600 hover:bg-orange-50`} title="View" aria-label="View" onClick={onView}>
          <Eye className="h-4 w-4" />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className={`${ACTION} text-emerald-600 hover:bg-emerald-50`} title="Edit" aria-label="Edit" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className={`${ACTION} text-red-600 hover:bg-red-50`} title="Delete" aria-label="Delete" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

/** Right-aligned numeric column helper for the shared Table. */
export function num(col) {
  return { headerClassName: 'text-right', className: 'text-right tabular-nums whitespace-nowrap', ...col }
}

/**
 * CRM-style list block: TabsWithActions toolbar (tabs, search, add, filter, sort) +
 * sort dropdown + results count + modern table + empty state + pagination.
 */
export function ListView({
  tabs,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  onAddClick,
  addTitle,
  onFilterClick,
  sort,
  sortColumnOptions,
  columns,
  rows,
  onRowClick,
  loading,
  empty,
  footer,
  pageSize = 25,
}) {
  const [sortOpen, setSortOpen] = useState(false)
  const [page, setPage] = useState(1)
  const ref = useRef(null)

  useEffect(() => setPage(1), [activeTab, searchQuery, rows.length])
  useEffect(() => {
    if (!sortOpen) return undefined
    const close = (e) => ref.current && !ref.current.contains(e.target) && setSortOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [sortOpen])

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <>
      <div className="relative" ref={ref}>
        <TabsWithActions
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          showSearch={Boolean(onSearchChange)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          showAdd={Boolean(onAddClick)}
          onAddClick={onAddClick}
          addTitle={addTitle}
          showFilter={Boolean(onFilterClick)}
          onFilterClick={onFilterClick}
          showSort={Boolean(sort)}
          onSortClick={() => setSortOpen((o) => !o)}
          hasActiveSort={sort?.hasActiveSort}
          sortTitle="Sort columns"
        />
        {sort ? (
          <TableSortDropdown
            open={sortOpen}
            sortRules={sort.sortRules}
            columnOptions={sortColumnOptions}
            onAddRule={sort.addSortRule}
            onRemoveRule={sort.removeSortRule}
            onSetDirection={sort.setRuleDirection}
            onMoveRule={sort.moveSortRule}
            onClear={sort.clearSort}
          />
        ) : null}
      </div>

      <TableResultsCount count={rows.length} />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <LoadingBlock />
        ) : (
          <>
            <Table
              columns={sort ? sort.bindSortableColumns(columns, sortColumnOptions.map((c) => c.key)) : columns}
              data={pageRows}
              keyField="id"
              variant="modernEmbedded"
              onRowClick={onRowClick}
            />
            {pageRows.length === 0 && empty ? <TableEmptyBelow {...empty} /> : null}
            {footer && pageRows.length ? footer : null}
            {totalPages > 1 ? (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                <Pagination currentPage={page} totalPages={totalPages} totalItems={rows.length} itemsPerPage={pageSize} onPageChange={setPage} />
              </div>
            ) : null}
          </>
        )}
      </div>
    </>
  )
}

/** Delete confirmation — same layout as the CRM delete modals. */
export function ConfirmDeleteModal({ isOpen, title, message, confirmLabel = 'Delete', onConfirm, onClose }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (isOpen) setError(null)
  }, [isOpen])
  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title={title} size="md" closeOnBackdrop={!busy}>
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <p className="text-sm text-red-900">
            <span className="font-semibold">This action cannot be undone</span>
          </p>
        </div>
        <p className="text-sm text-gray-700">{message}</p>
        <ErrorBanner message={error} />
        <div className="mt-1 flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="muted" disabled={busy} onClick={onClose} className="w-full rounded-xl border-[1.5px] border-gray-400 bg-gray-300 px-5 py-2.5 sm:w-auto">
            Cancel
          </Button>
          <Button type="button" variant="danger" disabled={busy} onClick={confirm} className="w-full min-w-[9rem] rounded-xl py-2.5 sm:w-auto">
            {busy ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

const SELECT_CLASS =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20'

/** Filter modal — same layout as the CRM "Filter …" modals (draft → Apply / Clear). */
export function FilterModal({ isOpen, onClose, title, description, fields, value, onApply }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => {
    if (isOpen) setDraft(value)
  }, [isOpen, value])
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
      <div className="space-y-5">
        {description ? <p className="text-sm text-gray-600">{description}</p> : null}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((f) => (
            <label key={f.key} className="space-y-1.5">
              <span className="text-sm font-medium text-gray-700">{f.label}</span>
              {f.type === 'date' ? (
                <input type="date" className={SELECT_CLASS} value={draft[f.key] || ''} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))} />
              ) : (
                <select className={SELECT_CLASS} value={draft[f.key] || ''} onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}>
                  <option value="">{f.placeholder || 'Any'}</option>
                  {f.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button
            type="button"
            variant="muted"
            onClick={() => {
              onApply({})
              onClose()
            }}
            className="w-full rounded-xl border-[1.5px] border-gray-400 bg-gray-300 px-5 py-2.5 sm:w-auto"
          >
            Clear filters
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              onApply(Object.fromEntries(Object.entries(draft).filter(([, v]) => v)))
              onClose()
            }}
            className="w-full min-w-[9rem] rounded-xl py-2.5 sm:w-auto"
          >
            Apply filters
          </Button>
        </div>
      </div>
    </Modal>
  )
}

/** Download rows as CSV (used by the toolbar Export button). */
export function downloadCsv(filename, header, rows) {
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const text = [header.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
