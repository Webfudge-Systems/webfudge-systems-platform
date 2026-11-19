'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { Avatar } from '@webfudge/ui'
import { useHub, initials } from '../../components/saas/HubShell'
import { Alert, Badge, Button, Card, PageFrame, PasswordInput, TextInput } from '../../components/saas/console'
import { api } from '../../lib/saas'

export default function ProfilePage() {
  const router = useRouter()
  const { user, reload, currentOrg: org } = useHub()
  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || 'Your account'
  const { setUser, establishSession, logout, organizations } = useAuth()
  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' })
  const [profileMsg, setProfileMsg] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [pwErrors, setPwErrors] = useState({})
  const [pwMsg, setPwMsg] = useState(null)
  const [savingPw, setSavingPw] = useState(false)

  const saveProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    setProfileMsg(null)
    try {
      const res = await api('/api/auth/profile', { method: 'PUT', body: profile })
      setUser((u) => ({ ...(u || {}), ...res.user }))
      await reload()
      setProfileMsg({ tone: 'success', text: 'Profile saved.' })
    } catch (err) {
      setProfileMsg({ tone: 'error', text: err.message })
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    setPwErrors({})
    setPwMsg(null)
    if (pw.newPassword.length < 8 || !/[A-Za-z]/.test(pw.newPassword) || !/\d/.test(pw.newPassword)) {
      return setPwErrors({ newPassword: 'Use at least 8 characters, with letters and numbers.' })
    }
    setSavingPw(true)
    try {
      const res = await api('/api/auth/password/change', { method: 'POST', body: pw })
      establishSession({ jwt: res.jwt, user, organizations })
      setPw({ currentPassword: '', newPassword: '' })
      setPwMsg({ tone: 'success', text: 'Password changed.' })
    } catch (err) {
      if (err.field) setPwErrors({ [err.field]: err.message })
      else setPwMsg({ tone: 'error', text: err.message })
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <PageFrame title="View Profile" subtitle="Your account details, password and sign-in" breadcrumb={[{ label: 'Profile', href: '/profile' }]}>
      <div className="flex flex-col gap-4 overflow-hidden rounded-xl border border-gray-200/80 bg-gradient-to-br from-orange-50 via-white to-orange-50/40 p-6 shadow-sm sm:flex-row sm:items-center sm:gap-5">
        <Avatar
          fallback={initials(displayName)}
          alt={displayName}
          size="xl"
          className="border-2 border-white bg-gradient-to-br from-orange-500 to-orange-600 text-lg font-bold text-white shadow-lg"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-xl font-semibold text-gray-900">{displayName}</h2>
          <p className="mt-0.5 truncate text-sm text-gray-500">{user?.email}</p>
          {org && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="green">{org.role}</Badge>
              <span className="text-sm text-gray-400">•</span>
              <span className="truncate text-sm font-medium text-gray-800">{org.name}</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Your details" subtitle="Name and mobile shown to your team">
          {profileMsg && <Alert tone={profileMsg.tone} className="mb-4">{profileMsg.text}</Alert>}
          <form onSubmit={saveProfile} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="First name" autoComplete="given-name" value={profile.firstName} onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))} />
              <TextInput label="Last name" autoComplete="family-name" value={profile.lastName} onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <TextInput label="Email" value={user?.email || ''} disabled readOnly hint="Contact support to change the email on your account." />
            <TextInput label="Mobile" optional type="tel" autoComplete="tel" value={profile.phone} onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
            <Button type="submit" loading={savingProfile}>Save details</Button>
          </form>
        </Card>

        <Card title="Password" subtitle="Changing it signs out your other sessions">
          {pwMsg && <Alert tone={pwMsg.tone} className="mb-4">{pwMsg.text}</Alert>}
          <form onSubmit={changePassword} noValidate className="space-y-4">
            <PasswordInput label="Current password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} error={pwErrors.currentPassword} />
            <PasswordInput label="New password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} error={pwErrors.newPassword} hint="At least 8 characters, with letters and numbers." />
            <Button type="submit" loading={savingPw}>Change password</Button>
          </form>
        </Card>
      </div>

      <Card title="Sign out" subtitle="Signs you out of Webfudge Accounts, CRM and Projects on this browser.">
        <Button variant="outline" onClick={() => { logout(); router.replace('/login') }}>Sign out</Button>
      </Card>
    </PageFrame>
  )
}
