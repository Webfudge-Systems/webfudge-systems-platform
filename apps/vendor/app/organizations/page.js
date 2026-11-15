'use client'

import { Suspense, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { KPICard } from '@webfudge/ui'
import { Building2, IndianRupee, Hourglass, AlertTriangle } from 'lucide-react'
import VendorPageHeader from '../../components/VendorPageHeader'
import ListView from '../../components/ListView'
import { AppStack, ErrorState, OrgAvatar, RefreshButton, StageBadge, TitleCell } from '../../components/VendorUI'
import vendorApi from '../../lib/api'
import useVendorQuery from '../../lib/useVendorQuery'
import { downloadCsv } from '../../lib/csv'
import {
  formatDate,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatRelative,
  industryLabel,
  sizeLabel,
  stageLabel,
} from '../../lib/format'

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'paying', label: 'Paying', filter: (o) => o.stage === 'paying' },
  { key: 'trial', label: 'Trial', filter: (o) => o.stage === 'trial' },
  { key: 'free', label: 'Free', filter: (o) => o.stage === 'free' },
  { key: 'at_risk', label: 'At risk', filter: (o) => o.atRisk || o.stage === 'at_risk' },
  { key: 'churned', label: 'Churned', filter: (o) => o.stage === 'churned' },
  { key: 'suspended', label: 'Suspended', filter: (o) => o.stage === 'suspended' },
]

const time = (v) => (v ? new Date(v).getTime() : null)

const COLUMNS = [
  {
    key: 'name',
    label: 'Organization',
    sortValue: (o) => o.name || '',
    render: (_, o) => (
      <TitleCell
        avatar={<OrgAvatar name={o.name} id={o.id} />}
        title={o.name}
        subtitle={o.owner?.email || o.companyEmail || o.slug}
      />
    ),
  },
  { key: 'stage', label: 'Stage', sortValue: (o) => stageLabel(o.stage), render: (_, o) => <StageBadge stage={o.stage} /> },
  { key: 'apps', label: 'Apps', render: (_, o) => <AppStack apps={o.apps} /> },
  {
    key: 'mrr',
    label: 'MRR',
    sortValue: (o) => o.mrr,
    render: (_, o) => (
      <span className={`tabular-nums ${o.mrr ? 'font-semibold text-gray-900' : 'text-gray-400'}`}>{o.mrr ? formatINR(o.mrr) : '—'}</span>
    ),
  },
  {
    key: 'memberCount',
    label: 'Members',
    sortValue: (o) => o.memberCount,
    render: (_, o) => (
      <span className="tabular-nums text-gray-700">
        {o.memberCount}
        {o.seats ? <span className="text-gray-400"> / {o.seats} paid</span> : null}
      </span>
    ),
  },
  {
    key: 'lifetimeRevenue',
    label: 'Lifetime revenue',
    sortValue: (o) => o.lifetimeRevenue,
    render: (_, o) => <span className="tabular-nums text-gray-700">{o.lifetimeRevenue ? formatINRCompact(o.lifetimeRevenue) : '—'}</span>,
  },
  {
    key: 'lastActiveAt',
    label: 'Last active',
    sortValue: (o) => time(o.lastActiveAt),
    render: (_, o) => <span className="whitespace-nowrap text-gray-600">{formatRelative(o.lastActiveAt)}</span>,
  },
  {
    key: 'createdAt',
    label: 'Joined',
    sortValue: (o) => time(o.createdAt),
    render: (_, o) => <span className="whitespace-nowrap text-gray-600">{formatDate(o.createdAt)}</span>,
  },
]

const CSV = [
  { label: 'ID', value: (o) => o.id },
  { label: 'Organization', value: (o) => o.name },
  { label: 'Owner', value: (o) => o.owner?.name },
  { label: 'Owner email', value: (o) => o.owner?.email },
  { label: 'Stage', value: (o) => stageLabel(o.stage) },
  { label: 'At risk', value: (o) => (o.atRisk ? 'Yes' : 'No') },
  { label: 'Apps', value: (o) => o.apps.map((a) => `${a.name} (${a.planName || a.state})`).join('; ') },
  { label: 'MRR (INR)', value: (o) => o.mrr },
  { label: 'Paid seats', value: (o) => o.seats },
  { label: 'Members', value: (o) => o.memberCount },
  { label: 'Lifetime revenue (INR)', value: (o) => o.lifetimeRevenue },
  { label: 'Industry', value: (o) => industryLabel(o.industry) },
  { label: 'Size', value: (o) => sizeLabel(o.size) },
  { label: 'Joined', value: (o) => formatDate(o.createdAt) },
  { label: 'Last active', value: (o) => (o.lastActiveAt ? formatDate(o.lastActiveAt) : '') },
]

function OrganizationsList() {
  const router = useRouter()
  const { data, error, loading, refreshing, refresh } = useVendorQuery((opts) => vendorApi.organizations(opts), [])
  const rows = data?.data || []
  const visible = useRef([])
  const onVisible = useCallback((list) => {
    visible.current = list
  }, [])

  const paying = rows.filter((o) => o.stage === 'paying')
  const mrr = rows.reduce((s, o) => s + o.mrr, 0)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VendorPageHeader
        title="Organizations"
        subtitle="Every company using Webfudge apps"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Organizations', href: '/organizations' },
        ]}
        showActions
        onExportClick={() => downloadCsv(`organizations-${new Date().toISOString().slice(0, 10)}`, CSV, visible.current)}
        actions={<RefreshButton onClick={refresh} refreshing={refreshing} />}
      />

      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Organizations" value={formatNumber(rows.length)} subtitle={`${rows.filter((o) => o.onboardingCompleted).length} finished onboarding`} icon={Building2} colorScheme="orange" />
        <KPICard title="Paying" value={formatNumber(paying.length)} subtitle={`${formatINRCompact(mrr)} MRR`} icon={IndianRupee} colorScheme="orange" />
        <KPICard title="On trial" value={formatNumber(rows.filter((o) => o.stage === 'trial').length)} subtitle="Full access, no plan yet" icon={Hourglass} colorScheme="orange" />
        <KPICard title="At risk" value={formatNumber(rows.filter((o) => o.atRisk || o.stage === 'at_risk').length)} subtitle="Read-only, past due or cancelling" icon={AlertTriangle} colorScheme="orange" />
      </div>

      <ListView
        rows={rows}
        loading={loading}
        tabs={TABS}
        columns={COLUMNS}
        search={(o) => [o.name, o.slug, o.owner?.name, o.owner?.email, o.companyEmail, o.website].filter(Boolean).join(' ')}
        searchPlaceholder="Search name, owner or email..."
        defaultSort={{ key: 'createdAt', direction: 'desc' }}
        onRowClick={(o) => router.push(`/organizations/${o.id}`)}
        onVisibleRowsChange={onVisible}
        emptyIcon={Building2}
        emptyTitle="No organizations found"
        emptyDescription="Organizations appear here as soon as someone signs up."
      />
    </div>
  )
}

export default function OrganizationsPage() {
  return (
    <Suspense fallback={null}>
      <OrganizationsList />
    </Suspense>
  )
}
