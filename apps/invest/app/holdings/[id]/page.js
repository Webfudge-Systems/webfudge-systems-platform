'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Plus, CalendarClock, Pencil, Trash2, Wallet, PiggyBank, TrendingUp, Percent, LineChart, ArrowLeftRight, Receipt, Coins } from 'lucide-react'
import { Button, Input, Modal, KPICard, Table, TableEmptyBelow, TabsWithActions, Badge } from '@webfudge/ui'
import { useInvest } from '../../../components/InvestDataProvider'
import InvestPageHeader from '../../../components/InvestPageHeader'
import { Page, Panel, PctText, KindBadge, TypeBadge, LoadingBlock, ErrorBanner, RowActions, ConfirmDeleteModal, num, changeLabel, KPI_GRID } from '../../../components/ui'
import { PriceHistoryChart } from '../../../components/charts'
import TransactionModal from '../../../components/TransactionModal'
import SipModal from '../../../components/SipModal'
import { computeHolding, toIsoDate } from '../../../lib/portfolio.mjs'
import { investApi } from '../../../lib/api'
import { formatINR, formatPrice, formatUnits, formatPct, formatDate, relativeAge, formatDateTime, TYPE_LABELS } from '../../../lib/format'

const RANGES = [
  { key: '1m', label: '1M', days: 31 },
  { key: '6m', label: '6M', days: 183 },
  { key: '1y', label: '1Y', days: 366 },
  { key: '3y', label: '3Y', days: 1096 },
  { key: '5y', label: '5Y', days: 1827 },
  { key: 'held', label: 'Since first buy' },
]

function relId(rel) {
  return rel && typeof rel === 'object' ? rel.id : rel
}

export default function HoldingDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const instrumentId = Number(id)
  const { loading, instruments, transactions, sips, reload } = useInvest()
  const [range, setRange] = useState('1y')
  const [history, setHistory] = useState([])
  const [historyError, setHistoryError] = useState(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [txModal, setTxModal] = useState({ open: false, tx: null })
  const [sipOpen, setSipOpen] = useState(false)
  const [priceOpen, setPriceOpen] = useState(false)
  const [toDelete, setToDelete] = useState(null) // transaction row or 'instrument'

  const instrument = instruments.find((i) => i.id === instrumentId)
  const txs = useMemo(() => transactions.filter((t) => relId(t.instrument) === instrumentId), [transactions, instrumentId])
  const holding = useMemo(() => (instrument ? computeHolding(instrument, txs) : null), [instrument, txs])
  const instSips = sips.filter((s) => relId(s.instrument) === instrumentId)

  const from = useMemo(() => {
    if (range === 'held') return holding?.firstDate || null
    const r = RANGES.find((x) => x.key === range)
    return toIsoDate(Date.now() - r.days * 86400000)
  }, [range, holding?.firstDate])

  const canChart = instrument && instrument.kind !== 'other' && (instrument.symbol || instrument.schemeCode)

  useEffect(() => {
    if (!canChart) return
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    investApi
      .history(instrumentId, from)
      .then((res) => {
        if (cancelled) return
        setHistory(res?.data || [])
        if (res?.error) setHistoryError(res.error)
      })
      .catch((err) => !cancelled && setHistoryError(err.message))
      .finally(() => !cancelled && setHistoryLoading(false))
    return () => {
      cancelled = true
    }
  }, [instrumentId, from, canChart])

  const breadcrumb = [
    { label: 'Portfolio', href: '/' },
    { label: 'Holdings', href: '/holdings' },
    { label: instrument?.symbol || (instrument?.name || 'Holding').split(' - ')[0], href: `/holdings/${instrumentId}` },
  ]

  if (loading) {
    return (
      <Page>
        <InvestPageHeader title="Holding" breadcrumb={breadcrumb} />
        <LoadingBlock />
      </Page>
    )
  }
  if (!instrument) {
    return (
      <Page>
        <InvestPageHeader title="Holding not found" breadcrumb={breadcrumb} />
        <p className="text-sm text-gray-600">
          This instrument was not found. <Link href="/holdings" className="font-medium text-orange-600">Back to holdings</Link>
        </p>
      </Page>
    )
  }

  const purchases = txs.filter((t) => t.type === 'buy' || t.type === 'sip').map((t) => ({ date: t.date, price: t.price }))
  const h = holding
  const isFund = instrument.kind === 'mutual_fund'
  const meta = [
    instrument.symbol ? `${instrument.exchange} · ${instrument.symbol}` : null,
    instrument.schemeCode ? `AMFI ${instrument.schemeCode}` : null,
    instrument.isin ? `ISIN ${instrument.isin}` : null,
    instrument.category || null,
  ].filter(Boolean)

  return (
    <Page>
      <InvestPageHeader
        title={instrument.name}
        // Long scheme names: one step smaller than the shared default so they stay on one or two lines.
        titleClassName={instrument.name.length > 32 ? 'text-xl sm:text-3xl font-normal text-brand-foreground mb-0.5 tracking-tight leading-snug' : undefined}
        subtitle={meta.join(' · ')}
        breadcrumb={breadcrumb}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <KindBadge kind={instrument.kind} />
          <span className="text-3xl font-bold tabular-nums text-gray-900">{h.hasPrice ? formatPrice(h.price) : '—'}</span>
          {h.dayChangePct != null ? (
            <span className="text-sm">
              <PctText value={h.dayChangePct} /> <span className="text-gray-500">vs previous {isFund ? 'NAV' : 'close'}</span>
            </span>
          ) : null}
          <span className="text-sm text-gray-500" title={formatDateTime(instrument.lastPriceAt)}>
            {isFund ? 'NAV' : 'Price'} from {instrument.priceSource || '—'}, {relativeAge(instrument.lastPriceAt)}
          </span>
          {instrument.priceError ? <span className="text-sm text-amber-700">Last refresh failed: {instrument.priceError}</span> : null}
        </div>
          <div className="flex items-center gap-2">
            {instrument.kind === 'other' ? (
              <Button variant="outline" onClick={() => setPriceOpen(true)}>
                <Pencil className="w-4 h-4 mr-2 inline" />
                Update price
              </Button>
            ) : null}
            {isFund ? (
              <Button variant="outline" onClick={() => setSipOpen(true)}>
                <CalendarClock className="w-4 h-4 mr-2 inline" />
                Start SIP
              </Button>
            ) : null}
            <Button variant="primary" onClick={() => setTxModal({ open: true, tx: null })}>
              <Plus className="w-4 h-4 mr-2 inline" />
              Add transaction
            </Button>
          </div>
      </div>

      <div className={KPI_GRID}>
        <KPICard title="Invested" value={formatINR(h.invested)} subtitle={`${formatUnits(h.units)} units · avg ${formatPrice(h.avgCost)}`} icon={PiggyBank} colorScheme="orange" />
        <KPICard title="Current Value" value={formatINR(h.currentValue)} subtitle={!h.hasPrice && h.isOpen ? 'Valued at cost (no price)' : `${h.txCount} transactions`} icon={Wallet} colorScheme="orange" />
        <KPICard title="Unrealised P&L" value={h.hasPrice ? formatINR(h.unrealised, { signed: true }) : '—'} subtitle={changeLabel(h.unrealisedPct, 'on cost')} icon={TrendingUp} colorScheme="orange" />
        <KPICard title="XIRR" value={h.xirr == null ? '—' : formatPct(h.xirr)} subtitle="Annualised, all cash flows" icon={Percent} colorScheme="orange" />
        <KPICard title="Realised P&L" value={formatINR(h.realised, { signed: true })} subtitle={`From ${formatINR(h.totalSoldProceeds)} of sales`} icon={Receipt} colorScheme="orange" />
        <KPICard title="Dividends" value={formatINR(h.dividends)} subtitle={h.dividends ? 'Received' : 'None recorded'} icon={Coins} colorScheme="orange" />
      </div>

      {canChart ? (
        <Panel title={`${isFund ? 'NAV' : 'Price'} history vs our average cost`} subtitle="Dashed line: our average cost. Dots: our purchases." icon={LineChart}>
          <div className="mb-3 max-w-xl">
            <TabsWithActions
              tabs={RANGES.filter((r) => r.key !== 'held' || h.firstDate).map((r) => ({ key: r.key, label: r.label }))}
              activeTab={range}
              onTabChange={setRange}
              pillTrack="hug"
            />
          </div>
          {historyLoading ? <LoadingBlock message="Loading price history..." /> : <PriceHistoryChart history={history} avgCost={h.isOpen ? h.avgCost : null} purchases={purchases} />}
          {historyError ? <p className="mt-2 text-xs text-amber-700">{historyError}</p> : null}
        </Panel>
      ) : null}

      {instSips.length ? (
        <Panel title="SIPs" icon={CalendarClock} action={<Link href="/sips" className="text-sm font-medium text-orange-600 hover:text-orange-700">Manage SIPs</Link>}>
          <ul className="divide-y divide-gray-100 text-sm">
            {instSips.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-2 py-2.5">
                <span>
                  {formatINR(s.amount)} {s.frequency}
                  {s.frequency !== 'weekly' ? ` on day ${s.dayOfMonth}` : ''} · since {formatDate(s.startDate)}
                </span>
                <Badge variant={s.status === 'active' ? 'success' : s.status === 'paused' ? 'warning' : 'default'} size="sm">
                  <span className="capitalize">{s.status}</span>
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title={`Transactions (${txs.length})`} icon={ArrowLeftRight} bodyClassName="p-0 overflow-hidden">
        <Table
          variant="modernEmbedded"
          keyField="id"
          data={[...txs].sort((a, b) => String(b.date).localeCompare(String(a.date)))}
          onRowClick={(t) => setTxModal({ open: true, tx: t })}
          columns={[
            { key: 'date', label: 'Date', className: 'whitespace-nowrap', render: (v) => formatDate(v) },
            { key: 'type', label: 'Type', render: (v) => <TypeBadge type={v} /> },
            num({ key: 'units', label: 'Units', render: (v) => (v ? formatUnits(v) : '—') }),
            num({ key: 'price', label: 'Price', render: (v) => (v ? formatPrice(v) : '—') }),
            num({ key: 'amount', label: 'Amount', render: (v) => formatINR(v, { decimals: 2 }) }),
            num({ key: 'charges', label: 'Charges', render: (v) => (v ? formatINR(v, { decimals: 2 }) : '—') }),
            num({ key: 'vs', label: 'Now vs then', render: (_, t) => (h.hasPrice && t.price && t.type !== 'dividend' ? <PctText value={h.price / t.price - 1} /> : '—') }),
            {
              key: 'actions',
              label: 'Actions',
              headerClassName: 'text-right',
              className: 'text-right',
              render: (_, t) => <RowActions onEdit={() => setTxModal({ open: true, tx: t })} onDelete={() => setToDelete(t)} />,
            },
          ]}
        />
        {txs.length === 0 ? (
          <TableEmptyBelow
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Add a buy or start a SIP, or stop tracking this instrument."
            action={
              <Button variant="danger" onClick={() => setToDelete('instrument')}>
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Stop tracking
              </Button>
            }
          />
        ) : null}
      </Panel>

      <TransactionModal isOpen={txModal.open} transaction={txModal.tx} defaults={{ instrumentId }} onClose={() => setTxModal({ open: false, tx: null })} />
      <SipModal isOpen={sipOpen} defaults={{ instrumentId }} onClose={() => setSipOpen(false)} />
      <ManualPriceModal isOpen={priceOpen} instrument={instrument} onClose={() => setPriceOpen(false)} onSaved={reload} />
      <ConfirmDeleteModal
        isOpen={Boolean(toDelete)}
        title={toDelete === 'instrument' ? 'Stop Tracking' : 'Delete Transaction'}
        confirmLabel={toDelete === 'instrument' ? 'Stop Tracking' : 'Delete Transaction'}
        message={
          toDelete === 'instrument'
            ? `Stop tracking ${instrument.name}?`
            : toDelete
              ? `Delete this ${TYPE_LABELS[toDelete.type].toLowerCase()} of ${formatINR(toDelete.amount)} on ${formatDate(toDelete.date)}?`
              : ''
        }
        onConfirm={async () => {
          if (toDelete === 'instrument') {
            await investApi.deleteInstrument(instrument.id)
            await reload()
            router.push('/holdings')
          } else {
            await investApi.deleteTransaction(toDelete.id)
            await reload()
          }
        }}
        onClose={() => setToDelete(null)}
      />
    </Page>
  )
}

function ManualPriceModal({ isOpen, instrument, onClose, onSaved }) {
  const [price, setPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  useEffect(() => {
    if (isOpen) setPrice(instrument?.lastPrice ?? '')
  }, [isOpen, instrument])
  async function save(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await investApi.updateInstrument(instrument.id, { lastPrice: Number(price) })
      await onSaved()
      onClose()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Current Price" size="sm">
      <form onSubmit={save} className="space-y-5">
        <ErrorBanner message={error} />
        <Input label="Price per unit (₹)" type="number" step="any" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="muted" onClick={onClose} className="w-full rounded-xl border-[1.5px] border-gray-400 bg-gray-300 px-5 py-2.5 sm:w-auto">
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={saving} className="w-full min-w-[9rem] rounded-xl py-2.5 sm:w-auto">
            {saving ? 'Saving…' : 'Save price'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
