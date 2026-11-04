'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Clock, Lock, Plus, Users, CreditCard } from 'lucide-react'
import { useAuth } from '@webfudge/auth'
import { useHub, orgColor, initials } from '../../components/saas/HubShell'
import InviteRows from '../../components/saas/InviteRows'
import { Alert, AppIcon, Badge, Button, Card, Modal } from '../../components/saas/ui'
import { api, APP_META, formatDate, openAppUrl } from '../../lib/saas'
import { appMeta, appStatus, PLAN_LABEL } from '../../components/saas/appStatus'

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

/** The most urgent thing about the organization's apps, if anything. */
function urgentApp(apps) {
  const order = (a) => (a.access === 'locked' ? 0 : a.access === 'read_only' ? 1 : a.state === 'trial' ? 2 + a.daysLeft : 99)
  const sorted = [...apps].sort((a, b) => order(a) - order(b))
  const top = sorted[0]
  if (!top || order(top) > 2 + 7) return null
  return top
}

function UrgentBanner({ app, isAdmin }) {
  const name = APP_META[app.slug]?.name || app.name
  const locked = app.access === 'locked'
  const readOnly = app.access === 'read_only'
  const title = locked
    ? `${name} is locked`
    : readOnly
      ? `Your ${name} trial has ended — it’s read-only now`
      : `Your ${name} trial ends in ${app.daysLeft} day${app.daysLeft === 1 ? '' : 's'}, on ${formatDate(app.endsAt)}`
  const body = locked
    ? `Your data is safe until ${formatDate(app.deleteAfter)}. Choose a plan to unlock it.`
    : readOnly
      ? `You can still see everything until ${formatDate(app.lockAt)}. Choose a plan to keep working.`
      : 'Choose a plan to keep your data and your team’s access. Nothing is deleted if you wait.'
  return (
    <section aria-label="Plan status" className="flex flex-wrap items-center gap-4 rounded-3xl bg-[#0F0F0F] px-5 py-5 text-white sm:px-6">
      <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#2A2A2A] text-[#FF9A5C]">
        {locked ? <Lock className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
      </span>
      <div className="min-w-[220px] flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-sm text-[#BDBDBD]">{isAdmin ? body : `${body.split('.')[0]}. Ask an admin of your organization to choose a plan.`}</p>
      </div>
      {isAdmin && (
        <Link href={`/billing?app=${app.slug}`} className="inline-flex min-h-[44px] items-center rounded-full bg-[#F5630F] px-5 text-[15px] font-semibold text-[#0F0F0F]">
          Choose a plan
        </Link>
      )}
    </section>
  )
}

function InviteModal({ org, open, onClose, onSent }) {
  const [rows, setRows] = useState([{ email: '', role: 'member' }])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const send = async () => {
    const invites = rows.filter((r) => r.email.trim())
    if (!invites.length) return setError('Add at least one email address.')
    setBusy(true)
    setError('')
    try {
      const res = await api(`/api/saas/organizations/${org.id}/invitations`, { method: 'POST', body: { invites } })
      onSent(res)
      setRows([{ email: '', role: 'member' }])
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal open={open} onClose={onClose} title={`Invite people to ${org.name}`}>
      <p className="mb-5 text-[15px] text-[#5C5C5C]">They’ll get an email with a link to join. Invitations expire after 7 days.</p>
      {error && <Alert className="mb-4">{error}</Alert>}
      <InviteRows rows={rows} setRows={setRows} disabled={busy} />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="dark" onClick={send} loading={busy}>Send invitations</Button>
      </div>
    </Modal>
  )
}

function HomeContent() {
  const params = useSearchParams()
  const { home, reload, orgs, currentOrg: org, user } = useHub()
  const { switchOrg, refreshSession } = useAuth()
  const [inviteOpen, setInviteOpen] = useState(false)
  const [notice, setNotice] = useState(params.get('welcome') ? 'Your workspace is ready. Open an app to get started.' : '')
  const [busyToken, setBusyToken] = useState('')
  const [pending, setPending] = useState([])

  useEffect(() => {
    if (!org?.isAdmin) return setPending([])
    api(`/api/saas/organizations/${org.id}/invitations`)
      .then((d) => setPending(d.invitations))
      .catch(() => setPending([]))
  }, [org?.id, org?.isAdmin])

  if (!org) return null

  const apps = org.apps.filter((a) => APP_META[a.slug])
  const urgent = urgentApp(apps)
  const paid = apps.filter((a) => a.state === 'active' && a.planCode !== 'free' && a.endsAt).sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))

  const respond = async (token, action) => {
    setBusyToken(token)
    try {
      const res = await api(`/api/saas/invitations/${token}/${action}`, { method: 'POST' })
      if (action === 'accept') {
        await refreshSession()
        switchOrg(res.organizationId)
        setNotice('You joined the organization.')
      }
      await reload()
    } catch (e) {
      setNotice(e.message)
    } finally {
      setBusyToken('')
    }
  }

  return (
    <div className="space-y-6">
      {notice && <Alert tone="success">{notice}</Alert>}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] text-[#5C5C5C]">
            {org.name} · {org.role}
          </p>
          <h1 className="mt-1 text-[32px] font-medium tracking-[-0.03em] sm:text-[38px]">
            {greeting()}, {user?.firstName || 'there'}
          </h1>
        </div>
        {org.isAdmin && (
          <Button variant="dark" onClick={() => setInviteOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Invite people
          </Button>
        )}
      </div>

      {urgent && <UrgentBanner app={urgent} isAdmin={org.isAdmin} />}

      <section aria-labelledby="apps-h">
        <h2 id="apps-h" className="mb-3 text-xl font-semibold">Your apps</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const meta = APP_META[app.slug]
            const status = appStatus(app)
            const href = openAppUrl(app.slug, org.id)
            const trialPct = app.state === 'trial' ? Math.min(100, Math.round(((14 - app.daysLeft) / 14) * 100)) : null
            return (
              <article key={app.slug} className="flex flex-col gap-4 rounded-3xl border border-[#EDEDEA] bg-white p-5">
                <div className="flex items-center gap-3">
                  <AppIcon src={meta.icon} size={52} tint={meta.tint} />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold">{meta.name}</h3>
                    <p className="text-[13px] text-[#5C5C5C]">{PLAN_LABEL[app.planCode] || 'Plan'}</p>
                  </div>
                  <Badge tone={status.tone}>{status.label}</Badge>
                </div>
                {trialPct !== null && (
                  <div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#F4F4F2]">
                      <div className="h-full bg-[#F5630F]" style={{ width: `${trialPct}%` }} />
                    </div>
                  </div>
                )}
                <p className="text-sm text-[#5C5C5C]">{appMeta(app)}</p>
                <div className="mt-auto flex gap-2">
                  {app.access === 'locked' ? (
                    <Link href={`/billing?app=${app.slug}`} className="flex min-h-[44px] flex-1 items-center justify-center rounded-full bg-[#0F0F0F] text-[15px] font-semibold text-white">
                      Unlock
                    </Link>
                  ) : (
                    <a href={href} className="flex min-h-[44px] flex-1 items-center justify-center rounded-full text-[15px] font-semibold" style={{ background: meta.tint, color: '#0F0F0F' }}>
                      Open {meta.name}
                    </a>
                  )}
                  {org.isAdmin && (
                    <Link href={`/billing?app=${app.slug}`} className="flex min-h-[44px] items-center rounded-full border border-[#EDEDEA] px-4 text-[15px] font-medium hover:bg-[#F4F4F2]">
                      Manage
                    </Link>
                  )}
                </div>
              </article>
            )
          })}
          <article className="flex flex-col justify-center gap-3 rounded-3xl border-[1.5px] border-dashed border-[#DCDCD8] p-5">
            <h3 className="text-lg font-semibold">{apps.length ? 'Add an app' : 'Start with an app'}</h3>
            <p className="text-sm text-[#5C5C5C]">CRM and Projects are ready to try. Books and HR are coming soon.</p>
            {org.isAdmin ? (
              <Link href="/billing" className="text-[15px] font-semibold text-[#B84A0B] hover:underline">
                Browse apps →
              </Link>
            ) : (
              <p className="text-[13px] text-[#5C5C5C]">Ask an admin to add apps.</p>
            )}
          </article>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your organizations</h2>
            <Link href="/setup/organization" className="text-sm font-semibold text-[#B84A0B] hover:underline">
              + New
            </Link>
          </div>
          <ul>
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center gap-3 border-t border-[#F1F1EE] py-3 first:border-t-0">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white" style={{ background: orgColor(o.id) }}>
                  {initials(o.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{o.name}</p>
                  <p className="text-[13px] text-[#5C5C5C]">
                    {o.role} · {o.apps.length ? o.apps.map((a) => APP_META[a.slug]?.name || a.name).join(', ') : 'No apps yet'}
                  </p>
                </div>
                {o.id === org.id ? (
                  <Badge tone="green">Current</Badge>
                ) : (
                  <button type="button" onClick={() => switchOrg(o.id)} className="min-h-[40px] rounded-full px-3 text-sm font-semibold text-[#B84A0B] hover:bg-[#FFF1E8]">
                    Switch
                  </button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h2 className="mb-2 text-lg font-semibold">Invitations</h2>
          {home.invitations.length === 0 ? (
            <p className="py-3 text-sm text-[#5C5C5C]">No invitations waiting for you.</p>
          ) : (
            <ul>
              {home.invitations.map((inv) => (
                <li key={inv.token} className="flex flex-wrap items-center gap-3 border-t border-[#F1F1EE] py-3 first:border-t-0">
                  <div className="min-w-[180px] flex-1">
                    <p className="font-semibold">{inv.organization.name}</p>
                    <p className="text-[13px] text-[#5C5C5C]">
                      {inv.invitedBy ? `${inv.invitedBy} invited you` : 'You’re invited'} as {inv.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="dark" loading={busyToken === inv.token} onClick={() => respond(inv.token, 'accept')}>
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyToken === inv.token} onClick={() => respond(inv.token, 'decline')}>
                      Decline
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {org.isAdmin && (
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Billing</h2>
              <Link href="/billing" className="text-sm font-semibold text-[#B84A0B] hover:underline">
                Apps & billing →
              </Link>
            </div>
            {paid.length ? (
              <>
                <p className="text-[13px] text-[#5C5C5C]">Next renewal</p>
                <p className="mt-0.5 text-2xl font-semibold">{formatDate(paid[0].endsAt)}</p>
                <p className="mt-1 text-sm text-[#5C5C5C]">
                  {APP_META[paid[0].slug]?.name} · {PLAN_LABEL[paid[0].planCode]} · {paid[0].users} users
                </p>
              </>
            ) : (
              <div className="flex items-start gap-3 rounded-2xl bg-[#FAFAF8] p-4">
                <CreditCard className="mt-0.5 h-5 w-5 text-[#5C5C5C]" aria-hidden="true" />
                <p className="text-sm text-[#3A3A3A]">No paid plans yet. Trials and the Free plan don’t need a payment method.</p>
              </div>
            )}
          </Card>
        )}

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Team</h2>
            <Link href="/users" className="text-sm font-semibold text-[#B84A0B] hover:underline">
              Members →
            </Link>
          </div>
          <div className="flex flex-wrap gap-8">
            <div>
              <p className="text-3xl font-semibold">{org.memberCount}</p>
              <p className="text-[13px] text-[#5C5C5C]">Members</p>
            </div>
            {org.isAdmin && (
              <div>
                <p className="text-3xl font-semibold">{pending.length}</p>
                <p className="text-[13px] text-[#5C5C5C]">Pending invitations</p>
              </div>
            )}
          </div>
          {org.isAdmin && (
            <button type="button" onClick={() => setInviteOpen(true)} className="mt-4 inline-flex min-h-[44px] items-center gap-2 text-[15px] font-semibold text-[#B84A0B] hover:underline">
              <Users className="h-4 w-4" aria-hidden="true" /> Invite people
            </button>
          )}
        </Card>
      </div>

      {org.isAdmin && (
        <InviteModal
          org={org}
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          onSent={(res) => {
            setNotice(`Sent ${res.sent} invitation${res.sent === 1 ? '' : 's'}.${res.skipped?.length ? ` ${res.skipped.length} already in the organization.` : ''}`)
            api(`/api/saas/organizations/${org.id}/invitations`).then((d) => setPending(d.invitations)).catch(() => {})
          }}
        />
      )}
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
