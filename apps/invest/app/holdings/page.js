'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Briefcase, Wallet, PiggyBank, TrendingUp } from 'lucide-react'
import { KPICard, useTableSort } from '@webfudge/ui'
import { useInvest } from '../../components/InvestDataProvider'
import InvestPageHeader from '../../components/InvestPageHeader'
import TransactionModal from '../../components/TransactionModal'
import { Page, Gain, PctText, KindBadge, PriceStatus, ErrorBanner, ListView, FilterModal, RowActions, num, changeLabel, downloadCsv, KPI_GRID } from '../../components/ui'
import { formatINR, formatINRCompact, formatPrice, formatUnits, formatPct, relativeAge, KIND_LABELS } from '../../lib/format'

const TABS = [
  { key: 'all', label: 'All open' },
  { key: 'stock', label: 'Stocks & ETFs' },
  { key: 'mutual_fund', label: 'Mutual funds' },
  { key: 'other', label: 'Other' },
  { key: 'closed', label: 'Closed' },
]

const SORT_OPEN = [
  { key: 'name', label: 'Holding' },
  { key: 'units', label: 'Units' },
  { key: 'avgCost', label: 'Avg cost' },
  { key: 'price', label: 'Current price' },
  { key: 'invested', label: 'Invested' },
  { key: 'currentValue', label: 'Current value' },
  { key: 'unrealised', label: 'P&L' },
  { key: 'dayChangePct', label: 'Today' },
  { key: 'xirr', label: 'XIRR' },
]
const SORT_CLOSED = [
  { key: 'name', label: 'Holding' },
  { key: 'totalBought', label: 'Total bought' },
  { key: 'totalSoldProceeds', label: 'Sale proceeds' },
  { key: 'realised', label: 'Realised P&L' },
  { key: 'dividends', label: 'Dividends' },
  { key: 'xirr', label: 'XIRR' },
]

function inTab(h, tab) {
  if (tab === 'closed') return !h.isOpen
  if (!h.isOpen) return false
  if (tab === 'all') return true
  if (tab === 'stock') return h.instrument.kind === 'stock' || h.instrument.kind === 'etf'
  return h.instrument.kind === tab
}

function matchesFilters(h, f) {
  if (f.kind && h.instrument.kind !== f.kind) return false
  if (f.result === 'gain' && !(h.hasPrice && h.unrealised > 0)) return false
  if (f.result === 'loss' && !(h.hasPrice && h.unrealised < 0)) return false
  if (f.result === 'unpriced' && h.hasPrice) return false
  if (f.exchange && h.instrument.exchange !== f.exchange) return false
  return true
}

export default function HoldingsPage() {
  const router = useRouter()
  const { loading, error, portfolio } = useInvest()
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [txModal, setTxModal] = useState({ open: false, defaults: {} })
  const sort = useTableSort({ storageKey: 'invest-holdings-sort', defaultRules: [{ key: 'currentValue', direction: 'desc' }] })

  const isClosed = tab === 'closed'
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const list = portfolio.holdings
      .filter((h) => inTab(h, tab) && matchesFilters(h, filters))
      .filter((h) => !term || `${h.instrument.name} ${h.instrument.symbol || ''} ${h.instrument.schemeCode || ''}`.toLowerCase().includes(term))
    return sort.sortData(list, (h, key) => (key === 'name' ? h.instrument.name.toLowerCase() : h[key]))
  }, [portfolio.holdings, tab, filters, q, sort])

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, portfolio.holdings.filter((h) => inTab(h, t.key)).length])), [portfolio.holdings])
  const sum = (k) => rows.reduce((s, h) => s + (h[k] || 0), 0)
  const invested = sum('invested')
  const value = sum('currentValue')
  const unrealised = sum('unrealised')

  const nameCol = { key: 'name', label: 'Holding', render: (_, h) => <Name h={h} /> }
  const actionsCol = {
    key: 'actions',
    label: 'Actions',
    headerClassName: 'text-right',
    className: 'text-right',
    render: (_, h) => <RowActions onView={() => router.push(`/holdings/${h.id}`)} onEdit={() => setTxModal({ open: true, defaults: { instrumentId: h.id } })} />,
  }
  const columns = isClosed
    ? [
        nameCol,
        num({ key: 'totalBought', label: 'Total bought', render: (v) => formatINR(v) }),
        num({ key: 'totalSoldProceeds', label: 'Sale proceeds', render: (v) => formatINR(v) }),
        num({ key: 'realised', label: 'Realised P&L', render: (v) => <Gain value={v} /> }),
        num({ key: 'dividends', label: 'Dividends', render: (v) => formatINR(v) }),
        num({ key: 'xirr', label: 'XIRR', render: (v) => <PctText value={v} /> }),
        actionsCol,
      ]
    : [
        nameCol,
        num({ key: 'units', label: 'Units', render: (v) => formatUnits(v) }),
        num({ key: 'avgCost', label: 'Avg cost', render: (v) => formatPrice(v) }),
        num({ key: 'price', label: 'Current price', render: (_, h) => <PriceCell h={h} /> }),
        num({ key: 'invested', label: 'Invested', render: (v) => formatINR(v) }),
        num({ key: 'currentValue', label: 'Current value', render: (v) => formatINR(v) }),
        num({ key: 'unrealised', label: 'P&L', render: (_, h) => <Gain value={h.hasPrice ? h.unrealised : null} pct={h.unrealisedPct} compact /> }),
        num({ key: 'dayChangePct', label: 'Today', render: (v) => <PctText value={v} /> }),
        num({ key: 'xirr', label: 'XIRR', render: (v) => <PctText value={v} /> }),
        actionsCol,
      ]

  function exportCsv() {
    downloadCsv(
      `webfudge-holdings-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Holding', 'Type', 'Symbol/Scheme', 'Units', 'Avg cost', 'Price', 'Invested', 'Current value', 'Unrealised P&L', 'Realised P&L', 'Dividends', 'XIRR %'],
      rows.map((h) => [h.instrument.name, KIND_LABELS[h.instrument.kind], h.instrument.symbol || h.instrument.schemeCode, h.units, h.avgCost.toFixed(4), h.price, h.invested.toFixed(2), h.currentValue.toFixed(2), h.unrealised.toFixed(2), h.realised.toFixed(2), h.dividends.toFixed(2), h.xirr == null ? '' : (h.xirr * 100).toFixed(2)])
    )
  }

  return (
    <Page>
      <InvestPageHeader
        title="Holdings"
        subtitle="Units held, cost and current value per stock and fund (FIFO cost basis)"
        breadcrumb={[
          { label: 'Portfolio', href: '/' },
          { label: 'Holdings', href: '/holdings' },
        ]}
        showActions
        onExportClick={exportCsv}
      />

      <div className={KPI_GRID}>
        <KPICard title="Current Value" value={formatINRCompact(value)} valueTitle={formatINR(value)} subtitle={`${rows.length} shown`} icon={Wallet} colorScheme="orange" />
        <KPICard title="Invested" value={formatINRCompact(invested)} valueTitle={formatINR(invested)} subtitle="Cost of units held" icon={PiggyBank} colorScheme="orange" />
        <KPICard title="Unrealised P&L" value={formatINR(unrealised, { signed: true })} subtitle={`${changeLabel(invested ? unrealised / invested : null, 'on cost')} · XIRR ${portfolio.totals.xirr == null ? '—' : formatPct(portfolio.totals.xirr)}`} icon={TrendingUp} colorScheme="orange" />
      </div>

      <PriceStatus />
      <ErrorBanner message={error} />

      <ListView
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, badge: String(counts[t.key] || 0) }))}
        activeTab={tab}
        onTabChange={setTab}
        searchQuery={q}
        onSearchChange={setQ}
        searchPlaceholder="Search holdings..."
        onAddClick={() => setTxModal({ open: true, defaults: {} })}
        addTitle="Add transaction"
        onFilterClick={() => setFilterOpen(true)}
        sort={sort}
        sortColumnOptions={isClosed ? SORT_CLOSED : SORT_OPEN}
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(h) => router.push(`/holdings/${h.id}`)}
        empty={{
          icon: Briefcase,
          title: isClosed ? 'No closed positions' : 'No holdings found',
          description: isClosed ? 'Fully sold investments appear here with their realised P&L.' : q || Object.keys(filters).length ? 'Try adjusting your filters' : 'Add a transaction to start tracking',
        }}
      />

      <FilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter Holdings"
        description="Refine the holdings list"
        value={filters}
        onApply={setFilters}
        fields={[
          { key: 'kind', label: 'Type', options: Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label })) },
          { key: 'result', label: 'Performance', options: [{ value: 'gain', label: 'In profit' }, { value: 'loss', label: 'In loss' }, { value: 'unpriced', label: 'No price yet' }] },
          { key: 'exchange', label: 'Exchange', options: [{ value: 'NSE', label: 'NSE' }, { value: 'BSE', label: 'BSE' }, { value: 'AMFI', label: 'AMFI (mutual funds)' }, { value: 'OTHER', label: 'Other' }] },
        ]}
      />
      <TransactionModal isOpen={txModal.open} defaults={txModal.defaults} onClose={() => setTxModal({ open: false, defaults: {} })} />
    </Page>
  )
}

function Name({ h }) {
  const i = h.instrument
  return (
    <div className="min-w-0 max-w-[16rem]">
      <p className="truncate font-medium text-gray-900">{i.name}</p>
      <div className="flex items-center gap-2">
        <KindBadge kind={i.kind} />
        <span className="text-xs text-gray-400">{i.symbol ? `${i.exchange} · ${i.symbol}` : i.schemeCode ? `AMFI ${i.schemeCode}` : ''}</span>
        {h.oversold > 0 ? (
          <span className="inline-flex items-center gap-0.5 text-xs text-amber-700" title="More units sold than bought. Check the transactions.">
            <AlertTriangle className="h-3 w-3" /> oversold
          </span>
        ) : null}
      </div>
    </div>
  )
}

function PriceCell({ h }) {
  const i = h.instrument
  if (!h.hasPrice) return <span className="text-amber-700" title={i.priceError || 'No price yet'}>no price</span>
  return (
    <span title={`${i.priceSource || ''} · ${relativeAge(i.lastPriceAt)}${i.priceError ? ` · last refresh failed: ${i.priceError}` : ''}`}>
      {formatPrice(h.price)}
      {i.priceError ? <AlertTriangle className="ml-1 inline h-3 w-3 text-amber-600" aria-label="Last refresh failed" /> : null}
    </span>
  )
}
