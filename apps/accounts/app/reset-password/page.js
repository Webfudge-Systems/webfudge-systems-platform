'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import AuthLayout from '../../components/saas/AuthLayout'
import { Alert, Button, CodeInput, FullPageSpinner, PasswordInput } from '../../components/saas/ui'
import { api, goTo, postSignInTarget } from '../../lib/saas'

function ResetForm() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') || ''
  const { establishSession } = useAuth()
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!email) router.replace('/forgot-password')
  }, [email, router])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setFieldError('')
    if (code.length !== 6) return setError('Enter the 6-digit code from the email.')
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return setFieldError('Use at least 8 characters, with letters and numbers.')
    }
    setSubmitting(true)
    try {
      const session = await api('/api/auth/password/reset', { method: 'POST', auth: false, body: { email, code, password } })
      establishSession(session)
      goTo(router, postSignInTarget(session.organizations))
    } catch (e) {
      if (e.field === 'password') setFieldError(e.message)
      else setError(e.message)
      setSubmitting(false)
    }
  }

  const resend = async () => {
    setError('')
    try {
      await api('/api/auth/resend-code', { method: 'POST', auth: false, body: { email, purpose: 'reset_password' } })
      setNotice('We sent a new code.')
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">Choose a new password</h1>
      <p className="mb-7 mt-2 text-[17px] leading-relaxed text-[#5C5C5C]">
        If <strong className="break-all font-semibold text-[#0F0F0F]">{email}</strong> has a Webfudge account, we sent it a 6-digit code.
      </p>
      {error && <Alert className="mb-5">{error}</Alert>}
      {notice && <Alert tone="success" className="mb-5">{notice}</Alert>}
      <form onSubmit={submit} noValidate className="space-y-5">
        <CodeInput value={code} onChange={setCode} disabled={submitting} error={Boolean(error)} />
        <PasswordInput label="New password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldError} hint="At least 8 characters, with letters and numbers." />
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full !rounded-xl">
          Save password and sign in
        </Button>
      </form>
      <p className="mt-6 text-[15px] text-[#5C5C5C]">
        No email?{' '}
        <button type="button" onClick={resend} className="font-semibold text-[#B84A0B] hover:underline">
          Send a new code
        </button>
        {' · '}
        <Link href="/login" className="font-semibold text-[#B84A0B] hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ResetForm />
    </Suspense>
  )
}
