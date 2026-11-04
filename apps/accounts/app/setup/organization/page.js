'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import AuthLayout from '../../../components/saas/AuthLayout'
import { Alert, Button, FullPageSpinner, SelectInput, TextInput } from '../../../components/saas/ui'
import { api, INDUSTRIES, IS_SAAS, SIGNUP_STEPS, TEAM_SIZES } from '../../../lib/saas'

export default function SetupOrganizationPage() {
  const router = useRouter()
  const { isAuthenticated, loading, organizations, refreshSession, switchOrg, logout } = useAuth()
  const [name, setName] = useState('')
  const [industry, setIndustry] = useState('')
  const [size, setSize] = useState('size_1_10')
  const [error, setError] = useState('')
  const [nameError, setNameError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const firstOrg = organizations.length === 0

  useEffect(() => {
    if (!IS_SAAS) router.replace('/')
    else if (!loading && !isAuthenticated) router.replace('/login?next=/setup/organization')
  }, [loading, isAuthenticated, router])

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (name.trim().length < 2) return setNameError('Enter your company or team name.')
    setSubmitting(true)
    try {
      const { organization } = await api('/api/saas/organizations', { method: 'POST', body: { name: name.trim(), industry, size } })
      await refreshSession()
      switchOrg(organization.id)
      router.push(`/setup/apps?org=${organization.id}`)
    } catch (e) {
      if (e.field === 'name') setNameError(e.message)
      else setError(e.message)
      setSubmitting(false)
    }
  }

  if (loading || !isAuthenticated) return <FullPageSpinner />

  return (
    <AuthLayout
      steps={firstOrg ? SIGNUP_STEPS : null}
      current={2}
      topRight={
        firstOrg ? (
          <button type="button" onClick={() => { logout(); router.replace('/login') }} className="text-sm font-semibold text-[#5C5C5C] hover:text-[#0F0F0F]">
            Sign out
          </button>
        ) : (
          <button type="button" onClick={() => router.back()} className="text-sm font-semibold text-[#5C5C5C] hover:text-[#0F0F0F]">
            Cancel
          </button>
        )
      }
    >
      <h1 className="text-[34px] font-medium leading-tight tracking-[-0.03em]">{firstOrg ? 'Name your organization' : 'Create another organization'}</h1>
      <p className="mb-7 mt-2 text-[17px] leading-relaxed text-[#5C5C5C]">This is your company’s workspace. Your team, apps and billing live here.</p>
      {error && <Alert className="mb-5">{error}</Alert>}
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextInput label="Organization name" autoComplete="organization" value={name} onChange={(e) => { setName(e.target.value); setNameError('') }} error={nameError} placeholder="Northline Foods" maxLength={80} autoFocus />
        <SelectInput label="Industry" value={industry} onChange={(e) => setIndustry(e.target.value)} options={INDUSTRIES} placeholder="Choose your industry" />
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Team size</legend>
          <div role="radiogroup" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {TEAM_SIZES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={size === value}
                onClick={() => setSize(value)}
                className={`min-h-[48px] rounded-xl border text-[15px] font-semibold transition ${size === value ? 'border-[#0F0F0F] bg-[#0F0F0F] text-white' : 'border-[#DCDCD8] bg-white hover:bg-[#F4F4F2]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
        <Button type="submit" variant="primary" size="lg" loading={submitting} className="w-full !rounded-xl">
          Continue
        </Button>
      </form>
    </AuthLayout>
  )
}
