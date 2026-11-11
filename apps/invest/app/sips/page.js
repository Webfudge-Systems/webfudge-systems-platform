'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Pencil, Trash2, RefreshCw, ListPlus } from 'lucide-react'
import { Button, Badge } from '@webfudge/ui'
import { useInvest } from '../../components/InvestDataProvider'
import { PageHeader, PageBody, Gain, LoadingBlock, ErrorBanner, DataTable, EmptyBox, FilterTabs } from '../../components/ui'
import SipModal from '../../components/SipModal'
import TransactionModal from '../../components/TransactionModal'
import { investApi } from '../../lib/api'
import { nextDueDate, missingInstalments } from '../../lib/sip.mjs'
import { computeHolding } from '../../lib/portfolio.mjs'
import { formatINR, formatDate, formatUnits } from '../../lib/format'

function relId(rel) {
  return rel && typeof rel === 'object' ? rel.id : rel
}

const STATUS_VARIANT = { active: 'success', paused: 'warning', stopped: 'default' }

export default function SipsPage() {
  const { loading, error, sips, transactions, instruments, reload } = useInvest()
  const [filter, setFilter] = useState('active')
  const [modal, setModal] = useState({ open: false, sip: null })
  const [txModal, setTxModal] = useState({ open: false, defaults: {} })
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)

  const rows = useMemo(() => {
    const instById = new Map(instruments.map((i) => [i.id, i]))
    return sips
      .filter((s) => filter === 'all' || s.status === filter)
      .map((s) => {
        const instalments = transactions.filter((t) => relId(t.sip) === s.id)
        const inst = instById.get(relId(s.instrument)) || s.instrument
        // Value of the units bought through this SIP (FIFO within the SIP's own instalments).
        const h = computeHolding(inst, instalments)
        return {
          ...s,
          inst,
          instalments,
          invested: h.invested,
          units: h.units,
          currentValue: h.currentValue,
          gain: h.hasPrice ? h.unrealised : null,
          gainPct: h.unrealisedPct,
          next: nextDueDate(s),
          missing: missingInstalments(s, instalments.map((t) => t.date)),
        }
      })
  }, [sips, transactions, instruments, filter])

  const counts = useMemo(
    () => ({ active: sips.filter((s) => s.status === 'active').length, paused: sips.filter((s) => s.status === 'paused').length, stopped: sips.filter((s) => s.status === 'stopped').length, all: sips.length }),
    [sips]
  )
  const monthly = sips
    .filter((s) => s.status === 'active')
    .reduce((sum, s) => sum + (s.frequency === 'weekly' ? (s.amount * 52) / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.amount), 0)

  async function sync(sip) {
    setBusy(sip.id)
    setNotice(null)
    setActionError(null)
    try {
      const res = await investApi.syncSip(sip.id)
      const created = res?.meta?.created || 0
      const skipped = res?.meta?.skipped || []
      setNotice(
        `${sip.instrument?.name}: recorded ${created} instalment${created === 1 ? '' : 's'} at the published NAV.` +
          (skipped.length ? ` ${skipped.length} skipped (${skipped[0].reason}).` : '') +
          (res?.meta?.remaining ? ` ${res.meta.remaining} more to go — run it again.` : '')
      )
      await reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(null)
    }
  }

  async function remove(sip) {
    if (!window.confirm(`Delete the ${formatINR(sip.amount)} SIP in ${sip.instrument?.name}? Its recorded instalments stay as transactions. This cannot be undone.`)) return
    try {
      await investApi.deleteSip(sip.id)
      await reload()
    } catch (err) {
      setActionError(err.message)
    }
  }

  return (
    <>
      <PageHeader
        title="SIPs"
        subtitle={`Systematic investment plans. Active commitment ≈ ${formatINR(monthly)} a month.`}
        actions={
          <Button onClick={() => setModal({ open: true, sip: null })}>
            <span className="inline-flex items-center gap-1.5"><Plus className="h-4 w-4" /> New SIP</span>
          </Button>
        }
      />
      <PageBody>
        <ErrorBanner message={error || actionError} />
        {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p> : null}
        {loading ? (
          <LoadingBlock />
        ) : (
          <>
            <FilterTabs
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'active', label: 'Active', count: counts.active },
                { value: 'paused', label: 'Paused', count: counts.paused },
                { value: 'stopped', label: 'Stopped', count: counts.stopped },
                { value: 'all', label: 'All', count: counts.all },
              ]}
            />
            <DataTable
              rows={rows}
              empty={
                <EmptyBox
                  title={sips.length ? 'No SIPs with this status' : 'No SIPs yet'}
                  description="Create a SIP for a mutual fund; past instalments can be recorded automatically from AMFI NAVs."
                  action={!sips.length ? <Button onClick={() => setModal({ open: true, sip: null })}>New SIP</Button> : null}
                />
              }
              columns={[
                {
                  key: 'fund',
                  label: 'Fund',
                  render: (s) => (
                    <div className="min-w-0 max-w-xs">
                      <Link href={`/holdings/${relId(s.instrument)}`} className="block truncate font-medium text-gray-900 hover:text-orange-700">{s.instrument?.name}</Link>
                      <span className="text-xs text-gray-500">
                        {formatINR(s.amount)} {s.frequency}{s.frequency !== 'weekly' ? ` · day ${s.dayOfMonth}` : ''} · since {formatDate(s.startDate)}
                        {s.endDate ? ` · until ${formatDate(s.endDate)}` : ''}
                      </span>
                    </div>
                  ),
                },
                { key: 'status', label: 'Status', render: (s) => <Badge variant={STATUS_VARIANT[s.status]} size="sm"><span className="capitalize">{s.status}</span></Badge> },
                { key: 'count', label: 'Instalments', numeric: true, render: (s) => s.instalments.length },
                { key: 'invested', label: 'Invested', numeric: true, render: (s) => formatINR(s.invested) },
                { key: 'units', label: 'Units', numeric: true, render: (s) => formatUnits(s.units) },
                { key: 'value', label: 'Current value', numeric: true, render: (s) => formatINR(s.currentValue) },
                { key: 'gain', label: 'Gain', numeric: true, render: (s) => <Gain value={s.gain} pct={s.gainPct} compact /> },
                {
                  key: 'next',
                  label: 'Next due',
                  numeric: true,
                  render: (s) => (
                    <div>
                      <span>{s.next ? formatDate(s.next) : '—'}</span>
                      {s.missing.length ? <p className="text-xs text-amber-700">{s.missing.length} not recorded</p> : null}
                    </div>
                  ),
                },
                {
                  key: 'actions',
                  label: '',
                  numeric: true,
                  render: (s) => (
                    <span className="inline-flex items-center gap-1">
                      {s.missing.length ? (
                        <Button variant="outline" size="sm" onClick={() => sync(s)} disabled={busy === s.id} title="Create the missing instalments at each date's published NAV">
                          <span className="inline-flex items-center gap-1">
                            <RefreshCw className={`h-3.5 w-3.5 ${busy === s.id ? 'animate-spin' : ''}`} /> Record due instalments
                          </span>
                        </Button>
                      ) : null}
                      <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setTxModal({ open: true, defaults: { instrumentId: relId(s.instrument), type: 'sip', sipId: s.id } })} aria-label="Record one instalment by hand" title="Record one instalment by hand"><ListPlus className="h-4 w-4" /></button>
                      <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-gray-100" onClick={() => setModal({ open: true, sip: s })} aria-label="Edit SIP"><Pencil className="h-4 w-4" /></button>
                      <button type="button" className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600" onClick={() => remove(s)} aria-label="Delete SIP"><Trash2 className="h-4 w-4" /></button>
                    </span>
                  ),
                },
              ]}
            />
          </>
        )}
      </PageBody>
      <SipModal isOpen={modal.open} sip={modal.sip} onClose={() => setModal({ open: false, sip: null })} />
      <TransactionModal isOpen={txModal.open} defaults={txModal.defaults} onClose={() => setTxModal({ open: false, defaults: {} })} />
    </>
  )
}
