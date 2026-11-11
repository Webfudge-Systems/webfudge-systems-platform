'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, AlertTriangle } from 'lucide-react'
import { Button } from '@webfudge/ui'
import { useInvest } from '../../components/InvestDataProvider'
import { PageHeader, PageBody, Gain, PctText, KindBadge, PriceStatus, LoadingBlock, ErrorBanner, DataTable, EmptyBox, FilterTabs } from '../../components/ui'
import TransactionModal from '../../components/TransactionModal'
import { formatINR, formatPrice, formatUnits, relativeAge } from '../../lib/format'

const FILTERS = [
  { value: 'all', label: 'All open' },
  { value: 'stock', label: 'Stocks & ETFs' },
  { value: 'mutual_fund', label: 'Mutual funds' },
  { value: 'other', label: 'Other' },
  { value: 'closed', label: 'Closed' },
]

function matches(h, filter) {
  if (filter === 'closed') return !h.isOpen
  if (!h.isOpen) return false
  if (filter === 'all') return true
  if (filter === 'stock') return h.instrument.kind === 'stock' || h.instrument.kind === 'etf'
  return h.instrument.kind === filter
}

export default function HoldingsPage() {
  const router = useRouter()
  const { loading, error, portfolio } = useInvest()
  const [filter, setFilter] = useState('all')
  const [addOpen, setAddOpen] = useState(false)

  const rows = useMemo(
    () => portfolio.holdings.filter((h) => matches(h, filter)).sort((a, b) => b.currentValue - a.currentValue || b.realised - a.realised),
    [portfolio.holdings, filter]
  )
  const counts = useMemo(() => Object.fromEntries(FILTERS.map((f) => [f.value, portfolio.holdings.filter((h) => matches(h, f.value)).length])), [portfolio.holdings])
  const sum = (k) => rows.reduce((s, h) => s + (h[k] || 0), 0)

  const isClosed = filter === 'closed'
  const columns = isClosed
    ? [
        { key: 'name', label: 'Holding', render: (h) => <Name h={h} /> },
        { key: 'bought', label: 'Total bought', numeric: true, render: (h) => formatINR(h.totalBought) },
        { key: 'sold', label: 'Sale proceeds', numeric: true, render: (h) => formatINR(h.totalSoldProceeds) },
        { key: 'realised', label: 'Realised P&L', numeric: true, render: (h) => <Gain value={h.realised} /> },
        { key: 'div', label: 'Dividends', numeric: true, render: (h) => formatINR(h.dividends) },
        { key: 'xirr', label: 'XIRR', numeric: true, render: (h) => <PctText value={h.xirr} /> },
      ]
    : [
        { key: 'name', label: 'Holding', render: (h) => <Name h={h} /> },
        { key: 'units', label: 'Units', numeric: true, render: (h) => formatUnits(h.units) },
        { key: 'avg', label: 'Avg cost', numeric: true, render: (h) => formatPrice(h.avgCost) },
        { key: 'price', label: 'Current price', numeric: true, render: (h) => <PriceCell h={h} /> },
        { key: 'invested', label: 'Invested', numeric: true, render: (h) => formatINR(h.invested) },
        { key: 'value', label: 'Current value', numeric: true, render: (h) => formatINR(h.currentValue) },
        { key: 'pnl', label: 'P&L', numeric: true, render: (h) => <Gain value={h.hasPrice ? h.unrealised : null} pct={h.unrealisedPct} compact /> },
        { key: 'day', label: 'Today', numeric: true, render: (h) => <PctText value={h.dayChangePct} /> },
        { key: 'xirr', label: 'XIRR', numeric: true, render: (h) => <PctText value={h.xirr} /> },
      ]

  const footer =
    rows.length > 1 && !isClosed ? (
      <tr className="border-t border-gray-100 bg-gray-50/60 font-medium">
        <td className="px-4 py-3 text-gray-700" colSpan={4}>Total ({rows.length})</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatINR(sum('invested'))}</td>
        <td className="px-4 py-3 text-right tabular-nums">{formatINR(sum('currentValue'))}</td>
        <td className="px-4 py-3 text-right"><Gain value={sum('unrealised')} /></td>
        <td colSpan={2} />
      </tr>
    ) : null

  return (
    <>
      <PageHeader
        title="Holdings"
        subtitle="Units held, cost and current value per stock and fund (FIFO cost basis)."
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add transaction</span>
          </Button>
        }
      >
        <div className="mt-3"><PriceStatus /></div>
      </PageHeader>
      <PageBody>
        <ErrorBanner message={error} />
        {loading ? (
          <LoadingBlock />
        ) : (
          <>
            <FilterTabs value={filter} onChange={setFilter} options={FILTERS.map((f) => ({ ...f, count: counts[f.value] }))} />
            <DataTable
              rows={rows}
              columns={columns}
              onRowClick={(h) => router.push(`/holdings/${h.id}`)}
              footer={footer}
              empty={<EmptyBox title={isClosed ? 'No closed positions' : 'No holdings here'} description={isClosed ? 'Fully sold investments appear here with their realised P&L.' : 'Add a transaction to start tracking.'} />}
            />
          </>
        )}
      </PageBody>
      <TransactionModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}

function Name({ h }) {
  const i = h.instrument
  return (
    <div className="min-w-0 max-w-[15rem]">
      <p className="truncate font-medium text-gray-900">{i.name}</p>
      <div className="flex items-center gap-2">
        <KindBadge kind={i.kind} />
        <span className="text-xs text-gray-400">{i.symbol ? `${i.exchange} · ${i.symbol}` : i.schemeCode ? `AMFI ${i.schemeCode}` : ''}</span>
        {h.oversold > 0 ? <span className="inline-flex items-center gap-0.5 text-xs text-amber-700" title="More units sold than bought. Check the transactions."><AlertTriangle className="h-3 w-3" /> oversold</span> : null}
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
