'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { useAuth } from '@webfudge/auth'
import AuthLayout from '../../../components/saas/AuthLayout'
import { Alert, Button, FullPageSpinner, PasswordInput, TextInput } from '../../../components/saas/ui'
import { api } from '../../../lib/saas'

export default function InvitePage() {
  const { token } = useParams()
  const router = useRouter()
  const { user, isAuthenticated, loading, establishSession, refreshSession, switchOrg, logout } = useAuth()
  const [invite, setInvite] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [form, setForm] = useState({ firstName: '', lastName: '', password: '' })
  const [errors, setErrors] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    api(`/api/saas/invitations/${token}`, { auth: false })
      .then(setInvite)
      .catch((e) => setLoadError(e.message))
  }, [token])

  const here = `/invite/${token}`
  const sameUser = isAuthenticated && invite && user?.email?.toLowerCase() === invite.email.toLowerCase()

  const accept = async () => {
    setBusy('accept')
    setError('')
    try {
      const { organizationId } = await api(`/api/saas/invitations/${token}/accept`, { method: 'POST' })
      await refreshSession()
      switchOrg(organizationId)
      router.replace('/home')
    } catch (e) {
      setError(e.message)
      setBusy('')
    }
  }

  const decline = async () => {
    setBusy('decline')
    await api(`/api/saas/invitations/${token}/decline`, { method: 'POST' }).catch(() => {})
    router.replace('/home')
  }

  const register = async (event) => {
    event.preventDefault()
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Enter your name.'
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Use at least 8 characters, with letters and numbers.'
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy('register')
    setError('')
    try {
      const session = await api(`/api/saas/invitations/${token}/register`, { method: 'POST', auth: false, body: form })
      establishSession(session)
      switchOrg(session.organizationId)
      router.replace('/home?welcome=1')
    } catch (err) {
      if (err.code === 'ACCOUNT_EXISTS') router.replace(`/login?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(here)}`)
      else if (err.field) setErrors({ [err.field]: err.message })
      else setError(err.message)
      setBusy('')
    }
  }

  if (loading || (!invite && !loadError)) return <FullPageSpinner />

  if (loadError) {
    return (
      <AuthLayout>
        <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">This invitation can’t be used</h1>
        <p className="mb-7 mt-2 text-[17px] leading-relaxed text-[#5C5C5C]">{loadError} Ask the person who invited you to send a new one.</p>
        <Link href="/login" className="inline-flex min-h-[48px] items-center rounded-full bg-[#0F0F0F] px-6 font-semibold text-white">
          Go to sign in
        </Link>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1E8] text-[#B84A0B]">
        <Users className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">Join {invite.organization.name}</h1>
      <p className="mb-7 mt-2 text-[17px] leading-relaxed text-[#5C5C5C]">
        {invite.invitedBy ? `${invite.invitedBy} invited you` : 'You’re invited'} to join as <strong className="font-semibold text-[#0F0F0F]">{invite.role}</strong>.
      </p>
      {error && <Alert className="mb-5">{error}</Alert>}

      {sameUser ? (
        <div className="space-y-2.5">
          <Button variant="primary" size="lg" onClick={accept} loading={busy === 'accept'} disabled={Boolean(busy)} className="w-full !rounded-xl">
            Accept and join
          </Button>
          <Button variant="ghost" onClick={decline} loading={busy === 'decline'} disabled={Boolean(busy)} className="w-full !rounded-xl text-[#5C5C5C]">
            Decline
          </Button>
        </div>
      ) : isAuthenticated ? (
        <Alert tone="warn">
          This invitation is for <strong>{invite.email}</strong>, but you’re signed in as <strong>{user?.email}</strong>.{' '}
          <button type="button" className="font-semibold underline" onClick={() => { logout(); router.replace(`/login?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(here)}`) }}>
            Sign in as {invite.email}
          </button>
        </Alert>
      ) : invite.hasAccount ? (
        <Link href={`/login?email=${encodeURIComponent(invite.email)}&next=${encodeURIComponent(here)}`} className="flex min-h-[52px] w-full items-center justify-center rounded-xl bg-[#F5630F] font-semibold text-[#0F0F0F]">
          Sign in as {invite.email} to accept
        </Link>
      ) : (
        <form onSubmit={register} noValidate className="space-y-4">
          <TextInput label="Email" value={invite.email} disabled readOnly />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="First name" autoComplete="given-name" value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} error={errors.firstName} />
            <TextInput label="Last name" optional autoComplete="family-name" value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} />
          </div>
          <PasswordInput autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={errors.password} hint="At least 8 characters, with letters and numbers." />
          <Button type="submit" variant="primary" size="lg" loading={busy === 'register'} className="w-full !rounded-xl">
            Create account and join
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
