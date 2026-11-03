'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import AuthLayout from '../../components/saas/AuthLayout'
import { Alert, Button, FullPageSpinner, TextInput } from '../../components/saas/ui'
import { api } from '../../lib/saas'

function ForgotForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [email, setEmail] = useState(params.get('email') || '')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email you signed up with.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api('/api/auth/password/forgot', { method: 'POST', auth: false, body: { email: email.trim() } })
      router.push(`/reset-password?email=${encodeURIComponent(email.trim())}`)
    } catch (e) {
      setError(e.message)
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">Reset your password</h1>
      <p className="mb-7 mt-2 text-[17px] text-[#5C5C5C]">Enter your email and we’ll send you a 6-digit code.</p>
      {error && <Alert className="mb-5">{error}</Alert>}
      <form onSubmit={submit} noValidate className="space-y-4">
        <TextInput label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" autoFocus />
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full !rounded-xl">
          Send code
        </Button>
      </form>
      <p className="mt-6 text-[15px] text-[#5C5C5C]">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-[#B84A0B] hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <ForgotForm />
    </Suspense>
  )
}
