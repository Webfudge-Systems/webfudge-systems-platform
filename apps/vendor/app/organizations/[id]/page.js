'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { KPICard, LoadingSpinner, TabsWithActions, Table } from '@webfudge/ui'
import {
  IndianRupee,
  Users,
  Wallet,
  CalendarClock,
  Mail,
  Phone,
  Globe,
  Briefcase,
  UserRound,
  Ban,
  PlayCircle,
  CalendarPlus,
  Crown,
  ExternalLink,
} from 'lucide-react'
import VendorPageHeader from '../../../components/VendorPageHeader'
import {
  AccessDot,
  AppChip,
  ConfirmDialog,
  EmptyLine,
  ErrorState,
  OrgAvatar,
  PaymentBadge,
  Panel,
  Pill,
  RefreshButton,
  StageBadge,
  SubStateBadge,
} from '../../../components/VendorUI'
import vendorApi from '../../../lib/api'
import useVendorQuery from '../../../lib/useVendorQuery'
import {
  cycleLabel,
  formatDate,
  formatDateTime,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatRelative,
  industryLabel,
  PAYMENT_KIND,
  sizeLabel,
} from '../../../lib/format'

function InfoRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="truncate text-sm text-gray-900">{children || <span className="text-gray-400">—</span>}</div>
      </div>
    </div>
  )
}

function SubscriptionCard({ sub, onExtend }) {
  const canExtend = sub.planCode !== 'free' && !(sub.status === 'active' && sub.currentPeriodEnd) && sub.status !== 'suspended'
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <AppChip app={sub.app} />
          <p className="mt-1 text-xs text-gray-500">
            {sub.planName || '—'} · {cycleLabel(sub.billingCycle)} · {sub.users} seat{sub.users === 1 ? '' : 's'}
          </p>
        </div>
        <SubStateBadge state={sub.state} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-gray-500">MRR</dt>
          <dd className="font-semibold tabular-nums text-gray-900">{sub.mrr ? formatINR(sub.mrr) : '—'}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">Access</dt>
          <dd>
            <AccessDot access={sub.access} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">{sub.state === 'trial' ? 'Trial ends' : 'Period ends'}</dt>
          <dd className="text-gray-900">
            {formatDate(sub.endsAt || sub.currentPeriodEnd || sub.trialEndsAt)}
            {sub.daysLeft != null && sub.access === 'full' ? (
              <span className="ml-1 text-xs text-gray-500">({sub.daysLeft}d)</span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-500">{sub.lockAt && sub.access !== 'locked' ? 'Locks on' : 'Started'}</dt>
          <dd className="text-gray-900">{formatDate(sub.lockAt && sub.access !== 'locked' ? sub.lockAt : sub.startDate)}</dd>
        </div>
      </dl>
      {sub.cancelAtPeriodEnd ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">Set to cancel at the end of this period</p>
      ) : null}
      {canExtend ? (
        <button
          type="button"
          onClick={() => onExtend(sub)}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100"
        >
          <CalendarPlus className="h-4 w-4" />
          Extend trial
        </button>
      ) : null}
    </div>
  )
}

export default function OrganizationDetailPage() {
  const { id } = useParams()
  const { data, error, loading, refreshing, refresh } = useVendorQuery((opts) => vendorApi.organization(id, opts), [id])
  const [tab, setTab] = useState('apps')
  const [extending, setExtending] = useState(null)
  const [extendDays, setExtendDays] = useState(7)
  const [confirm, setConfirm] = useState(null)
  const [reason, setReason] = useState('')

  if (loading) {
    return (
      <div className="flex items-center justify-center p-24">
        <LoadingSpinner size="lg" message="Loading organization..." />
      </div>
    )
  }
  if (error || !data) {
    return (
      <div className="space-y-4 p-4 md:p-6">
        <VendorPageHeader title="Organization" breadcrumb={[{ label: 'Organizations', href: '/organizations' }]} />
        <ErrorState error={error || { message: 'Not found' }} onRetry={refresh} />
      </div>
    )
  }

  const { organization: org, subscriptions, payments, members, invitations } = data
  const paid = payments.filter((p) => p.status === 'paid')
  const isSuspended = org.stage === 'suspended'
  const address = org.address && typeof org.address === 'object' ? Object.values(org.address).filter(Boolean).join(', ') : org.address
  const pendingInvites = invitations.filter((i) => i.status === 'pending')

  const tabs = [
    { key: 'apps', label: 'Apps & plans', badge: String(subscriptions.length) },
    { key: 'members', label: 'Members', badge: String(members.length) },
    { key: 'payments', label: 'Payments', badge: String(payments.length) },
    { key: 'invitations', label: 'Invitations', badge: String(pendingInvites.length) },
  ]

  const memberColumns = [
    {
      key: 'name',
      label: 'Member',
      render: (_, m) => (
        <div className="flex items-center gap-3">
          <OrgAvatar name={m.name || m.email} id={m.id} size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-gray-900">
              {m.name || m.email}
              {m.isOwner ? <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="Owner" /> : null}
            </p>
            <p className="truncate text-xs text-gray-500">{m.email}</p>
          </div>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (v, m) => <span className="text-gray-700">{m.isOwner ? 'Owner' : v || 'Member'}</span> },
    {
      key: 'isActive',
      label: 'Status',
      render: (_, m) =>
        m.blocked ? (
          <Pill className="border-red-200 bg-red-50 text-red-700">Blocked</Pill>
        ) : m.isActive ? (
          <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">Active</Pill>
        ) : (
          <Pill className="border-gray-200 bg-gray-100 text-gray-600">Removed</Pill>
        ),
    },
    { key: 'joinedAt', label: 'Joined', render: (v) => <span className="text-gray-600">{formatDate(v)}</span> },
    { key: 'lastAccessAt', label: 'Last active', render: (v) => <span className="text-gray-600">{formatRelative(v)}</span> },
  ]

  const paymentColumns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice',
      render: (v, p) => (
        <div>
          <p className="text-sm font-semibold text-gray-900">{v || `Order #${p.id}`}</p>
          <p className="text-xs text-gray-500">{formatDateTime(p.paidAt || p.createdAt)}</p>
        </div>
      ),
    },
    { key: 'app', label: 'App', render: (v) => <AppChip app={v} /> },
    {
      key: 'kind',
      label: 'Type',
      render: (v, p) => (
        <span className="text-gray-700">
          {PAYMENT_KIND[v] || v} · {cycleLabel(p.billingCycle)} · {p.users} seats
        </span>
      ),
    },
    { key: 'subtotal', label: 'Net', render: (v) => <span className="tabular-nums text-gray-700">{formatINR(v, { precise: true })}</span> },
    { key: 'total', label: 'Total', render: (v) => <span className="font-semibold tabular-nums text-gray-900">{formatINR(v, { precise: true })}</span> },
    { key: 'status', label: 'Status', render: (v) => <PaymentBadge status={v} /> },
  ]

  const inviteColumns = [
    { key: 'email', label: 'Email', render: (v) => <span className="font-medium text-gray-900">{v}</span> },
    { key: 'role', label: 'Role', render: (v) => <span className="capitalize text-gray-700">{v || 'Member'}</span> },
    { key: 'status', label: 'Status', render: (v) => <span className="capitalize text-gray-700">{v}</span> },
    { key: 'createdAt', label: 'Sent', render: (v) => <span className="text-gray-600">{formatDate(v)}</span> },
    { key: 'expiresAt', label: 'Expires', render: (v) => <span className="text-gray-600">{formatDate(v)}</span> },
  ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VendorPageHeader
        title={org.name}
        subtitle={`Organization #${org.id} · ${org.slug}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Organizations', href: '/organizations' },
          { label: org.name, href: `/organizations/${org.id}` },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <RefreshButton onClick={refresh} refreshing={refreshing} />
            {isSuspended ? (
              <button
                type="button"
                onClick={() => setConfirm('reactivate')}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-emerald-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                <PlayCircle className="h-4 w-4" />
                Reactivate
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirm('suspend')}
                className="flex items-center gap-2 whitespace-nowrap rounded-xl border border-red-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50"
              >
                <Ban className="h-4 w-4" />
                Suspend
              </button>
            )}
          </div>
        }
      />

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-orange-50/40 p-5 shadow-md sm:flex-row sm:items-center">
        <OrgAvatar name={org.name} id={org.id} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-semibold text-gray-900">{org.name}</h2>
            <StageBadge stage={org.stage} />
            {org.atRisk ? <Pill className="border-amber-200 bg-amber-50 text-amber-800">Needs attention</Pill> : null}
            {!org.onboardingCompleted ? <Pill className="border-gray-200 bg-white text-gray-600">Onboarding not finished</Pill> : null}
          </div>
          <p className="mt-1 text-sm text-gray-600">
            {industryLabel(org.industry)} · {sizeLabel(org.size)} · joined {formatDate(org.createdAt)} · last active {formatRelative(org.lastActiveAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="MRR" value={org.mrr ? formatINRCompact(org.mrr) : '₹0'} valueTitle={formatINR(org.mrr)} subtitle={`${org.seats} paid seats`} icon={IndianRupee} colorScheme="orange" />
        <KPICard title="Lifetime revenue" value={formatINRCompact(org.lifetimeRevenue)} subtitle={`${paid.length} paid invoice${paid.length === 1 ? '' : 's'} · excl. GST`} icon={Wallet} colorScheme="orange" />
        <KPICard title="Members" value={formatNumber(org.memberCount)} subtitle={`${org.pendingInvites} pending invite${org.pendingInvites === 1 ? '' : 's'}`} icon={Users} colorScheme="orange" />
        <KPICard title="Last payment" value={org.lastPaymentAt ? formatRelative(org.lastPaymentAt) : 'Never'} subtitle={org.lastPaymentAt ? formatDate(org.lastPaymentAt) : 'No paid invoices yet'} icon={CalendarClock} colorScheme="orange" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          <TabsWithActions tabs={tabs} activeTab={tab} onTabChange={setTab} variant="pill" pillTrack="hug" />

          {tab === 'apps' ? (
            subscriptions.length === 0 ? (
              <EmptyLine>This organization has not added any app yet.</EmptyLine>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {subscriptions.map((s) => (
                  <SubscriptionCard key={s.id} sub={s} onExtend={(sub) => { setExtendDays(7); setExtending(sub) }} />
                ))}
              </div>
            )
          ) : null}

          {tab === 'members' ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <Table columns={memberColumns} data={members} keyField="id" variant="modernEmbedded" />
              {members.length === 0 ? <div className="p-6"><EmptyLine>No members.</EmptyLine></div> : null}
            </div>
          ) : null}

          {tab === 'payments' ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <Table columns={paymentColumns} data={payments} keyField="id" variant="modernEmbedded" />
              {payments.length === 0 ? <div className="p-6"><EmptyLine>No payments yet.</EmptyLine></div> : null}
            </div>
          ) : null}

          {tab === 'invitations' ? (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <Table columns={inviteColumns} data={invitations} keyField="id" variant="modernEmbedded" />
              {invitations.length === 0 ? <div className="p-6"><EmptyLine>No invitations sent.</EmptyLine></div> : null}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <Panel title="Company" bodyClassName="divide-y divide-gray-100">
            <InfoRow icon={UserRound} label="Owner">
              {org.owner ? (
                <Link href={`/users?q=${encodeURIComponent(org.owner.email)}`} className="hover:text-orange-600">
                  {org.owner.name} · {org.owner.email}
                </Link>
              ) : null}
            </InfoRow>
            <InfoRow icon={Mail} label="Company email">
              {org.companyEmail ? <a href={`mailto:${org.companyEmail}`} className="hover:text-orange-600">{org.companyEmail}</a> : null}
            </InfoRow>
            <InfoRow icon={Phone} label="Phone">{org.companyPhone}</InfoRow>
            <InfoRow icon={Globe} label="Website">
              {org.website ? (
                <a
                  href={/^https?:\/\//.test(org.website) ? org.website : `https://${org.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 hover:text-orange-600"
                >
                  {org.website}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
            </InfoRow>
            <InfoRow icon={Briefcase} label="Industry · size">
              {industryLabel(org.industry)} · {sizeLabel(org.size)}
            </InfoRow>
            {address ? <InfoRow icon={Globe} label="Address">{address}</InfoRow> : null}
          </Panel>

          {org.billingDetails ? (
            <Panel title="Billing details">
              <dl className="space-y-2 text-sm">
                {Object.entries(org.billingDetails)
                  .filter(([, v]) => v && typeof v !== 'object')
                  .map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3">
                      <dt className="capitalize text-gray-500">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</dt>
                      <dd className="truncate text-right font-medium text-gray-900">{String(v)}</dd>
                    </div>
                  ))}
              </dl>
            </Panel>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(extending)}
        onClose={() => setExtending(null)}
        title="Extend trial"
        description={extending ? `Give ${org.name} more time on ${extending.app?.name}. Days are added to the current end date (or to today if the trial already ended), and the app unlocks straight away.` : ''}
        confirmLabel={`Extend by ${extendDays} days`}
        onConfirm={async () => {
          await vendorApi.extendTrial(extending.id, extendDays)
          await refresh()
        }}
      >
        <div className="flex flex-wrap gap-2">
          {[3, 7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setExtendDays(d)}
              className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors ${
                extendDays === d ? 'border-orange-500 bg-orange-500 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {d} days
            </button>
          ))}
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={confirm === 'suspend'}
        onClose={() => setConfirm(null)}
        title={`Suspend ${org.name}?`}
        description="Every app locks for all members immediately. Their data is kept, and you can reactivate the organization at any time."
        confirmLabel="Suspend organization"
        danger
        onConfirm={async () => {
          await vendorApi.suspend(org.id, reason)
          setReason('')
          await refresh()
        }}
      >
        <label className="block text-sm font-medium text-gray-700">
          Reason (kept in the API log)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-orange-500/60 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            placeholder="e.g. Payment dispute, abuse report"
          />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={confirm === 'reactivate'}
        onClose={() => setConfirm(null)}
        title={`Reactivate ${org.name}?`}
        description="Each app goes back to its trial or plan. Apps whose trial or period has already ended return as read-only or locked, as usual."
        confirmLabel="Reactivate"
        onConfirm={async () => {
          await vendorApi.reactivate(org.id)
          await refresh()
        }}
      />
    </div>
  )
}
