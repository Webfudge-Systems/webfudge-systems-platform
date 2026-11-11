'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, Search, Download } from 'lucide-react'
import { Button, Input } from '@webfudge/ui'
import { useInvest } from '../../components/InvestDataProvider'
import { PageHeader, PageBody, TypeBadge, KindBadge, LoadingBlock, ErrorBanner, DataTable, EmptyBox, FilterTabs } from '../../components/ui'
import TransactionModal from '../../components/TransactionModal'
import { investApi } from '../../lib/api'
import { formatINR, formatPrice, formatUnits, formatDate, TYPE_LABELS } from '../../lib/format'

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'buy', label: 'Buys' },
  { value: 'sell', label: 'Sells' },
  { value: 'sip', label: 'SIP instalments' },
  { value: 'dividend', label: 'Dividends' },
]

function relId(rel) {
  return rel && typeof rel === 'object' ? rel.id : rel
}

function toCsv(rows) {
  const head = ['Date', 'Type', 'Instrument', 'Symbol/Scheme', 'Units', 'Price', 'Amount', 'Charges', 'Account', 'Folio', 'Notes']
  const esc = (v) => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map((t) =>
    [t.date, TYPE_LABELS[t.type], t.instrument?.name, t.instrument?.symbol || t.instrument?.schemeCode, t.units, t.price, t.amount, t.charges, t.account, t.folio, t.notes].map(esc).join(',')
  )
  return [head.join(','), ...lines].join('\n')
}

export default function TransactionsPage() {
  const { loading, error, transactions, reload } = useInvest()
  const [type, setType] = useState('all')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState({ open: false, tx: null })
  const [actionError, setActionError] = useState(null)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return transactions.filter(
      (t) =>
        (type === 'all' || t.type === type) &&
        (!term || `${t.instrument?.name || ''} ${t.instrument?.symbol || ''} ${t.account || ''} ${t.notes || ''}`.toLowerCase().includes(term))
    )
  }, [transactions, type, q])

  const counts = useMemo(() => Object.fromEntries(TYPES.map((t) => [t.value, t.value === 'all' ? transactions.length : transactions.filter((x) => x.type === t.value).length])), [transactions])

  async function remove(tx) {
    if (!window.confirm(`Delete this ${TYPE_LABELS[tx.type].toLowerCase()} of ${formatINR(tx.amount)} in ${tx.instrument?.name} on ${formatDate(tx.date)}? This cannot be undone.`)) return
    setActionError(null)
    try {
      await investApi.deleteTransaction(tx.id)
      await reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `webfudge-investments-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        subtitle="Every buy, sell, SIP instalment and dividend."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <span className="inline-flex items-center gap-1.5"><Download className="h-4 w-4" /> Export CSV</span>
            </Button>
            <Button onClick={() => setModal({ open: true, tx: null })}>
              <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> Add transaction</span>
            </Button>
          </>
        }
      />
      <PageBody>
        <ErrorBanner message={error || actionError} />
        {loading ? (
          <LoadingBlock />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterTabs value={type} onChange={setType} options={TYPES.map((t) => ({ ...t, count: counts[t.value] }))} />
              <div className="w-full sm:w-72">
                <Input icon={Search} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search instrument, broker, notes" aria-label="Search transactions" />
              </div>
            </div>
            <DataTable
              rows={rows}
              empty={
                <EmptyBox
                  title={transactions.length ? 'No transactions match' : 'No transactions yet'}
                  description={transactions.length ? 'Try another filter.' : 'Record a buy, SIP instalment or dividend to start the portfolio.'}
                  action={!transactions.length ? <Button onClick={() => setModal({ open: true, tx: null })}>Add transaction</Button> : null}
                />
              }
              columns={[
                { key: 'date', label: 'Date', render: (t) => <span className="whitespace-nowrap">{formatDate(t.date)}</span> },
                { key: 'type', label: 'Type', render: (t) => <TypeBadge type={t.type} /> },
                {
                  key: 'instrument',
                  label: 'Instrument',
                  render: (t) => (
                    <Link href={`/holdings/${relId(t.instrument)}`} className="block min-w-0 max-w-xs hover:text-orange-700">
                      <span className="block truncate font-medium text-gray-900">{t.instrument?.name}</span>
                      <KindBadge kind={t.instrument?.kind} />
                      {t.autoGenerated ? <span className="ml-2 text-xs text-gray-400">auto</span> : null}
                    </Link>
                  ),
                },
                { key: 'units', label: 'Units', numeric: true, render: (t) => (t.units ? formatUnits(t.units) : '—') },
                { key: 'price', label: 'Price', numeric: true, render: (t) => (t.price ? formatPrice(t.price) : '—') },
                { key: 'amount', label: 'Amount', numeric: true, render: (t) => formatINR(t.amount, { decimals: 2 }) },
                { key: 'charges', label: 'Charges', numeric: true, render: (t) => (t.charges ? formatINR(t.charges, { decimals: 2 }) : '—') },
                { key: 'account', label: 'Account', render: (t) => <span className="text-gray-600">{t.account || '—'}</span> },
                {
                  key: 'actions',
                  label: '',
                  numeric: true,
                  render: (t) => (
                    <span className="inline-flex gap-1">
                      <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setModal({ open: true, tx: t })} aria-label="Edit transaction"><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(t)} aria-label="Delete transaction"><Trash2 className="h-4 w-4" /></button>
                    </span>
                  ),
                },
              ]}
            />
          </>
        )}
      </PageBody>
      <TransactionModal isOpen={modal.open} transaction={modal.tx} onClose={() => setModal({ open: false, tx: null })} />
    </>
  )
}
