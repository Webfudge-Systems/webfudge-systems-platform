'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowRight, Building2, Clock, CreditCard, Grid3X3, Lock, Mail, Plus, Users } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import { useAuth } from '@webfudge/auth'
import { useHub, orgColor, initials } from '../../components/saas/HubShell'
import InviteRows from '../../components/saas/InviteRows'
import { Alert, AppIcon, Badge, Button, Card, LoadingBlock, Modal, PageFrame } from '../../components/saas/console'
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
  const danger = locked || readOnly
  return (
    <section
      aria-label="Plan status"
      className={`flex flex-wrap items-center gap-4 rounded-xl border px-4 py-4 sm:px-5 ${danger ? 'border-red-200 bg-red-50' : 'border-orange-200 bg-orange-50'}`}
    >
      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white ${danger ? 'text-red-600' : 'text-orange-600'}`}>
        {locked ? <Lock className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
      </span>
      <div className="min-w-[220px] flex-1">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-sm text-gray-600">{isAdmin ? body : `${body.split('.')[0]}. Ask an admin of your organization to choose a plan.`}</p>
      </div>
      {isAdmin && (
        <Link href={`/billing?app=${app.slug}`} className="inline-flex min-h-[40px] items-center rounded-lg bg-orange-500 px-4 text-sm font-medium text-white shadow-md hover:bg-orange-600">
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
      <p className="mb-5 text-sm text-gray-600">They’ll get an email with a link to join. Invitations expire after 7 days.</p>
      {error && <Alert className="mb-4">{error}</Alert>}
      <InviteRows rows={rows} setRows={setRows} disabled={busy} />
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={send} loading={busy}>Send invitations</Button>
      </div>
    </Modal>
  )
}

function AppCard({ app, org }) {
  const meta = APP_META[app.slug]
  const status = appStatus(app)
  const href = openAppUrl(app.slug, org.id)
  const trialPct = app.state === 'trial' ? Math.min(100, Math.round(((14 - app.daysLeft) / 14) * 100)) : null
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <AppIcon src={meta.icon} size={44} tint={meta.tint} />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">{meta.name}</h3>
          <p className="text-xs text-gray-500">{PLAN_LABEL[app.planCode] || 'Plan'}</p>
        </div>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      {trialPct !== null && (
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full bg-orange-500" style={{ width: `${trialPct}%` }} />
        </div>
      )}
      <p className="text-sm text-gray-600">{appMeta(app)}</p>
      <div className="mt-auto flex gap-2">
        {app.access === 'locked' ? (
          <Link href={`/billing?app=${app.slug}`} className="flex min-h-[40px] flex-1 items-center justify-center rounded-lg bg-orange-500 text-sm font-medium text-white shadow-md hover:bg-orange-600">
            Unlock
          </Link>
        ) : (
          <a href={href} className="flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-orange-500 text-sm font-medium text-white shadow-md hover:bg-orange-600">
            Open {meta.name} <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
        {org.isAdmin && (
          <Link href={`/billing?app=${app.slug}`} className="flex min-h-[40px] items-center rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50">
            Manage
          </Link>
        )}
      </div>
    </article>
  )
}

function HomeContent() {
  const params = useSearchParams()
  const { home, error, reload, orgs, currentOrg: org, user } = useHub()
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

  const header = {
    title: `${greeting()}, ${user?.firstName || 'there'}`,
    subtitle: org ? `${org.name} · ${org.role}` : 'Your apps, organizations and invitations.',
    breadcrumb: [{ label: 'Home', href: '/home' }],
    showBack: false,
  }

  if (!home || !org) {
    return (
      <PageFrame {...header}>
        {error ? (
          <Alert>
            {error}{' '}
            <button type="button" onClick={reload} className="font-semibold underline">Try again</button>
          </Alert>
        ) : (
          <LoadingBlock />
        )}
      </PageFrame>
    )
  }

  const apps = org.apps.filter((a) => APP_META[a.slug])
  const urgent = urgentApp(apps)
  const paid = apps.filter((a) => a.state === 'active' && a.planCode !== 'free' && a.endsAt).sort((a, b) => new Date(a.endsAt) - new Date(b.endsAt))
  const trials = apps.filter((a) => a.state === 'trial')

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

  const kpis = [
    { title: 'Apps', value: apps.length, subtitle: trials.length ? `${trials.length} on free trial` : 'Subscribed to this organization', icon: Grid3X3 },
    { title: 'Members', value: org.memberCount, subtitle: 'People in this organization', icon: Users },
    { title: 'Pending invites', value: org.isAdmin ? pending.length : '—', subtitle: org.isAdmin ? 'Awaiting acceptance' : 'Visible to admins', icon: Mail },
    { title: 'Next renewal', value: paid.length ? formatDate(paid[0].endsAt) : '—', subtitle: paid.length ? `${APP_META[paid[0].slug]?.name} · ${PLAN_LABEL[paid[0].planCode]}` : 'No paid plans yet', icon: CreditCard },
  ]

  return (
    <PageFrame {...header}>
      {notice && <Alert tone="success">{notice}</Alert>}
      {urgent && <UrgentBanner app={urgent} isAdmin={org.isAdmin} />}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <KPICard key={k.title} title={k.title} value={k.value} subtitle={k.subtitle} icon={k.icon} colorScheme="orange" />
        ))}
      </div>

      <Card
        title="Your apps"
        subtitle="Open an app or manage its plan"
        actions={
          org.isAdmin ? (
            <Button size="sm" onClick={() => setInviteOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" /> Invite people
            </Button>
          ) : null
        }
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard key={app.slug} app={app} org={org} />
          ))}
          <article className="flex flex-col justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white/60 p-4">
            <h3 className="font-semibold text-gray-900">{apps.length ? 'Add an app' : 'Start with an app'}</h3>
            <p className="text-sm text-gray-600">CRM and Projects are ready to try. Books and HR are coming soon.</p>
            {org.isAdmin ? (
              <Link href="/billing" className="text-sm font-medium text-orange-600 hover:underline">
                Browse apps →
              </Link>
            ) : (
              <p className="text-xs text-gray-500">Ask an admin to add apps.</p>
            )}
          </article>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          title="Your organizations"
          subtitle="Switch workspace or create a new one"
          actions={
            <Link href="/setup/organization" className="inline-flex items-center gap-1 text-sm font-medium text-orange-600 hover:underline">
              <Plus className="h-4 w-4" aria-hidden="true" /> New
            </Link>
          }
        >
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white/80">
            {orgs.map((o) => (
              <li key={o.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white" style={{ background: orgColor(o.id) }}>
                  {initials(o.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">{o.name}</p>
                  <p className="truncate text-xs capitalize text-gray-500">
                    {o.role} · {o.apps.length ? o.apps.map((a) => APP_META[a.slug]?.name || a.name).join(', ') : 'No apps yet'}
                  </p>
                </div>
                {o.id === org.id ? (
                  <Badge tone="green">Current</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (switchOrg(o.id)) window.location.reload()
                    }}
                  >
                    Switch
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Invitations" subtitle="Organizations that invited you" actions={<Building2 className="h-5 w-5 text-gray-500" />}>
          {home.invitations.length === 0 ? (
            <p className="text-sm text-gray-600">No invitations waiting for you.</p>
          ) : (
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white/80">
              {home.invitations.map((inv) => (
                <li key={inv.token} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-[180px] flex-1">
                    <p className="text-sm font-medium text-gray-900">{inv.organization.name}</p>
                    <p className="text-xs text-gray-500">
                      {inv.invitedBy ? `${inv.invitedBy} invited you` : 'You’re invited'} as {inv.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" loading={busyToken === inv.token} onClick={() => respond(inv.token, 'accept')}>
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
    </PageFrame>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  )
}
