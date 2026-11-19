'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { CalendarClock, CreditCard, FileText, Grid3X3, Receipt } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import { useHub } from '../../components/saas/HubShell'
import PlanModal from '../../components/saas/PlanModal'
import { appMeta, appStatus, PLAN_LABEL } from '../../components/saas/appStatus'
import { Alert, AppIcon, Badge, Button, Card, LoadingBlock, PageFrame, TextInput } from '../../components/saas/console'
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
    <Card title="Billing details" subtitle="Shown on your invoices. Add your GSTIN to claim input tax credit.">
      <form onSubmit={save} noValidate className="grid gap-4 sm:grid-cols-2">
        <TextInput label="Legal business name" value={form.legalName} onChange={set('legalName')} />
        <TextInput label="GSTIN" optional value={form.gstin} onChange={set('gstin')} error={errors.gstin} placeholder="27ABCDE1234F1Z5" maxLength={15} />
        <TextInput label="Billing email" type="email" value={form.email} onChange={set('email')} />
        <TextInput label="Address" value={form.addressLine1} onChange={set('addressLine1')} />
        <TextInput label="Address line 2" optional value={form.addressLine2} onChange={set('addressLine2')} />
        <TextInput label="City" value={form.city} onChange={set('city')} />
        <div>
          <label htmlFor="billing-state" className="mb-1.5 block text-sm font-semibold">State</label>
          <select id="billing-state" value={form.state} onChange={set('state')} className="min-h-[48px] w-full rounded-xl border border-gray-300 bg-white px-3.5 text-[15px] outline-none focus:border-orange-500">
            <option value="">Choose a state</option>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <TextInput label="PIN code" inputMode="numeric" value={form.pincode} onChange={set('pincode')} maxLength={6} />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" loading={busy}>Save details</Button>
          {status && <p className="text-sm text-gray-700" role="status">{status}</p>}
        </div>
      </form>
    </Card>
  )
}

function BillingContent() {
  const router = useRouter()
  const params = useSearchParams()
  const { currentOrg: org, reload: reloadHub, error: hubError } = useHub()
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

  const header = {
    title: 'Apps & billing',
    subtitle: summary ? `Plans, payments and invoices for ${summary.organization.name}.` : 'Plans, payments and invoices for your organization.',
    breadcrumb: [{ label: 'Apps & billing', href: '/billing' }],
  }

  if (!summary || !catalog) {
    return <PageFrame {...header}>{error || hubError ? <Alert>{error || hubError}</Alert> : <LoadingBlock />}</PageFrame>
  }

  const subsBySlug = Object.fromEntries(summary.subscriptions.map((s) => [s.app.slug, s]))
  const isAdmin = summary.isAdmin
  const activeSubs = summary.subscriptions.filter((s) => s.access !== 'locked')
  const paidSubs = summary.subscriptions.filter((s) => s.status === 'active' && !['free', 'trial'].includes(s.planCode) && s.endsAt)
  const nextRenewal = [...paidSubs].sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))[0]
  const lastPaid = summary.history.find((p) => p.status === 'paid')
  const kpis = [
    { title: 'Active apps', value: activeSubs.length, subtitle: `${catalog.apps.filter((a) => a.availability === 'available').length} available to add`, icon: Grid3X3 },
    { title: 'Paid plans', value: paidSubs.length, subtitle: paidSubs.length ? 'Billed to this organization' : 'Trials and Free need no card', icon: CreditCard },
    { title: 'Next renewal', value: nextRenewal ? formatDate(nextRenewal.endsAt) : '—', subtitle: nextRenewal ? APP_META[nextRenewal.app.slug]?.name || nextRenewal.app.name : 'Nothing to renew', icon: CalendarClock },
    { title: 'Last payment', value: lastPaid ? formatINR(lastPaid.amountTotal) : '—', subtitle: lastPaid ? formatDate(lastPaid.paidAt || lastPaid.createdAt) : 'No payments yet', icon: Receipt },
  ]

  return (
    <PageFrame {...header}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KPICard key={k.title} title={k.title} value={k.value} subtitle={k.subtitle} icon={k.icon} colorScheme="orange" />
        ))}
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

      <Card title="Apps" subtitle="Start a trial, choose a plan or change users">
        <div className="space-y-3">
        {catalog.apps.map((app) => {
          const meta = APP_META[app.slug] || {}
          const sub = subsBySlug[app.slug]
          const soon = app.availability !== 'available'
          const status = sub ? appStatus({ ...sub, slug: app.slug }) : null
          const freePlan = app.plans.find((p) => p.code === 'free')
          const isPaid = sub && sub.status === 'active' && !['free', 'trial'].includes(sub.planCode) && sub.access === 'full'
          const canChooseFree = sub && freePlan && sub.planCode !== 'free' && (!isPaid || sub.cancelAtPeriodEnd) && summary.memberCount <= (freePlan.maxUsers || Infinity)
          return (
            <article key={app.slug} className={`flex flex-wrap items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm ${soon ? 'opacity-75' : ''}`}>
              <AppIcon src={meta.icon} size={44} tint={meta.tint} />
              <div className="min-w-[200px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-gray-900">{meta.name || app.name}</h3>
                  {status && <Badge tone={status.tone}>{status.label}</Badge>}
                  {soon && <Badge>Coming soon</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-gray-500">
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
        </div>
      </Card>

      {isAdmin && (
        <>
          <BillingDetails orgId={org.id} initial={summary.organization.billingDetails} onSaved={load} />

          <Card title="Payment history" subtitle="Paid and failed payments with GST invoices">
            {summary.history.length === 0 ? (
              <p className="text-sm text-gray-500">No payments yet.</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="text-[13px] text-gray-500">
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
                      <tr key={p.id} className="border-t border-gray-100">
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
                            <Link href={`/billing/invoices/${p.id}`} className="inline-flex items-center gap-1.5 font-semibold text-orange-600 hover:underline">
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
    </PageFrame>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  )
}
