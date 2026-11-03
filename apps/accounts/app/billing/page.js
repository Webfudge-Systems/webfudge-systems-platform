'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { FileText } from 'lucide-react'
import { useHub } from '../../components/saas/HubShell'
import PlanModal from '../../components/saas/PlanModal'
import { appMeta, appStatus, PLAN_LABEL } from '../../components/saas/appStatus'
import { Alert, AppIcon, Badge, Button, Card, Spinner, TextInput } from '../../components/saas/ui'
import { api, APP_META, formatDate, formatINR, SUPPORT_EMAIL } from '../../lib/saas'

const STATES = ['Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal']

function BillingDetails({ orgId, initial, onSaved }) {
  const [form, setForm] = useState({ legalName: '', gstin: '', email: '', addressLine1: '', addressLine2: '', city: '', state: '', pincode: '', ...(initial || {}) })
  const [errors, setErrors] = useState({})
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (event) => {
    event.preventDefault()
    setBusy(true)
    setErrors({})
    setStatus('')
    try {
      await api(`/api/billing/organizations/${orgId}/details`, { method: 'PUT', body: form })
      setStatus('Saved. New invoices will use these details.')
      onSaved?.()
    } catch (e) {
      if (e.field) setErrors({ [e.field]: e.message })
      else setStatus(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <h2 className="text-lg font-semibold">Billing details</h2>
      <p className="mb-5 mt-1 text-sm text-[#5C5C5C]">Shown on your invoices. Add your GSTIN to claim input tax credit.</p>
      <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Legal business name" value={form.legalName} onChange={set('legalName')} />
        <TextInput label="GSTIN" optional value={form.gstin} onChange={set('gstin')} error={errors.gstin} placeholder="27ABCDE1234F1Z5" maxLength={15} />
        <TextInput label="Billing email" type="email" value={form.email} onChange={set('email')} />
        <TextInput label="Address" value={form.addressLine1} onChange={set('addressLine1')} />
        <TextInput label="Address line 2" optional value={form.addressLine2} onChange={set('addressLine2')} />
        <TextInput label="City" value={form.city} onChange={set('city')} />
        <div>
          <label htmlFor="billing-state" className="mb-1.5 block text-sm font-semibold">State</label>
          <select id="billing-state" value={form.state} onChange={set('state')} className="min-h-[48px] w-full rounded-xl border border-[#DCDCD8] bg-white px-3.5 text-[15px] outline-none focus:border-[#F5630F]">
            <option value="">Choose a state</option>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <TextInput label="PIN code" inputMode="numeric" value={form.pincode} onChange={set('pincode')} maxLength={6} />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={busy}>Save details</Button>
          {status && <p className="text-sm text-[#3A3A3A]" role="status">{status}</p>}
        </div>
      </form>
    </Card>
  )
}

function BillingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { currentOrg: org, reload: reloadHub } = useHub()
  const [summary, setSummary] = useState(null)
  const [catalog, setCatalog] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [planFor, setPlanFor] = useState(null)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    if (!org) return
    try {
      const [s, c] = await Promise.all([api(`/api/billing/organizations/${org.id}`), api('/api/saas/catalog', { auth: false })])
      setSummary(s)
      setCatalog(c)
    } catch (e) {
      setError(e.message)
    }
  }, [org])

  useEffect(() => {
    setSummary(null)
    load()
  }, [load])

  // /billing?app=crm opens the plan picker for that app (links from emails and banners).
  useEffect(() => {
    const wanted = params.get('app')
    if (!wanted || !summary?.isAdmin) return
    if (summary.subscriptions.some((s) => s.app.slug === wanted)) setPlanFor(wanted)
    router.replace('/billing')
  }, [params, summary, router])

  const refresh = async () => {
    await Promise.all([load(), reloadHub()])
  }

  const act = async (key, fn, message) => {
    setBusy(key)
    setError('')
    setNotice('')
    try {
      await fn()
      setNotice(message)
      await refresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  if (!summary || !catalog) {
    return error ? <Alert>{error}</Alert> : <div className="flex justify-center py-20"><Spinner className="h-6 w-6 text-[#F5630F]" /></div>
  }

  const subsBySlug = Object.fromEntries(summary.subscriptions.map((s) => [s.app.slug, s]))
  const isAdmin = summary.isAdmin

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[15px] text-[#5C5C5C]">{summary.organization.name}</p>
        <h1 className="mt-1 text-[32px] font-medium tracking-[-0.03em] sm:text-[38px]">Apps & billing</h1>
      </div>

      {!isAdmin && <Alert tone="info">Only organization admins can change apps and plans. Ask an admin if you need something changed.</Alert>}
      {isAdmin && !summary.payments.enabled && (
        <Alert tone="info">
          Online payments are being switched on. Trials and the Free plan work today — for a paid plan, write to{' '}
          <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </Alert>
      )}
      {isAdmin && summary.payments.testMode && <Alert tone="warn">Razorpay is in test mode. Use Razorpay’s test cards or UPI IDs; no real money is taken.</Alert>}
      {notice && <Alert tone="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}

      <section aria-labelledby="apps-h" className="space-y-3">
        <h2 id="apps-h" className="text-xl font-semibold">Apps</h2>
        {catalog.apps.map((app) => {
          const meta = APP_META[app.slug] || {}
          const sub = subsBySlug[app.slug]
          const soon = app.availability !== 'available'
          const status = sub ? appStatus({ ...sub, slug: app.slug }) : null
          const freePlan = app.plans.find((p) => p.code === 'free')
          const isPaid = sub && sub.status === 'active' && !['free', 'trial'].includes(sub.planCode) && sub.access === 'full'
          const canChooseFree = sub && freePlan && sub.planCode !== 'free' && (!isPaid || sub.cancelAtPeriodEnd) && summary.memberCount <= (freePlan.maxUsers || Infinity)
          return (
            <article key={app.slug} className={`flex flex-wrap items-center gap-4 rounded-3xl border border-[#EDEDEA] bg-white p-5 ${soon ? 'opacity-75' : ''}`}>
              <AppIcon src={meta.icon} size={56} tint={meta.tint} />
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{meta.name || app.name}</h3>
                  {status && <Badge tone={status.tone}>{status.label}</Badge>}
                  {soon && <Badge>Coming soon</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-[#5C5C5C]">
                  {sub ? `${PLAN_LABEL[sub.planCode] || 'Plan'}${sub.planCode !== 'trial' && sub.planCode !== 'free' ? ` · ${sub.billingCycle === 'annual' ? 'yearly' : 'monthly'}` : ''} · ${appMeta({ ...sub, slug: app.slug })}` : app.tagline}
                </p>
              </div>
              {isAdmin && !soon && (
                <div className="flex flex-wrap gap-2">
                  {!sub && (
                    <Button
                      variant="primary"
                      loading={busy === `trial-${app.slug}`}
                      onClick={() => act(`trial-${app.slug}`, () => api(`/api/saas/organizations/${org.id}/trials`, { method: 'POST', body: { apps: [app.slug] } }), `${meta.name} trial started. You have ${catalog.trialDays} days free.`)}
                    >
                      Start {catalog.trialDays}-day trial
                    </Button>
                  )}
                  {sub && (
                    <Button variant={isPaid ? 'outline' : 'dark'} onClick={() => setPlanFor(app.slug)}>
                      {isPaid ? 'Change plan or users' : 'Choose a plan'}
                    </Button>
                  )}
                  {canChooseFree && (
                    <Button variant="outline" loading={busy === `free-${app.slug}`} onClick={() => act(`free-${app.slug}`, () => api(`/api/billing/organizations/${org.id}/free`, { method: 'POST', body: { app: app.slug } }), `${meta.name} is now on the Free plan.`)}>
                      Use Free plan
                    </Button>
                  )}
                  {isPaid && (
                    <Button
                      variant={sub.cancelAtPeriodEnd ? 'outline' : 'danger'}
                      loading={busy === `cancel-${app.slug}`}
                      onClick={() =>
                        act(
                          `cancel-${app.slug}`,
                          () => api(`/api/billing/organizations/${org.id}/cancel`, { method: 'POST', body: { app: app.slug, resume: sub.cancelAtPeriodEnd } }),
                          sub.cancelAtPeriodEnd ? 'Renewal reminders are back on.' : `${meta.name} will end on ${formatDate(sub.endsAt)}. You can resume any time before then.`
                        )
                      }
                    >
                      {sub.cancelAtPeriodEnd ? 'Resume' : 'Cancel plan'}
                    </Button>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </section>

      {isAdmin && (
        <>
          <BillingDetails orgId={org.id} initial={summary.organization.billingDetails} onSaved={load} />

          <Card>
            <h2 className="mb-4 text-lg font-semibold">Payment history</h2>
            {summary.history.length === 0 ? (
              <p className="text-sm text-[#5C5C5C]">No payments yet.</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[13px] text-[#5C5C5C]">
                      <th className="px-2 pb-2 font-medium">Date</th>
                      <th className="px-2 pb-2 font-medium">App</th>
                      <th className="px-2 pb-2 font-medium">Plan</th>
                      <th className="px-2 pb-2 font-medium">Amount</th>
                      <th className="px-2 pb-2 font-medium">Status</th>
                      <th className="px-2 pb-2 font-medium"><span className="sr-only">Invoice</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.history.map((p) => (
                      <tr key={p.id} className="border-t border-[#F1F1EE]">
                        <td className="px-2 py-3">{formatDate(p.paidAt || p.createdAt)}</td>
                        <td className="px-2 py-3">{APP_META[p.app]?.name || p.appName}</td>
                        <td className="px-2 py-3">
                          {PLAN_LABEL[p.planCode]} · {p.users} users · {p.billingCycle === 'annual' ? 'yearly' : 'monthly'}
                        </td>
                        <td className="px-2 py-3 font-medium">{formatINR(p.amountTotal, { decimals: 2 })}</td>
                        <td className="px-2 py-3">
                          <Badge tone={p.status === 'paid' ? 'green' : 'red'}>{p.status === 'paid' ? 'Paid' : 'Failed'}</Badge>
                        </td>
                        <td className="px-2 py-3 text-right">
                          {p.status === 'paid' && (
                            <Link href={`/billing/invoices/${p.id}`} className="inline-flex items-center gap-1.5 font-semibold text-[#B84A0B] hover:underline">
                              <FileText className="h-4 w-4" aria-hidden="true" /> {p.invoiceNumber}
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      {planFor && (
        <PlanModal
          key={planFor}
          open
          onClose={() => setPlanFor(null)}
          orgId={org.id}
          app={catalog.apps.find((a) => a.slug === planFor)}
          plans={catalog.apps.find((a) => a.slug === planFor)?.plans || []}
          subscription={subsBySlug[planFor]}
          memberCount={summary.memberCount}
          paymentsEnabled={summary.payments.enabled}
          onPaid={refresh}
        />
      )}
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  )
}
