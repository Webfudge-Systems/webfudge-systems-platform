'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Wallet, PiggyBank, TrendingUp, Percent, Activity, PieChart as PieIcon, LineChart, Briefcase, ArrowLeftRight, CalendarClock, Plus } from 'lucide-react'
import { Button, KPICard, Table, TableEmptyBelow } from '@webfudge/ui'
import { useInvest } from '../components/InvestDataProvider'
import InvestPageHeader from '../components/InvestPageHeader'
import { Page, Panel, Gain, PctText, KindBadge, TypeBadge, PriceStatus, LoadingBlock, ErrorBanner, changeLabel, num, KPI_GRID } from '../components/ui'
import { AllocationDonut, InvestedAreaChart } from '../components/charts'
import TransactionModal from '../components/TransactionModal'
import { allocationByKind, investedOverTime } from '../lib/portfolio.mjs'
import { formatINR, formatINRCompact, formatPct, formatDate, formatPrice } from '../lib/format'
import { nextDueDate } from '../lib/sip.mjs'

const linkClass = 'text-sm font-medium text-orange-600 hover:text-orange-700'

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

  return (
    <Page>
      <InvestPageHeader
        title="Portfolio"
        subtitle="Where Webfudge invested, and where it stands now"
        breadcrumb={[{ label: 'Portfolio', href: '/' }]}
        actions={
          <Button variant="primary" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2 inline" />
            Add transaction
          </Button>
        }
      />

      <PriceStatus />
      <ErrorBanner message={error} />

      {loading ? (
        <LoadingBlock />
      ) : !holdings.length ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <TableEmptyBelow
            icon={Briefcase}
            title="No investments recorded yet"
            description="Add the first buy, SIP instalment or mutual-fund purchase. NSE/BSE and AMFI prices are fetched automatically."
            action={
              <Button variant="primary" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4 mr-2 inline" />
                Add transaction
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className={KPI_GRID}>
            <KPICard title="Current Value" value={formatINRCompact(totals.currentValue)} valueTitle={formatINR(totals.currentValue)} subtitle={`${totals.openCount} open holdings`} icon={Wallet} colorScheme="orange" />
            <KPICard title="Invested" value={formatINRCompact(totals.invested)} valueTitle={formatINR(totals.invested)} subtitle="Cost of units held" icon={PiggyBank} colorScheme="orange" />
            <KPICard title="Unrealised P&L" value={formatINR(totals.unrealised, { signed: true })} subtitle={changeLabel(totals.unrealisedPct, 'on cost')} icon={TrendingUp} colorScheme="orange" />
            <KPICard title="XIRR" value={totals.xirr == null ? '—' : formatPct(totals.xirr)} subtitle="Annualised, all cash flows" icon={Percent} colorScheme="orange" />
            <KPICard title="Today" value={formatINR(totals.dayChange, { signed: true })} subtitle={changeLabel(totals.dayChangePct, 'vs previous close')} icon={Activity} colorScheme="orange" />
            <KPICard title="Total Returns" value={formatINRCompact(totals.totalReturn)} valueTitle={formatINR(totals.totalReturn, { signed: true })} subtitle={`Realised ${formatINR(totals.realised, { signed: true })} · Dividends ${formatINR(totals.dividends)}`} icon={LineChart} colorScheme="orange" />
          </div>

          {totals.unpricedCount ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
              {totals.unpricedCount} holding{totals.unpricedCount > 1 ? 's have' : ' has'} no current price yet and {totals.unpricedCount > 1 ? 'are' : 'is'} valued at cost.
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Panel title="Allocation" subtitle="By current value" icon={PieIcon}>
              <AllocationDonut rows={allocation} />
            </Panel>
            <Panel title="Net invested over time" subtitle="Buys and SIPs minus sale proceeds" icon={LineChart} className="lg:col-span-2">
              <InvestedAreaChart series={investedSeries} />
            </Panel>
          </div>

          <Panel title="Top holdings" subtitle="Largest positions by current value" icon={Briefcase} action={<Link href="/holdings" className={linkClass}>All holdings</Link>} bodyClassName="p-0 overflow-hidden">
            <Table
              variant="modernEmbedded"
              keyField="id"
              data={top}
              onRowClick={(h) => router.push(`/holdings/${h.id}`)}
              columns={[
                { key: 'name', label: 'Holding', render: (_, h) => (<div className="min-w-0"><p className="font-medium text-gray-900">{h.instrument.name}</p><KindBadge kind={h.instrument.kind} /></div>) },
                num({ key: 'invested', label: 'Invested', render: (v) => formatINR(v) }),
                num({ key: 'price', label: 'Price', render: (_, h) => (h.hasPrice ? formatPrice(h.price) : '—') }),
                num({ key: 'currentValue', label: 'Current value', render: (v) => formatINR(v) }),
                num({ key: 'unrealised', label: 'P&L', render: (_, h) => <Gain value={h.hasPrice ? h.unrealised : null} pct={h.unrealisedPct} compact /> }),
                num({ key: 'xirr', label: 'XIRR', render: (v) => <PctText value={v} /> }),
              ]}
            />
          </Panel>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Recent transactions" icon={ArrowLeftRight} action={<Link href="/transactions" className={linkClass}>All transactions</Link>}>
              <ul className="divide-y divide-gray-100">
                {recent.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-2 py-2.5 text-sm">
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
            <Panel title="Upcoming SIP instalments" icon={CalendarClock} action={<Link href="/sips" className={linkClass}>All SIPs</Link>}>
              {upcoming.length ? (
                <ul className="divide-y divide-gray-100">
                  {upcoming.map(({ sip, next }) => (
                    <li key={sip.id} className="flex items-center justify-between gap-3 px-2 py-2.5 text-sm">
                      <span className="truncate text-gray-900">{sip.instrument?.name}</span>
                      <span className="shrink-0 text-right">
                        <span className="tabular-nums text-gray-900">{formatINR(sip.amount)}</span>
                        <span className="ml-3 text-xs text-gray-500">{formatDate(next)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-6 text-center text-sm text-gray-500">No active SIPs.</p>
              )}
            </Panel>
          </div>
        </>
      )}
      <TransactionModal isOpen={addOpen} onClose={() => setAddOpen(false)} />
    </Page>
  )
}
