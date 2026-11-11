'use client'

import { useEffect, useMemo, useState } from 'react'
import { Modal, Button, Input, Select, Textarea } from '@webfudge/ui'
import InstrumentPicker from './InstrumentPicker'
import { useInvest } from './InvestDataProvider'
import { investApi } from '../lib/api'
import { formatINR, formatUnits } from '../lib/format'
import { toIsoDate } from '../lib/portfolio.mjs'
import { ErrorBanner } from './ui'

const TYPES = [
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
  { value: 'sip', label: 'SIP instalment' },
  { value: 'dividend', label: 'Dividend / payout' },
]

function relId(rel) {
  return rel && typeof rel === 'object' ? rel.id : rel
}

/**
 * Add or edit a transaction. Enter any two of units, price and amount; the third is derived.
 */
export default function TransactionModal({ isOpen, onClose, transaction, defaults = {} }) {
  const { ensureInstrument, reload, sips, portfolio } = useInvest()
  const editing = Boolean(transaction?.id)
  const [picked, setPicked] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    const t = transaction || {}
    const instId = relId(t.instrument) || defaults.instrumentId
    setPicked(instId ? { instrumentId: instId } : null)
    setForm({
      type: t.type || defaults.type || 'buy',
      date: t.date || toIsoDate(),
      units: t.units ?? '',
      price: t.price ?? '',
      amount: t.amount ?? '',
      charges: t.charges ?? '',
      account: t.account || '',
      folio: t.folio || '',
      notes: t.notes || '',
      sip: relId(t.sip) ? String(relId(t.sip)) : defaults.sipId ? String(defaults.sipId) : '',
    })
    setError(null)
  }, [isOpen, transaction, defaults.instrumentId, defaults.type, defaults.sipId])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  const derived = useMemo(() => {
    const u = Number(form.units) || 0
    const p = Number(form.price) || 0
    const a = Number(form.amount) || 0
    if (form.type === 'dividend') return null
    if (u && p && !a) return `Amount ${formatINR(u * p, { decimals: 2 })}`
    if (a && p && !u) return `${formatUnits(a / p)} units`
    if (a && u && !p) return `Price ${formatINR(a / u, { decimals: 2 })}`
    return null
  }, [form])

  const instrumentId = picked?.instrumentId
  const held = instrumentId ? portfolio.holdings.find((h) => h.id === Number(instrumentId)) : null
  const sipOptions = sips
    .filter((s) => !instrumentId || relId(s.instrument) === Number(instrumentId))
    .map((s) => ({ value: String(s.id), label: `${formatINR(s.amount)} ${s.frequency} · from ${s.startDate}` }))

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const id = await ensureInstrument(picked)
      const data = {
        type: form.type,
        date: form.date,
        units: form.type === 'dividend' ? null : form.units === '' ? null : Number(form.units),
        price: form.type === 'dividend' ? null : form.price === '' ? null : Number(form.price),
        amount: form.amount === '' ? null : Number(form.amount),
        charges: form.charges === '' ? 0 : Number(form.charges),
        account: form.account || null,
        folio: form.folio || null,
        notes: form.notes || null,
        instrument: id,
        sip: form.type === 'sip' && form.sip ? Number(form.sip) : null,
      }
      if (editing) await investApi.updateTransaction(transaction.id, data)
      else await investApi.createTransaction(data)
      await reload()
      onClose(true)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={editing ? 'Edit transaction' : 'Add transaction'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBanner message={error} />
        <InstrumentPicker value={picked} onChange={setPicked} defaultKind={defaults.kind || 'stock'} lockedInstrumentId={editing ? relId(transaction.instrument) : null} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Type" allowEmpty={false} options={TYPES} value={form.type} onChange={set('type')} />
          <Input label={form.type === 'sip' ? 'Allotment date' : 'Date'} type="date" required value={form.date || ''} onChange={set('date')} max={toIsoDate()} />
        </div>
        {form.type !== 'dividend' ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input label="Units" type="number" step="any" min="0" value={form.units} onChange={set('units')} />
              <Input label={form.type === 'sip' ? 'NAV / price (₹)' : 'Price per unit (₹)'} type="number" step="any" min="0" value={form.price} onChange={set('price')} />
              <Input label="Amount (₹)" type="number" step="any" min="0" value={form.amount} onChange={set('amount')} />
            </div>
            <p className="-mt-2 text-xs text-gray-500">
              Fill any two; the third is worked out.{derived ? <span className="ml-1 font-medium text-gray-700">{derived}</span> : null}
              {form.type === 'sell' && held ? <span className="ml-2">You hold {formatUnits(held.units)} units.</span> : null}
            </p>
          </>
        ) : (
          <Input label="Amount received (₹)" type="number" step="any" min="0" required value={form.amount} onChange={set('amount')} />
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Charges (₹)" type="number" step="any" min="0" value={form.charges} onChange={set('charges')} placeholder="Brokerage, STT, stamp duty" />
          <Input label="Broker / account" value={form.account} onChange={set('account')} placeholder="e.g. Zerodha" />
          <Input label="Folio" value={form.folio} onChange={set('folio')} />
        </div>
        {form.type === 'sip' && sipOptions.length ? (
          <Select label="Part of SIP" options={sipOptions} value={form.sip} onChange={set('sip')} placeholder="Not linked to a SIP" />
        ) : null}
        <Textarea label="Notes" rows={2} value={form.notes} onChange={set('notes')} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !picked}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
