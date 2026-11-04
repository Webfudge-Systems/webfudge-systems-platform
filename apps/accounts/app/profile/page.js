'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@webfudge/auth'
import { useHub } from '../../components/saas/HubShell'
import { Alert, Button, Card, PasswordInput, TextInput } from '../../components/saas/ui'
import { api } from '../../lib/saas'

export default function ProfilePage() {
  const router = useRouter()
  const { user, reload } = useHub()
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
    <div className="space-y-6">
      <div>
        <p className="text-[15px] text-[#5C5C5C]">{user?.email}</p>
        <h1 className="mt-1 text-[32px] font-medium tracking-[-0.03em] sm:text-[38px]">Profile</h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-5 text-lg font-semibold">Your details</h2>
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

        <Card>
          <h2 className="mb-5 text-lg font-semibold">Password</h2>
          {pwMsg && <Alert tone={pwMsg.tone} className="mb-4">{pwMsg.text}</Alert>}
          <form onSubmit={changePassword} noValidate className="space-y-4">
            <PasswordInput label="Current password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} error={pwErrors.currentPassword} />
            <PasswordInput label="New password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} error={pwErrors.newPassword} hint="At least 8 characters, with letters and numbers." />
            <Button type="submit" loading={savingPw}>Change password</Button>
          </form>
        </Card>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">Sign out</h2>
        <p className="mb-4 mt-1 text-sm text-[#5C5C5C]">Signs you out of Webfudge Accounts, CRM and Projects on this browser.</p>
        <Button variant="outline" onClick={() => { logout(); router.replace('/login') }}>Sign out</Button>
      </Card>
    </div>
  )
}
