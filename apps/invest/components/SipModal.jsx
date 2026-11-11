'use client'

import { useEffect, useState } from 'react'
import { Modal, Button, Input, Select, Textarea } from '@webfudge/ui'
import InstrumentPicker from './InstrumentPicker'
import { useInvest } from './InvestDataProvider'
import { investApi } from '../lib/api'
import { toIsoDate } from '../lib/portfolio.mjs'
import { ErrorBanner } from './ui'

function relId(rel) {
  return rel && typeof rel === 'object' ? rel.id : rel
}

export default function SipModal({ isOpen, onClose, sip, defaults = {} }) {
  const { ensureInstrument, reload } = useInvest()
  const editing = Boolean(sip?.id)
  const [picked, setPicked] = useState(null)
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!isOpen) return
    const s = sip || {}
    const instId = relId(s.instrument) || defaults.instrumentId
    setPicked(instId ? { instrumentId: instId } : null)
    setForm({
      amount: s.amount ?? '',
      frequency: s.frequency || 'monthly',
      dayOfMonth: s.dayOfMonth ?? 5,
      startDate: s.startDate || toIsoDate(),
      endDate: s.endDate || '',
      status: s.status || 'active',
      folio: s.folio || '',
      account: s.account || '',
      notes: s.notes || '',
    })
    setError(null)
  }, [isOpen, sip, defaults.instrumentId])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e?.target ? e.target.value : e }))

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const id = await ensureInstrument(picked)
      const data = {
        instrument: id,
        amount: Number(form.amount),
        frequency: form.frequency,
        dayOfMonth: form.frequency === 'weekly' ? null : Number(form.dayOfMonth),
        startDate: form.startDate,
        endDate: form.endDate || null,
        status: form.status,
        folio: form.folio || null,
        account: form.account || null,
        notes: form.notes || null,
      }
      if (editing) await investApi.updateSip(sip.id, data)
      else await investApi.createSip(data)
      await reload()
      onClose(true)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={() => onClose(false)} title={editing ? 'Edit SIP' : 'New SIP'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <ErrorBanner message={error} />
        <InstrumentPicker value={picked} onChange={setPicked} defaultKind="mutual_fund" lockedInstrumentId={editing ? relId(sip.instrument) : null} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Instalment amount (₹)" type="number" step="any" min="1" required value={form.amount} onChange={set('amount')} />
          <Select
            label="Frequency"
            allowEmpty={false}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'quarterly', label: 'Quarterly' },
              { value: 'weekly', label: 'Weekly' },
            ]}
            value={form.frequency}
            onChange={set('frequency')}
          />
          {form.frequency !== 'weekly' ? (
            <Input label="SIP day (1–28)" type="number" min="1" max="28" required value={form.dayOfMonth} onChange={set('dayOfMonth')} />
          ) : (
            <div />
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Start date" type="date" required value={form.startDate} onChange={set('startDate')} />
          <Input label="End date (optional)" type="date" value={form.endDate} onChange={set('endDate')} />
          <Select
            label="Status"
            allowEmpty={false}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'paused', label: 'Paused' },
              { value: 'stopped', label: 'Stopped' },
            ]}
            value={form.status}
            onChange={set('status')}
          />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Folio" value={form.folio} onChange={set('folio')} />
          <Input label="Platform / account" value={form.account} onChange={set('account')} placeholder="e.g. Coin, Kuvera, AMC direct" />
        </div>
        <Textarea label="Notes" rows={2} value={form.notes} onChange={set('notes')} />
        <p className="text-xs text-gray-500">
          After saving, use <strong>Record due instalments</strong> on the SIP to fill in past instalments at each date&apos;s published NAV.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={() => onClose(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !picked}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create SIP'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
