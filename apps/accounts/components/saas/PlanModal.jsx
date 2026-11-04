'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus, ShieldCheck } from 'lucide-react'
import { Alert, Button, Modal, Spinner } from './ui'
import { api, APP_META, formatDate, formatINR, SUPPORT_EMAIL } from '../../lib/saas'
import { payWithRazorpay } from './razorpay'

const KIND_LABEL = {
  new: 'New plan, starting today',
  seats: 'Extra users for the rest of this period',
  renewal: 'Renewal, starting when the current period ends',
}

/**
 * Choose plan, billing cycle and users for one app, see the price and pay with Razorpay.
 * `subscription` is the app's current state from /api/billing/organizations/:id.
 */
export default function PlanModal({ open, onClose, orgId, app, plans, subscription, memberCount, paymentsEnabled, onPaid }) {
  const paidPlans = useMemo(() => plans.filter((p) => p.code !== 'free'), [plans])
  const currentPaid = subscription && !['trial', 'free'].includes(subscription.planCode) ? subscription : null
  const [planCode, setPlanCode] = useState(currentPaid?.planCode || paidPlans.find((p) => p.isPopular)?.code || paidPlans[0]?.code)
  const [cycle, setCycle] = useState(currentPaid?.billingCycle || 'monthly')
  const [users, setUsers] = useState(Math.max(memberCount, currentPaid?.users || 0, 1))
  const [quote, setQuote] = useState(null)
  const [quoteError, setQuoteError] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)

  useEffect(() => {
    if (!open) return
    setDone(null)
    setError('')
  }, [open])

  useEffect(() => {
    if (!open || !planCode) return
    let cancelled = false
    setQuoting(true)
    const t = setTimeout(async () => {
      try {
        const { quote: q } = await api('/api/billing/quote', { method: 'POST', body: { organizationId: orgId, app: app.slug, plan: planCode, cycle, users } })
        if (!cancelled) {
          setQuote(q)
          setQuoteError('')
        }
      } catch (e) {
        if (!cancelled) {
          setQuote(null)
          setQuoteError(e.message)
        }
      } finally {
        if (!cancelled) setQuoting(false)
      }
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [open, orgId, app.slug, planCode, cycle, users])

  const pay = async () => {
    setPaying(true)
    setError('')
    try {
      const order = await api('/api/billing/checkout', { method: 'POST', body: { organizationId: orgId, app: app.slug, plan: planCode, cycle, users } })
      const response = await payWithRazorpay(order)
      if (!response) {
        setPaying(false)
        return
      }
      const result = await api('/api/billing/verify', { method: 'POST', body: response })
      setDone(result.payment)
      onPaid?.()
    } catch (e) {
      setError(e.code === 'PAYMENTS_DISABLED' ? `${e.message} Write to ${SUPPORT_EMAIL}.` : e.message)
    } finally {
      setPaying(false)
    }
  }

  const name = APP_META[app.slug]?.name || app.name
  const selected = paidPlans.find((p) => p.code === planCode)
  const minUsers = Math.max(memberCount, 1)

  if (done) {
    return (
      <Modal open={open} onClose={onClose} title="Payment received">
        <Alert tone="success">
          Thank you! {name} is on the {selected?.name} plan. Invoice {done.invoiceNumber} is in your billing history.
        </Alert>
        <div className="mt-6 flex justify-end gap-2">
          <a href={`/billing/invoices/${done.id}`} className="inline-flex min-h-[48px] items-center rounded-full border border-[#D9D9D5] px-5 font-semibold">View invoice</a>
          <Button onClick={onClose}>Done</Button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title={`Choose a plan for ${name}`} wide>
      <div role="group" aria-label="Billing period" className="mb-5 inline-flex rounded-full bg-[#F4F4F2] p-1">
        {[
          ['monthly', 'Monthly'],
          ['annual', 'Yearly · save 15%'],
        ].map(([value, label]) => (
          <button key={value} type="button" aria-pressed={cycle === value} onClick={() => setCycle(value)} className={`min-h-[40px] rounded-full px-4 text-sm font-semibold ${cycle === value ? 'bg-[#0F0F0F] text-white' : 'text-[#0F0F0F]'}`}>
            {label}
          </button>
        ))}
      </div>

      <div role="radiogroup" aria-label="Plan" className="grid gap-3 sm:grid-cols-3">
        {paidPlans.map((p) => {
          const monthly = cycle === 'annual' ? p.pricePerUserMonthly * (1 - p.yearlyDiscountPercent / 100) : p.pricePerUserMonthly
          const on = p.code === planCode
          return (
            <button
              key={p.code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPlanCode(p.code)}
              className={`flex flex-col rounded-2xl border p-4 text-left transition ${on ? 'border-2 border-[#F5630F] shadow-[0_0_0_4px_rgba(245,99,15,.12)]' : 'border-[#DCDCD8] hover:bg-[#FAFAF8]'}`}
            >
              <span className="flex items-center justify-between">
                <span className="font-semibold">{p.name}</span>
                {p.isPopular && <span className="rounded-full bg-[#FFF1E8] px-2 py-0.5 text-[11px] font-semibold text-[#8F3907]">Popular</span>}
              </span>
              <span className="mt-2 text-2xl font-semibold">{formatINR(monthly)}</span>
              <span className="text-xs text-[#5C5C5C]">per user / month{cycle === 'annual' ? ', billed yearly' : ''}</span>
              <ul className="mt-3 space-y-1.5">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex gap-1.5 text-[13px] text-[#3A3A3A]">
                    <Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#F5630F]" aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#FAFAF8] p-4">
        <div>
          <p id="users-label" className="font-semibold">Users</p>
          <p className="text-[13px] text-[#5C5C5C]">Your organization has {memberCount} member{memberCount === 1 ? '' : 's'}. Pay for at least that many.</p>
        </div>
        <div className="flex items-center gap-2" role="group" aria-labelledby="users-label">
          <button type="button" aria-label="Fewer users" disabled={users <= minUsers} onClick={() => setUsers((u) => Math.max(minUsers, u - 1))} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DCDCD8] bg-white disabled:opacity-40">
            <Minus className="h-4 w-4" />
          </button>
          <input
            aria-label="Number of users"
            inputMode="numeric"
            value={users}
            onChange={(e) => setUsers(Math.max(1, Math.min(10000, Number(e.target.value.replace(/\D/g, '')) || 1)))}
            className="h-11 w-16 rounded-xl border border-[#DCDCD8] text-center text-lg font-semibold"
          />
          <button type="button" aria-label="More users" onClick={() => setUsers((u) => u + 1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#DCDCD8] bg-white">
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-[#EDEDEA] p-5" aria-live="polite">
        {quoting && !quote ? (
          <div className="flex justify-center py-4"><Spinner /></div>
        ) : quoteError ? (
          <Alert>{quoteError}</Alert>
        ) : quote ? (
          <dl className="space-y-2 text-[15px]">
            <div className="flex justify-between gap-4 text-[13px] text-[#5C5C5C]">
              <dt>{KIND_LABEL[quote.kind]}</dt>
              <dd>
                {formatDate(quote.periodStart)} – {formatDate(quote.periodEnd)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>{quote.description}</dt>
              <dd>{formatINR(quote.subtotal, { decimals: 2 })}</dd>
            </div>
            {quote.credit > 0 && (
              <div className="flex justify-between gap-4 text-[#1E6B34]">
                <dt>Credit for unused time on your current plan</dt>
                <dd>−{formatINR(quote.credit, { decimals: 2 })}</dd>
              </div>
            )}
            <div className="flex justify-between gap-4 text-[#5C5C5C]">
              <dt>GST ({Math.round(quote.taxRate * 100)}%)</dt>
              <dd>{formatINR(quote.tax, { decimals: 2 })}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-[#EDEDEA] pt-3 text-lg font-semibold">
              <dt>Total today</dt>
              <dd>{formatINR(quote.total, { decimals: 2 })}</dd>
            </div>
          </dl>
        ) : null}
      </div>

      {error && <Alert className="mt-4">{error}</Alert>}
      {!paymentsEnabled && (
        <Alert tone="info" className="mt-4">
          Online payments are being switched on. To start a paid plan today, write to <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> and we’ll activate it for you.
        </Alert>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-[13px] text-[#5C5C5C]">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Secure payment by Razorpay · UPI, cards and netbanking
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={pay} loading={paying} disabled={!quote || !paymentsEnabled || quote.amountPaise < 100}>
            {quote ? `Pay ${formatINR(quote.total, { decimals: 2 })}` : 'Pay'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
