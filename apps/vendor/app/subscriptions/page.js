'use client'

import { Suspense, useCallback, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { KPICard } from '@webfudge/ui'
import { Repeat, IndianRupee, Hourglass, Lock } from 'lucide-react'
import VendorPageHeader from '../../components/VendorPageHeader'
import ListView from '../../components/ListView'
import { AccessDot, AppChip, ErrorState, OrgAvatar, RefreshButton, Segmented, SubStateBadge, TitleCell } from '../../components/VendorUI'
import vendorApi from '../../lib/api'
import useVendorQuery from '../../lib/useVendorQuery'
import { downloadCsv } from '../../lib/csv'
import { cycleLabel, formatDate, formatINR, formatINRCompact, formatNumber, SUB_STATES } from '../../lib/format'

const time = (v) => (v ? new Date(v).getTime() : null)

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Paid', filter: (s) => s.mrr > 0 },
  { key: 'trial', label: 'Trial', filter: (s) => s.state === 'trial' && s.access === 'full' },
  { key: 'ending', label: 'Ending soon', filter: (s) => s.access === 'full' && s.daysLeft != null && s.daysLeft <= 7 },
  { key: 'free', label: 'Free', filter: (s) => s.planCode === 'free' && s.access === 'full' },
  { key: 'read_only', label: 'Read-only', filter: (s) => s.access === 'read_only' },
  { key: 'locked', label: 'Locked', filter: (s) => s.access === 'locked' },
]

const endLabel = (s) => {
  if (s.access === 'locked') return s.lockAt ? `Locked ${formatDate(s.lockAt)}` : 'Locked'
  if (s.access === 'read_only') return `Locks ${formatDate(s.lockAt)}`
  if (s.planCode === 'free') return 'No end date'
  return formatDate(s.endsAt || s.currentPeriodEnd || s.trialEndsAt)
}

const COLUMNS = [
  {
    key: 'organization',
    label: 'Organization',
    sortValue: (s) => s.organization.name || '',
    render: (_, s) => (
      <TitleCell avatar={<OrgAvatar name={s.organization.name} id={s.organization.id} size="sm" />} title={s.organization.name} subtitle={`#${s.id}`} />
    ),
  },
  { key: 'app', label: 'App', sortValue: (s) => s.app?.name || '', render: (_, s) => <AppChip app={s.app} /> },
  {
    key: 'planName',
    label: 'Plan',
    sortValue: (s) => s.planName || '',
    render: (_, s) => (
      <div className="whitespace-nowrap">
        <p className="text-sm font-medium text-gray-900">{s.planName || '—'}</p>
        <p className="text-xs text-gray-500">{s.planCode === 'trial' || s.planCode === 'free' ? '' : cycleLabel(s.billingCycle)}</p>
      </div>
    ),
  },
  {
    key: 'state',
    label: 'State',
    sortValue: (s) => SUB_STATES[s.state]?.label || s.state,
    render: (_, s) => (
      <div className="flex flex-col items-start gap-1">
        <SubStateBadge state={s.state} />
        <AccessDot access={s.access} />
      </div>
    ),
  },
  { key: 'users', label: 'Seats', sortValue: (s) => s.users, render: (v) => <span className="tabular-nums text-gray-700">{v}</span> },
  {
    key: 'mrr',
    label: 'MRR',
    sortValue: (s) => s.mrr,
    render: (v) => <span className={`tabular-nums ${v ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{v ? formatINR(v) : '—'}</span>,
  },
  {
    key: 'endsAt',
    label: 'Ends / renews',
    sortValue: (s) => time(s.lockAt && s.access !== 'full' ? s.lockAt : s.endsAt || s.currentPeriodEnd || s.trialEndsAt),
    render: (_, s) => (
      <div className="whitespace-nowrap">
        <p className="text-sm text-gray-700">{endLabel(s)}</p>
        {s.access === 'full' && s.daysLeft != null ? (
          <p className={`text-xs ${s.daysLeft <= 3 ? 'font-semibold text-red-600' : 'text-gray-500'}`}>
            {s.daysLeft} day{s.daysLeft === 1 ? '' : 's'} left{s.cancelAtPeriodEnd ? ' · cancelling' : ''}
          </p>
        ) : null}
      </div>
    ),
  },
  {
    key: 'startDate',
    label: 'Started',
    sortValue: (s) => time(s.startDate),
    render: (v) => <span className="whitespace-nowrap text-gray-600">{formatDate(v)}</span>,
  },
]

const CSV = [
  { label: 'Subscription ID', value: (s) => s.id },
  { label: 'Organization', value: (s) => s.organization.name },
  { label: 'App', value: (s) => s.app?.name },
  { label: 'Plan', value: (s) => s.planName },
  { label: 'Cycle', value: (s) => cycleLabel(s.billingCycle) },
  { label: 'State', value: (s) => SUB_STATES[s.state]?.label || s.state },
  { label: 'Access', value: (s) => s.access },
  { label: 'Seats', value: (s) => s.users },
  { label: 'MRR (INR)', value: (s) => s.mrr },
  { label: 'Trial ends', value: (s) => (s.trialEndsAt ? formatDate(s.trialEndsAt) : '') },
  { label: 'Period ends', value: (s) => (s.currentPeriodEnd ? formatDate(s.currentPeriodEnd) : '') },
  { label: 'Cancel at period end', value: (s) => (s.cancelAtPeriodEnd ? 'Yes' : 'No') },
  { label: 'Started', value: (s) => formatDate(s.startDate) },
]

function SubscriptionsList() {
  const router = useRouter()
  const { data, error, loading, refreshing, refresh } = useVendorQuery((opts) => vendorApi.subscriptions(opts), [])
  const [app, setApp] = useState('all')
  const rows = useMemo(() => {
    const all = data?.data || []
    return app === 'all' ? all : all.filter((s) => s.app?.slug === app)
  }, [data, app])
  const visible = useRef([])
  const onVisible = useCallback((list) => {
    visible.current = list
  }, [])

  const mrr = rows.reduce((s, x) => s + x.mrr, 0)
  const appOptions = [{ value: 'all', label: 'All apps' }, ...(data?.apps || []).map((a) => ({ value: a.slug, label: a.name }))]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VendorPageHeader
        title="Subscriptions"
        subtitle="Every app each organization has added, with its trial or plan"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Subscriptions', href: '/subscriptions' },
        ]}
        showActions
        onExportClick={() => downloadCsv(`subscriptions-${new Date().toISOString().slice(0, 10)}`, CSV, visible.current)}
        actions={<RefreshButton onClick={refresh} refreshing={refreshing} />}
      />

      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Subscriptions" value={formatNumber(rows.length)} subtitle={`${rows.filter((s) => s.access === 'full').length} with full access`} icon={Repeat} colorScheme="orange" />
        <KPICard title="MRR" value={formatINRCompact(mrr)} valueTitle={formatINR(mrr)} subtitle={`${rows.filter((s) => s.mrr > 0).length} paid subscriptions`} icon={IndianRupee} colorScheme="orange" />
        <KPICard
          title="Trials"
          value={formatNumber(rows.filter((s) => s.state === 'trial' && s.access === 'full').length)}
          subtitle={`${rows.filter((s) => s.state === 'trial' && s.access === 'full' && s.daysLeft <= 7).length} end within 7 days`}
          icon={Hourglass}
          colorScheme="orange"
        />
        <KPICard
          title="Read-only or locked"
          value={formatNumber(rows.filter((s) => s.access !== 'full').length)}
          subtitle={`${rows.filter((s) => s.access === 'read_only').length} can still be saved`}
          icon={Lock}
          colorScheme="orange"
        />
      </div>

      {appOptions.length > 2 ? <Segmented options={appOptions} value={app} onChange={setApp} /> : null}

      <ListView
        rows={rows}
        loading={loading}
        tabs={TABS}
        columns={COLUMNS}
        search={(s) => [s.organization.name, s.app?.name, s.planName, s.planCode].filter(Boolean).join(' ')}
        searchPlaceholder="Search organization, app or plan..."
        defaultSort={{ key: 'endsAt', direction: 'asc' }}
        onRowClick={(s) => router.push(`/organizations/${s.organization.id}`)}
        onVisibleRowsChange={onVisible}
        emptyIcon={Repeat}
        emptyTitle="No subscriptions found"
        emptyDescription="A subscription is created when an organization starts a trial of an app."
      />
    </div>
  )
}

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionsList />
    </Suspense>
  )
}
