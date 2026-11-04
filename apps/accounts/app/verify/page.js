'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail } from 'lucide-react'
import { useAuth } from '@webfudge/auth'
import AuthLayout from '../../components/saas/AuthLayout'
import { Alert, Button, CodeInput, FullPageSpinner } from '../../components/saas/ui'
import { api, goTo, postSignInTarget, SIGNUP_STEPS } from '../../lib/saas'

function useCountdown(seconds) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    if (left <= 0) return
    const t = setTimeout(() => setLeft((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [left])
  return [left, setLeft]
}

function VerifyForm() {
  const router = useRouter()
  const params = useSearchParams()
  const email = params.get('email') || ''
  const next = params.get('next') || ''
  const { establishSession } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [left, setLeft] = useCountdown(45)

  useEffect(() => {
    if (!email) router.replace('/signup')
  }, [email, router])

  const verify = async (value = code) => {
    if (value.length !== 6) {
      setError('Enter all 6 digits.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const session = await api('/api/auth/verify-email', { method: 'POST', auth: false, body: { email, code: value } })
      establishSession(session)
      goTo(router, postSignInTarget(session.organizations, next))
    } catch (e) {
      setError(e.message)
      setCode('')
      setSubmitting(false)
    }
  }

  const resend = async () => {
    setResending(true)
    setError('')
    setNotice('')
    try {
      await api('/api/auth/resend-code', { method: 'POST', auth: false, body: { email, purpose: 'verify_email' } })
      setNotice('We sent a new code. Check your inbox and spam folder.')
      setLeft(45)
    } catch (e) {
      setError(e.message)
      if (e.details?.retryAfter) setLeft(e.details.retryAfter)
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthLayout steps={SIGNUP_STEPS} current={1}>
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF1E8] text-[#B84A0B]">
        <Mail className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">Check your inbox</h1>
      <p className="mb-7 mt-2 text-[17px] leading-relaxed text-[#5C5C5C]">
        We sent a 6-digit code to <strong className="break-all font-semibold text-[#0F0F0F]">{email}</strong>. It expires in 10 minutes.
      </p>

      {error && <Alert className="mb-5">{error}</Alert>}
      {notice && <Alert tone="success" className="mb-5">{notice}</Alert>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          verify()
        }}
      >
        <CodeInput value={code} onChange={(v) => { setCode(v); setError('') }} onComplete={verify} disabled={submitting} error={Boolean(error)} />
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="mt-6 w-full !rounded-xl">
          Verify email
        </Button>
      </form>

      <p className="mt-6 text-[15px] text-[#5C5C5C]">
        Didn’t get it?{' '}
        {left > 0 ? (
          <span>You can ask for a new code in {left}s.</span>
        ) : (
          <button type="button" onClick={resend} disabled={resending} className="font-semibold text-[#B84A0B] hover:underline disabled:opacity-60">
            {resending ? 'Sending…' : 'Send a new code'}
          </button>
        )}
        {' · '}
        <Link href={`/signup?email=${encodeURIComponent(email)}`} className="font-semibold text-[#B84A0B] hover:underline">
          Change email
        </Link>
      </p>
    </AuthLayout>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <VerifyForm />
    </Suspense>
  )
}
