'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Check } from 'lucide-react'
import { useAuth } from '@webfudge/auth'
import AuthLayout from '../../../components/saas/AuthLayout'
import { Alert, AppIcon, Button, FullPageSpinner } from '../../../components/saas/ui'
import { api, APP_META, formatDate, SIGNUP_STEPS } from '../../../lib/saas'

function AppsForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { currentOrg, loading, isAuthenticated } = useAuth()
  const orgId = Number(params.get('org')) || currentOrg?.id
  const [catalog, setCatalog] = useState(null)
  const [selected, setSelected] = useState({ crm: true, pm: true })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login')
    else if (!loading && !orgId) router.replace('/setup/organization')
  }, [loading, isAuthenticated, orgId, router])

  useEffect(() => {
    api('/api/saas/catalog', { auth: false })
      .then((data) => setCatalog(data))
      .catch((e) => setError(e.message))
  }, [])

  const picked = useMemo(() => (catalog?.apps || []).filter((a) => a.availability === 'available' && selected[a.slug]), [catalog, selected])
  const trialEnd = formatDate(Date.now() + (catalog?.trialDays || 14) * 86400000)

  const submit = async () => {
    if (!picked.length) return setError('Pick at least one app to start.')
    setSubmitting(true)
    setError('')
    try {
      await api(`/api/saas/organizations/${orgId}/trials`, { method: 'POST', body: { apps: picked.map((a) => a.slug) } })
      router.push(`/setup/team?org=${orgId}`)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  if (loading || !catalog) return <FullPageSpinner />

  return (
    <AuthLayout steps={SIGNUP_STEPS} current={3}>
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">Pick your apps</h1>
      <p className="mb-6 mt-2 text-[17px] leading-relaxed text-[#5C5C5C]">Each app gets its own {catalog.trialDays}-day free trial. No card needed — you can add more later.</p>
      {error && <Alert className="mb-5">{error}</Alert>}

      <div className="space-y-2.5" role="group" aria-label="Apps">
        {catalog.apps.map((app) => {
          const meta = APP_META[app.slug] || {}
          const soon = app.availability !== 'available'
          const on = !soon && Boolean(selected[app.slug])
          return (
            <button
              key={app.slug}
              type="button"
              role="checkbox"
              aria-checked={on}
              disabled={soon}
              onClick={() => setSelected((s) => ({ ...s, [app.slug]: !s[app.slug] }))}
              className={`flex min-h-[76px] w-full items-center gap-4 rounded-2xl border p-3.5 text-left transition ${
                soon ? 'cursor-not-allowed border-dashed border-[#DCDCD8] bg-[#FAFAF8] opacity-80' : on ? 'border-2 border-[#F5630F] bg-white shadow-[0_0_0_4px_rgba(245,99,15,.12)]' : 'border-[#DCDCD8] bg-white hover:bg-[#FAFAF8]'
              }`}
            >
              <AppIcon src={meta.icon} size={48} tint={meta.tint} />
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold">{meta.name || app.name}</span>
                <span className="block text-sm text-[#5C5C5C]">{app.tagline}</span>
              </span>
              {soon ? (
                <span className="text-[13px] font-semibold text-[#5C5C5C]">Coming soon</span>
              ) : (
                <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${on ? 'border-[#F5630F] bg-[#F5630F] text-white' : 'border-[#CFCFCA]'}`}>
                  {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="mt-5 rounded-xl bg-[#FFF1E8] px-4 py-3.5 text-[15px] text-[#5C3412]">
        {picked.length
          ? `${picked.map((a) => APP_META[a.slug]?.name || a.name).join(' and ')} — free until ${trialEnd}. We’ll remind you 4 days and 1 day before each trial ends.`
          : 'Pick at least one app to start.'}
      </p>
      <Button type="button" onClick={submit} variant="primary" size="lg" loading={submitting} disabled={!picked.length} className="mt-5 w-full !rounded-xl">
        Start free trial
      </Button>
    </AuthLayout>
  )
}

export default function SetupAppsPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <AppsForm />
    </Suspense>
  )
}
