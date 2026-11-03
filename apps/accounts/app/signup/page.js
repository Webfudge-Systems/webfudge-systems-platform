'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import AuthLayout from '../../components/saas/AuthLayout'
import { Alert, Button, FullPageSpinner, PasswordInput, TextInput } from '../../components/saas/ui'
import { api, IS_SAAS, SIGNUP_STEPS, WEBSITE_URL } from '../../lib/saas'


function SignupForm() {
  const router = useRouter()
  const params = useSearchParams()
  const next = params.get('next') || ''
  const { isAuthenticated, loading } = useAuth()
  const [form, setForm] = useState({ firstName: '', lastName: '', email: params.get('email') || '', password: '', phone: '' })
  const [agreed, setAgreed] = useState(false)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [emailTaken, setEmailTaken] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!IS_SAAS) router.replace('/login')
    else if (!loading && isAuthenticated) router.replace('/home')
  }, [loading, isAuthenticated, router])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((er) => ({ ...er, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.firstName.trim()) e.firstName = 'Enter your name.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Enter a valid work email.'
    if (form.password.length < 8) e.password = 'Use at least 8 characters.'
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) e.password = 'Use a mix of letters and numbers.'
    if (form.phone && form.phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a 10-digit mobile number, or leave it empty.'
    if (!agreed) e.agreed = 'Please accept the terms to continue.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    setFormError('')
    setEmailTaken(false)
    if (!validate()) return
    setSubmitting(true)
    try {
      const phone = form.phone.replace(/\D/g, '')
      const res = await api('/api/auth/signup', {
        method: 'POST',
        auth: false,
        body: { ...form, email: form.email.trim(), phone: phone ? `+91${phone.slice(-10)}` : '' },
      })
      const query = new URLSearchParams({ email: res.email })
      if (next) query.set('next', next)
      router.push(`/verify?${query}`)
    } catch (e) {
      if (e.code === 'EMAIL_TAKEN') setEmailTaken(true)
      else if (e.field) setErrors((er) => ({ ...er, [e.field]: e.message }))
      else setFormError(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      steps={SIGNUP_STEPS}
      current={0}
      topRight={
        <p className="text-sm text-[#5C5C5C]">
          Have an account?{' '}
          <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-[#B84A0B] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">Create your Webfudge account</h1>
      <p className="mb-7 mt-2 text-[17px] text-[#5C5C5C]">One sign-in for CRM, Projects and every app you add later.</p>

      {formError && <Alert className="mb-5">{formError}</Alert>}
      {emailTaken && (
        <Alert tone="warn" className="mb-5">
          An account with this email already exists.{' '}
          <Link className="font-semibold underline" href={`/login?email=${encodeURIComponent(form.email.trim())}`}>
            Sign in instead
          </Link>{' '}
          or{' '}
          <Link className="font-semibold underline" href={`/forgot-password?email=${encodeURIComponent(form.email.trim())}`}>
            reset your password
          </Link>
          .
        </Alert>
      )}

      <form onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="First name" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} error={errors.firstName} placeholder="Riya" />
          <TextInput label="Last name" optional autoComplete="family-name" value={form.lastName} onChange={set('lastName')} placeholder="Sharma" />
        </div>
        <TextInput label="Work email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@company.com" />
        <PasswordInput autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters, with letters and numbers." placeholder="Create a password" />
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-sm font-semibold">
            Mobile <span className="font-normal text-[#5C5C5C]">(optional)</span>
          </label>
          <div className="flex gap-2">
            <span className="flex min-h-[48px] items-center rounded-xl border border-[#DCDCD8] bg-[#F4F4F2] px-3.5 text-[15px]">+91</span>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={form.phone}
              onChange={set('phone')}
              placeholder="98765 43210"
              className={`min-h-[48px] w-full rounded-xl border bg-white px-3.5 text-[15px] outline-none focus:border-[#F5630F] focus:ring-4 focus:ring-[#F5630F]/15 ${errors.phone ? 'border-[#E5484D]' : 'border-[#DCDCD8]'}`}
            />
          </div>
          {errors.phone && <p className="mt-1.5 text-[13px] text-[#B42318]">{errors.phone}</p>}
        </div>
        <div>
          <label className="flex items-start gap-3 text-sm leading-relaxed text-[#5C5C5C]">
            <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setErrors((er) => ({ ...er, agreed: undefined })) }} className="mt-1 h-4 w-4 accent-[#F5630F]" />
            <span>
              I agree to the{' '}
              <a href={`${WEBSITE_URL}/legal/terms`} target="_blank" rel="noreferrer" className="font-semibold text-[#B84A0B] hover:underline">Terms of Service</a>{' '}
              and{' '}
              <a href={`${WEBSITE_URL}/legal/privacy`} target="_blank" rel="noreferrer" className="font-semibold text-[#B84A0B] hover:underline">Privacy Policy</a>.
            </span>
          </label>
          {errors.agreed && <p className="mt-1.5 text-[13px] text-[#B42318]">{errors.agreed}</p>}
        </div>
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full !rounded-xl">
          Create account
        </Button>
      </form>
    </AuthLayout>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <SignupForm />
    </Suspense>
  )
}
