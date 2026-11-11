'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@webfudge/ui'
import { useInvest } from '../components/InvestDataProvider'
import { PageHeader, PageBody, Panel, Gain, PctText, KindBadge, TypeBadge, PriceStatus, Stat, LoadingBlock, ErrorBanner, DataTable, EmptyBox } from '../components/ui'
import { AllocationDonut, InvestedAreaChart } from '../components/charts'
import TransactionModal from '../components/TransactionModal'
import { allocationByKind, investedOverTime } from '../lib/portfolio.mjs'
import { formatINR, formatINRCompact, formatPct, formatDate, formatPrice } from '../lib/format'
import { nextDueDate } from '../lib/sip.mjs'

export default function PortfolioDashboard() {
  const router = useRouter()
  const { loading, error, portfolio, transactions, sips } = useInvest()
  const [addOpen, setAddOpen] = useState(false)
  const { holdings, totals } = portfolio

  const allocation = useMemo(() => allocationByKind(holdings), [holdings])
  const investedSeries = useMemo(() => investedOverTime(transactions), [transactions])
  const top = useMemo(() => holdings.filter((h) => h.isOpen).sort((a, b) => b.currentValue - a.currentValue).slice(0, 6), [holdings])
  const recent = transactions.slice(0, 6)
  const upcoming = useMemo(
    () =>
      sips
        .filter((s) => s.status === 'active')
        .map((s) => ({ sip: s, next: nextDueDate(s) }))
        .filter((r) => r.next)
        .sort((a, b) => a.next.localeCompare(b.next))
        .slice(0, 5),
    [sips]
  )

  const header = (
    <PageHeader
      title="Portfolio"
      subtitle="Where Webfudge invested, and where it stands now."
      actions={
        <Button onClick={() => setAddOpen(true)}>
          <span className="inline-flex items-center gap-1.5">
            <Plus className="h-4 w-4" /> Add transaction
          </span>
        </Button>
      }
    >
      <div className="mt-3">
        <PriceStatus />
      </div>
    </PageHeader>
  )

  if (loading) return (<>{header}<LoadingBlock /></>)

  return (
    <>
      {header}
      <PageBody>
        <ErrorBanner message={error} />
        {!holdings.length ? (
          <EmptyBox
            title="No investments recorded yet"
            description="Add the first buy, SIP instalment or mutual-fund purchase. Prices for NSE/BSE stocks and AMFI funds are fetched automatically."
            action={<Button onClick={() => setAddOpen(true)}>Add transaction</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <Stat label="Current value" value={formatINRCompact(totals.currentValue)} title={formatINR(totals.currentValue)} sub={<span className="text-gray-500">{totals.openCount} open holdings</span>} />
              <Stat label="Invested" value={formatINRCompact(totals.invested)} title={formatINR(totals.invested)} sub={<span className="text-gray-500">Cost of units held</span>} />
              <Stat label="Unrealised P&L" value={<Gain value={totals.unrealised} className="text-2xl" />} sub={<PctText value={totals.unrealisedPct} />} />
              <Stat label="XIRR" value={totals.xirr == null ? '—' : formatPct(totals.xirr)} sub={<span className="text-gray-500">Annualised, all cash flows</span>} />
              <Stat label="Today" value={<Gain value={totals.dayChange} className="text-2xl" />} sub={<PctText value={totals.dayChangePct} />} />
            </div>

            {totals.unpricedCount ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
                {totals.unpricedCount} holding{totals.unpricedCount > 1 ? 's have' : ' has'} no current price yet and {totals.unpricedCount > 1 ? 'are' : 'is'} valued at cost.
              </p>
            ) : null}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <Panel title="Allocation by current value" className="xl:col-span-1">
                <AllocationDonut rows={allocation} />
              </Panel>
              <Panel title="Net invested over time" className="xl:col-span-2">
                <InvestedAreaChart series={investedSeries} />
              </Panel>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Stat label="Total returns" value={<Gain value={totals.totalReturn} className="text-2xl" />} sub={<span className="text-gray-500">Unrealised + realised + dividends</span>} />
              <Stat label="Realised P&L" value={<Gain value={totals.realised} className="text-2xl" />} sub={<span className="text-gray-500">{totals.closedCount} closed positions</span>} />
              <Stat label="Dividends received" value={formatINR(totals.dividends)} />
            </div>

            <Panel title="Top holdings" action={<Link href="/holdings" className="text-sm font-medium text-orange-600 hover:text-orange-700">All holdings</Link>} bodyClassName="p-0">
              <DataTable
                rows={top}
                onRowClick={(h) => router.push(`/holdings/${h.id}`)}
                columns={[
                  { key: 'name', label: 'Holding', render: (h) => (<div className="min-w-0"><p className="font-medium text-gray-900">{h.instrument.name}</p><KindBadge kind={h.instrument.kind} /></div>) },
                  { key: 'invested', label: 'Invested', numeric: true, render: (h) => formatINR(h.invested) },
                  { key: 'price', label: 'Price', numeric: true, render: (h) => (h.hasPrice ? formatPrice(h.price) : <span className="text-gray-400">—</span>) },
                  { key: 'value', label: 'Current value', numeric: true, render: (h) => formatINR(h.currentValue) },
                  { key: 'pnl', label: 'P&L', numeric: true, render: (h) => <Gain value={h.hasPrice ? h.unrealised : null} pct={h.unrealisedPct} compact /> },
                  { key: 'xirr', label: 'XIRR', numeric: true, render: (h) => <PctText value={h.xirr} /> },
                ]}
              />
            </Panel>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Panel title="Recent transactions" action={<Link href="/transactions" className="text-sm font-medium text-orange-600 hover:text-orange-700">All transactions</Link>}>
                <ul className="divide-y divide-gray-50">
                  {recent.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="flex min-w-0 items-center gap-3">
                        <TypeBadge type={t.type} />
                        <span className="truncate text-gray-900">{t.instrument?.name}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="tabular-nums text-gray-900">{formatINR(t.amount)}</p>
                        <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Upcoming SIP instalments" action={<Link href="/sips" className="text-sm font-medium text-orange-600 hover:text-orange-700">All SIPs</Link>}>
                {upcoming.length ? (
                  <ul className="divide-y divide-gray-50">
                    {upcoming.map(({ sip, next }) => (
                      <li key={sip.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                        <span className="truncate text-gray-900">{sip.instrument?.name}</span>
                        <span className="shrink-0 text-right">
                          <span className="tabular-nums text-gray-900">{formatINR(sip.amount)}</span>
                          <span className="ml-3 text-xs text-gray-500">{formatDate(next)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No active SIPs.</p>
                )}
              </Panel>
            </div>
          </>
        )}
      </PageBody>
      <TransactionModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </>
  )
}
