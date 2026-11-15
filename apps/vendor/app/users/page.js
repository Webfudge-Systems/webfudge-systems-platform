'use client'

import { Suspense, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { KPICard } from '@webfudge/ui'
import { Users, UserPlus, Activity, ShieldOff, Crown } from 'lucide-react'
import VendorPageHeader from '../../components/VendorPageHeader'
import ListView from '../../components/ListView'
import { ErrorState, OrgAvatar, Pill, RefreshButton, TitleCell } from '../../components/VendorUI'
import vendorApi from '../../lib/api'
import useVendorQuery from '../../lib/useVendorQuery'
import { downloadCsv } from '../../lib/csv'
import { formatDate, formatNumber, formatRelative } from '../../lib/format'

const time = (v) => (v ? new Date(v).getTime() : null)
const DAY = 864e5
const activeRecently = (u) => time(u.lastAccessAt) >= Date.now() - 7 * DAY

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active this week', filter: activeRecently },
  { key: 'owners', label: 'Org owners', filter: (u) => u.organizations.some((o) => o.isOwner) },
  { key: 'no_org', label: 'No organization', filter: (u) => !u.organizations.some((o) => o.isActive) },
  { key: 'unverified', label: 'Unverified', filter: (u) => !u.confirmed },
  { key: 'blocked', label: 'Blocked', filter: (u) => u.blocked },
]

function UsersList() {
  const router = useRouter()
  const { data, error, loading, refreshing, refresh } = useVendorQuery((opts) => vendorApi.users(opts), [])
  const rows = data?.data || []
  const visible = useRef([])
  const onVisible = useCallback((list) => {
    visible.current = list
  }, [])

  const COLUMNS = [
    {
      key: 'name',
      label: 'User',
      sortValue: (u) => (u.name || u.email || '').toLowerCase(),
      render: (_, u) => <TitleCell avatar={<OrgAvatar name={u.name || u.email} id={u.id} size="sm" />} title={u.name || u.email} subtitle={u.email} />,
    },
    {
      key: 'organizations',
      label: 'Organizations',
      sortValue: (u) => u.organizations.length,
      render: (orgs) =>
        orgs.length ? (
          <div className="flex max-w-[280px] flex-wrap gap-1">
            {orgs.slice(0, 3).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  router.push(`/organizations/${o.id}`)
                }}
                className={`inline-flex max-w-[180px] items-center gap-1 truncate rounded-md border px-2 py-0.5 text-xs font-medium transition-colors hover:border-orange-300 hover:bg-orange-50 ${
                  o.isActive ? 'border-gray-200 bg-white text-gray-700' : 'border-gray-100 bg-gray-50 text-gray-400 line-through'
                }`}
                title={`${o.name} · ${o.isOwner ? 'Owner' : o.role || 'Member'}`}
              >
                {o.isOwner ? <Crown className="h-3 w-3 shrink-0 text-amber-500" /> : null}
                <span className="truncate">{o.name}</span>
              </button>
            ))}
            {orgs.length > 3 ? <span className="text-xs text-gray-500">+{orgs.length - 3}</span> : null}
          </div>
        ) : (
          <span className="text-xs text-gray-400">None</span>
        ),
    },
    {
      key: 'role',
      label: 'Role',
      render: (_, u) => {
        const primary = u.organizations.find((o) => o.isActive)
        return <span className="text-gray-700">{primary ? (primary.isOwner ? 'Owner' : primary.role || 'Member') : '—'}</span>
      },
    },
    {
      key: 'status',
      label: 'Status',
      render: (_, u) =>
        u.blocked ? (
          <Pill className="border-red-200 bg-red-50 text-red-700">Blocked</Pill>
        ) : !u.confirmed ? (
          <Pill className="border-amber-200 bg-amber-50 text-amber-800">Unverified</Pill>
        ) : (
          <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">Active</Pill>
        ),
    },
    {
      key: 'lastAccessAt',
      label: 'Last active',
      sortValue: (u) => time(u.lastAccessAt),
      render: (v) => <span className="whitespace-nowrap text-gray-600">{formatRelative(v)}</span>,
    },
    {
      key: 'createdAt',
      label: 'Signed up',
      sortValue: (u) => time(u.createdAt),
      render: (v) => <span className="whitespace-nowrap text-gray-600">{formatDate(v)}</span>,
    },
  ]

  const CSV = [
    { label: 'User ID', value: (u) => u.id },
    { label: 'Name', value: (u) => u.name },
    { label: 'Email', value: (u) => u.email },
    { label: 'Organizations', value: (u) => u.organizations.map((o) => `${o.name} (${o.isOwner ? 'Owner' : o.role || 'Member'})`).join('; ') },
    { label: 'Verified', value: (u) => (u.confirmed ? 'Yes' : 'No') },
    { label: 'Blocked', value: (u) => (u.blocked ? 'Yes' : 'No') },
    { label: 'Sign-in method', value: (u) => u.provider },
    { label: 'Signed up', value: (u) => formatDate(u.createdAt) },
    { label: 'Last active', value: (u) => (u.lastAccessAt ? formatDate(u.lastAccessAt) : '') },
  ]

  const since30 = Date.now() - 30 * DAY

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VendorPageHeader
        title="Users"
        subtitle="Everyone with a Webfudge account, and the organizations they belong to"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Users', href: '/users' },
        ]}
        showActions
        onExportClick={() => downloadCsv(`users-${new Date().toISOString().slice(0, 10)}`, CSV, visible.current)}
        actions={<RefreshButton onClick={refresh} refreshing={refreshing} />}
      />

      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Users" value={formatNumber(rows.length)} subtitle={`${rows.filter((u) => u.confirmed).length} verified`} icon={Users} colorScheme="orange" />
        <KPICard title="New · 30 days" value={formatNumber(rows.filter((u) => time(u.createdAt) >= since30).length)} subtitle="Accounts created" icon={UserPlus} colorScheme="orange" />
        <KPICard title="Active this week" value={formatNumber(rows.filter(activeRecently).length)} subtitle="Opened an app in the last 7 days" icon={Activity} colorScheme="orange" />
        <KPICard title="Blocked" value={formatNumber(rows.filter((u) => u.blocked).length)} subtitle="Cannot sign in" icon={ShieldOff} colorScheme="orange" />
      </div>

      <ListView
        rows={rows}
        loading={loading}
        tabs={TABS}
        columns={COLUMNS}
        search={(u) => [u.name, u.email, ...u.organizations.map((o) => o.name)].filter(Boolean).join(' ')}
        searchPlaceholder="Search name, email or organization..."
        defaultSort={{ key: 'createdAt', direction: 'desc' }}
        onRowClick={(u) => {
          const org = u.organizations.find((o) => o.isActive) || u.organizations[0]
          if (org) router.push(`/organizations/${org.id}`)
        }}
        onVisibleRowsChange={onVisible}
        emptyIcon={Users}
        emptyTitle="No users found"
        emptyDescription="Users appear here as soon as they sign up."
      />
    </div>
  )
}

export default function UsersPage() {
  return (
    <Suspense fallback={null}>
      <UsersList />
    </Suspense>
  )
}
