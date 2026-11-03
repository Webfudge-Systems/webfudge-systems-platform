'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import AuthLayout from '../../../components/saas/AuthLayout'
import { Alert, Button, FullPageSpinner } from '../../../components/saas/ui'
import InviteRows from '../../../components/saas/InviteRows'
import { api, SIGNUP_STEPS } from '../../../lib/saas'

function TeamForm() {
  const router = useRouter()
  const params = useSearchParams()
  const { currentOrg, loading, isAuthenticated } = useAuth()
  const orgId = Number(params.get('org')) || currentOrg?.id
  const [rows, setRows] = useState([{ email: '', role: 'member' }, { email: '', role: 'member' }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    if (!loading && !isAuthenticated) router.replace('/login')
    else if (!loading && !orgId) router.replace('/setup/organization')
  }, [loading, isAuthenticated, orgId, router])

  const finish = async () => {
    await api(`/api/saas/organizations/${orgId}/onboarding-complete`, { method: 'POST' }).catch(() => {})
    router.replace('/home?welcome=1')
  }

  const send = async () => {
    const invites = rows.filter((r) => r.email.trim())
    if (!invites.length) return setError('Add at least one email, or skip this step.')
    setBusy('send')
    setError('')
    try {
      await api(`/api/saas/organizations/${orgId}/invitations`, { method: 'POST', body: { invites } })
      await finish()
    } catch (e) {
      setError(e.message)
      setBusy('')
    }
  }

  if (loading || !orgId) return <FullPageSpinner />

  return (
    <AuthLayout steps={SIGNUP_STEPS} current={4}>
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">Invite your team</h1>
      <p className="mb-6 mt-2 text-[17px] leading-relaxed text-[#5C5C5C]">
        They’ll get an email to join {currentOrg?.name || 'your organization'}. You can do this later from Members.
      </p>
      {error && <Alert className="mb-5">{error}</Alert>}
      <InviteRows rows={rows} setRows={setRows} disabled={Boolean(busy)} />
      <Button type="button" onClick={send} variant="primary" size="lg" loading={busy === 'send'} disabled={Boolean(busy)} className="mt-6 w-full !rounded-xl">
        Send invites and open Webfudge
      </Button>
      <Button type="button" variant="ghost" onClick={() => { setBusy('skip'); finish() }} loading={busy === 'skip'} disabled={Boolean(busy)} className="mt-2 w-full !rounded-xl text-[#5C5C5C]">
        Skip for now
      </Button>
    </AuthLayout>
  )
}

export default function SetupTeamPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <TeamForm />
    </Suspense>
  )
}
