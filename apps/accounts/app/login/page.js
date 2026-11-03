'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import AuthLayout from '../../components/saas/AuthLayout'
import { Alert, Button, FullPageSpinner, PasswordInput, TextInput } from '../../components/saas/ui'
import { api, goTo, IS_SAAS, postSignInTarget } from '../../lib/saas'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || ''
  const { establishSession, isAuthenticated, loading, organizations } = useAuth()
  const [email, setEmail] = useState(params.get('email') || '')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && isAuthenticated && !submitting) goTo(router, postSignInTarget(organizations, next))
  }, [loading, isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    const e = {}
    if (!email.trim()) e.email = 'Enter your email.'
    if (!password) e.password = 'Enter your password.'
    setErrors(e)
    if (Object.keys(e).length) return
    setSubmitting(true)
    try {
      const session = await api('/api/auth/login', { method: 'POST', auth: false, body: { identifier: email.trim(), password } })
      establishSession(session)
      goTo(router, postSignInTarget(session.organizations, next))
    } catch (err) {
      if (err.code === 'EMAIL_NOT_VERIFIED') {
        const query = new URLSearchParams({ email: err.details.email || email.trim() })
        if (next) query.set('next', next)
        router.push(`/verify?${query}`)
        return
      }
      setFormError(err.message === 'Invalid credentials' ? 'That email and password don’t match. Try again or reset your password.' : err.message)
      setSubmitting(false)
    }
  }

  if (loading) return <FullPageSpinner />

  return (
    <AuthLayout
      topRight={
        IS_SAAS ? (
          <p className="text-sm text-[#5C5C5C]">
            New to Webfudge?{' '}
            <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-[#B84A0B] hover:underline">
              Create an account
            </Link>
          </p>
        ) : null
      }
    >
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">Welcome back</h1>
      <p className="mb-7 mt-2 text-[17px] text-[#5C5C5C]">Sign in to Webfudge to open your apps.</p>

      {formError && <Alert className="mb-5">{formError}</Alert>}

      <form onSubmit={submit} noValidate className="space-y-4">
        <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} placeholder="you@company.com" autoFocus />
        <div>
          <PasswordInput autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} placeholder="Your password" />
          <p className="mt-2 text-right text-sm">
            <Link href={`/forgot-password${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`} className="font-semibold text-[#B84A0B] hover:underline">
              Forgot password?
            </Link>
          </p>
        </div>
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full !rounded-xl">
          Sign in
        </Button>
      </form>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <LoginForm />
    </Suspense>
  )
}
