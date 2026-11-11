'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, CalendarClock, Pencil, Trash2 } from 'lucide-react'
import { Button, Input, Modal } from '@webfudge/ui'
import { useInvest } from '../../../components/InvestDataProvider'
import { PageHeader, PageBody, Panel, Gain, PctText, KindBadge, TypeBadge, Stat, LoadingBlock, ErrorBanner, DataTable, FilterTabs } from '../../../components/ui'
import { PriceHistoryChart } from '../../../components/charts'
import TransactionModal from '../../../components/TransactionModal'
import SipModal from '../../../components/SipModal'
import { computeHolding, toIsoDate } from '../../../lib/portfolio.mjs'
import { investApi } from '../../../lib/api'
import { formatINR, formatPrice, formatUnits, formatPct, formatDate, relativeAge, formatDateTime } from '../../../lib/format'

const RANGES = [
  { value: '1m', label: '1M', days: 31 },
  { value: '6m', label: '6M', days: 183 },
  { value: '1y', label: '1Y', days: 366 },
  { value: '3y', label: '3Y', days: 1096 },
  { value: '5y', label: '5Y', days: 1827 },
  { value: 'held', label: 'Since first buy' },
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
  const [error, setError] = useState(null)

  const instrument = instruments.find((i) => i.id === instrumentId)
  const txs = useMemo(() => transactions.filter((t) => relId(t.instrument) === instrumentId), [transactions, instrumentId])
  const holding = useMemo(() => (instrument ? computeHolding(instrument, txs) : null), [instrument, txs])
  const instSips = sips.filter((s) => relId(s.instrument) === instrumentId)

  const from = useMemo(() => {
    if (range === 'held') return holding?.firstDate || null
    const r = RANGES.find((x) => x.value === range)
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

  if (loading) return <LoadingBlock />
  if (!instrument) {
    return (
      <PageBody>
        <p className="text-sm text-gray-600">This instrument was not found.</p>
        <Link href="/holdings" className="text-sm font-medium text-orange-600">Back to holdings</Link>
      </PageBody>
    )
  }

  const purchases = txs.filter((t) => t.type === 'buy' || t.type === 'sip').map((t) => ({ date: t.date, price: t.price }))
  const h = holding

  async function deleteTx(tx) {
    if (!window.confirm(`Delete this ${tx.type} of ${formatINR(tx.amount)} on ${formatDate(tx.date)}? This cannot be undone.`)) return
    try {
      await investApi.deleteTransaction(tx.id)
      await reload()
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteInstrument() {
    if (!window.confirm(`Stop tracking ${instrument.name}? This cannot be undone.`)) return
    try {
      await investApi.deleteInstrument(instrument.id)
      await reload()
      router.push('/holdings')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title={instrument.name}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-3">
            <KindBadge kind={instrument.kind} />
            {instrument.symbol ? <span>{instrument.exchange} · {instrument.symbol}</span> : null}
            {instrument.schemeCode ? <span>AMFI {instrument.schemeCode}</span> : null}
            {instrument.isin ? <span>ISIN {instrument.isin}</span> : null}
            {instrument.category ? <span>{instrument.category}</span> : null}
          </span>
        }
        actions={
          <>
            <Link href="/holdings" className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50">
              <ArrowLeft className="h-4 w-4" /> Holdings
            </Link>
            {instrument.kind === 'other' ? (
              <Button variant="outline" onClick={() => setPriceOpen(true)}>
                <span className="inline-flex items-center gap-1.5"><Pencil className="h-4 w-4" /> Update price</span>
              </Button>
            ) : null}
            {instrument.kind === 'mutual_fund' ? (
              <Button variant="outline" onClick={() => setSipOpen(true)}>
                <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> Start SIP</span>
              </Button>
            ) : null}
            <Button onClick={() => setTxModal({ open: true, tx: null })}>
              <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add transaction</span>
            </Button>
          </>
        }
      >
        <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <span className="text-3xl font-semibold tabular-nums text-brand-dark">{h.hasPrice ? formatPrice(h.price) : '—'}</span>
          {h.dayChangePct != null ? (
            <span className="text-sm">
              <PctText value={h.dayChangePct} /> <span className="text-gray-500">vs previous {instrument.kind === 'mutual_fund' ? 'NAV' : 'close'}</span>
            </span>
          ) : null}
          <span className="text-xs text-gray-500" title={formatDateTime(instrument.lastPriceAt)}>
            {instrument.kind === 'mutual_fund' ? 'NAV' : 'Price'} from {instrument.priceSource || '—'}, {relativeAge(instrument.lastPriceAt)}
          </span>
          {instrument.priceError ? <span className="text-xs text-amber-700">Last refresh failed: {instrument.priceError}</span> : null}
        </div>
      </PageHeader>

      <PageBody>
        <ErrorBanner message={error} />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Invested" value={formatINR(h.invested)} sub={<span className="text-gray-500">{formatUnits(h.units)} units · avg {formatPrice(h.avgCost)}</span>} />
          <Stat label="Current value" value={formatINR(h.currentValue)} sub={!h.hasPrice && h.isOpen ? <span className="text-amber-700">valued at cost (no price)</span> : null} />
          <Stat label="Unrealised P&L" value={<Gain value={h.hasPrice ? h.unrealised : null} className="text-2xl" />} sub={<PctText value={h.unrealisedPct} />} />
          <Stat label="XIRR" value={h.xirr == null ? '—' : formatPct(h.xirr)} sub={<span className="text-gray-500">Realised {formatINR(h.realised, { signed: true })} · Dividends {formatINR(h.dividends)}</span>} />
        </div>

        {canChart ? (
          <Panel
            title={`${instrument.kind === 'mutual_fund' ? 'NAV' : 'Price'} history vs our average cost`}
            action={<FilterTabs value={range} onChange={setRange} options={RANGES.filter((r) => r.value !== 'held' || h.firstDate)} />}
          >
            {historyLoading ? <LoadingBlock label="Loading price history…" /> : <PriceHistoryChart history={history} avgCost={h.isOpen ? h.avgCost : null} purchases={purchases} />}
            {historyError ? <p className="mt-2 text-xs text-amber-700">{historyError}</p> : null}
            <p className="mt-2 text-xs text-gray-500">Dashed line: our average cost. Dots: our purchases.</p>
          </Panel>
        ) : null}

        {instSips.length ? (
          <Panel title="SIPs" action={<Link href="/sips" className="text-sm font-medium text-orange-600">Manage SIPs</Link>}>
            <ul className="divide-y divide-gray-50 text-sm">
              {instSips.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2">
                  <span>{formatINR(s.amount)} {s.frequency}{s.frequency !== 'weekly' ? ` on day ${s.dayOfMonth}` : ''} · since {formatDate(s.startDate)}</span>
                  <span className="capitalize text-gray-500">{s.status}</span>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        <Panel title={`Transactions (${txs.length})`} bodyClassName="p-0">
          <DataTable
            rows={[...txs].sort((a, b) => String(b.date).localeCompare(String(a.date)))}
            empty={
              <div className="flex items-center justify-between gap-3 p-5 text-sm text-gray-500">
                No transactions yet.
                <Button variant="ghost" size="sm" onClick={deleteInstrument}>
                  <span className="inline-flex items-center gap-1 text-red-600"><Trash2 className="h-4 w-4" /> Stop tracking</span>
                </Button>
              </div>
            }
            columns={[
              { key: 'date', label: 'Date', render: (t) => formatDate(t.date) },
              { key: 'type', label: 'Type', render: (t) => <TypeBadge type={t.type} /> },
              { key: 'units', label: 'Units', numeric: true, render: (t) => (t.units ? formatUnits(t.units) : '—') },
              { key: 'price', label: 'Price', numeric: true, render: (t) => (t.price ? formatPrice(t.price) : '—') },
              { key: 'amount', label: 'Amount', numeric: true, render: (t) => formatINR(t.amount, { decimals: 2 }) },
              { key: 'charges', label: 'Charges', numeric: true, render: (t) => (t.charges ? formatINR(t.charges, { decimals: 2 }) : '—') },
              { key: 'vs', label: 'Now vs then', numeric: true, render: (t) => (h.hasPrice && t.price && t.type !== 'dividend' ? <PctText value={h.price / t.price - 1} /> : '—') },
              {
                key: 'actions',
                label: '',
                numeric: true,
                render: (t) => (
                  <span className="inline-flex gap-1">
                    <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setTxModal({ open: true, tx: t })} aria-label="Edit transaction"><Pencil className="h-4 w-4" /></button>
                    <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => deleteTx(t)} aria-label="Delete transaction"><Trash2 className="h-4 w-4" /></button>
                  </span>
                ),
              },
            ]}
          />
        </Panel>
      </PageBody>

      <TransactionModal isOpen={txModal.open} transaction={txModal.tx} defaults={{ instrumentId }} onClose={() => setTxModal({ open: false, tx: null })} />
      <SipModal isOpen={sipOpen} defaults={{ instrumentId }} onClose={() => setSipOpen(false)} />
      <ManualPriceModal isOpen={priceOpen} instrument={instrument} onClose={() => setPriceOpen(false)} onSaved={reload} />
    </>
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
    <Modal isOpen={isOpen} onClose={onClose} title="Update current price" size="sm">
      <form onSubmit={save} className="space-y-4">
        <ErrorBanner message={error} />
        <Input label="Price per unit (₹)" type="number" step="any" min="0" required value={price} onChange={(e) => setPrice(e.target.value)} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}
