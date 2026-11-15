'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth, resolveUserGreetingName } from '@webfudge/auth'
import { KPICard, LoadingSpinner } from '@webfudge/ui'
import {
  IndianRupee,
  Building2,
  Hourglass,
  Wallet,
  Users,
  TrendingUp,
  AlertTriangle,
  Layers,
  ChevronRight,
  BarChart3,
  Sparkles,
  PieChart as PieIcon,
  Receipt,
} from 'lucide-react'
import VendorPageHeader from '../components/VendorPageHeader'
import {
  Panel,
  ErrorState,
  RefreshButton,
  OrgAvatar,
  AppStack,
  AppChip,
  StageBadge,
  SubStateBadge,
  PaymentBadge,
  EmptyLine,
  AppIcon,
} from '../components/VendorUI'
import { StackedRevenueChart, TrendAreaChart, DonutChart, appSeries } from '../components/Charts'
import vendorApi from '../lib/api'
import useVendorQuery from '../lib/useVendorQuery'
import {
  formatINR,
  formatINRCompact,
  formatNumber,
  formatRelative,
  formatDate,
  formatPercent,
  appColor,
} from '../lib/format'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good Morning'
  if (h < 18) return 'Good Afternoon'
  return 'Good Evening'
}

const changeText = (pct, suffix) => {
  if (pct == null) return `New ${suffix}`
  if (pct === 0) return `Flat ${suffix}`
  return `${pct > 0 ? '+' : ''}${pct}% ${suffix}`
}

function ListRow({ href, children }) {
  return (
    <li>
      <Link href={href} className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white">
        {children}
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-colors group-hover:text-orange-500" />
      </Link>
    </li>
  )
}

function ViewAll({ href, label = 'View all' }) {
  return (
    <Link href={href} className="text-sm font-semibold text-orange-600 hover:text-orange-700">
      {label}
    </Link>
  )
}

export default function VendorDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { data, error, loading, refreshing, refresh } = useVendorQuery((opts) => vendorApi.overview(opts), [])
  const name = resolveUserGreetingName ? resolveUserGreetingName(user) : user?.email?.split('@')[0]
  const k = data?.kpis

  const apps = data?.appAdoption || []
  const series = appSeries(apps)

  return (
    <div className="min-h-full space-y-4 bg-white p-4">
      <VendorPageHeader
        title={`${greeting()}, ${name || 'there'}`}
        subtitle={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        breadcrumb={[{ label: 'Dashboard', href: '/' }]}
        actions={<RefreshButton onClick={refresh} refreshing={refreshing} />}
      />

      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" message="Loading platform overview..." />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard
              title="Monthly recurring revenue"
              value={formatINRCompact(k.mrr)}
              valueTitle={formatINR(k.mrr)}
              subtitle={`ARR ${formatINRCompact(k.arr)} · excl. GST`}
              icon={IndianRupee}
              colorScheme="orange"
              onClick={() => router.push('/reports')}
            />
            <KPICard
              title="Paying organizations"
              value={formatNumber(k.payingOrganizations)}
              subtitle={`${formatNumber(k.paidSeats)} paid seats · ARPA ${formatINRCompact(k.arpa)}`}
              icon={Building2}
              colorScheme="orange"
              onClick={() => router.push('/organizations?tab=paying')}
            />
            <KPICard
              title="Active trials"
              value={formatNumber(k.activeTrials)}
              subtitle={`${data.trialsEndingSoon.length} ending in 7 days`}
              icon={Hourglass}
              colorScheme="orange"
              onClick={() => router.push('/subscriptions?tab=trial')}
            />
            <KPICard
              title="Revenue · last 30 days"
              value={formatINRCompact(k.revenue30d)}
              valueTitle={formatINR(k.revenue30d)}
              subtitle={changeText(k.revenueChange, 'vs prior 30 days')}
              icon={Wallet}
              colorScheme="orange"
              onClick={() => router.push('/billing')}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'Organizations', value: formatNumber(k.organizations), hint: `+${k.newOrganizations30d} in 30 days`, icon: Building2, href: '/organizations' },
              { label: 'Users', value: formatNumber(k.users), hint: `+${k.newUsers30d} in 30 days`, icon: Users, href: '/users' },
              {
                label: 'Trial → paid',
                value: formatPercent(k.conversion.rate),
                hint: `${k.conversion.converted} of ${k.conversion.eligible} finished trials`,
                icon: TrendingUp,
                href: '/reports',
              },
              { label: 'At risk', value: formatNumber(k.atRiskOrganizations), hint: 'Read-only, past due or cancelling', icon: AlertTriangle, href: '/organizations?tab=at_risk' },
            ].map((s) => {
              const Icon = s.icon
              return (
                <Link
                  key={s.label}
                  href={s.href}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-primary/10">
                    <Icon className="h-5 w-5 text-brand-primary" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-gray-500">{s.label}</span>
                    <span className="block text-xl font-bold tabular-nums text-gray-900">{s.value}</span>
                    <span className="block truncate text-[11px] text-gray-500">{s.hint}</span>
                  </span>
                </Link>
              )
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Revenue by app"
              subtitle={`Paid invoices, last 12 months · lifetime ${formatINR(k.lifetimeRevenue)} excl. GST`}
              icon={BarChart3}
            >
              <StackedRevenueChart data={data.revenueByMonth} series={series} />
            </Panel>
            <Panel title="Plan mix" subtitle="Subscriptions with full access" icon={PieIcon}>
              <DonutChart rows={data.planMix} centerLabel="subscriptions" />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Panel title="App adoption" subtitle="Where every subscription stands" icon={Layers}>
              {apps.length === 0 ? (
                <EmptyLine>No apps in the catalogue yet.</EmptyLine>
              ) : (
                <ul className="space-y-4">
                  {apps.map((a) => {
                    const parts = [
                      { key: 'paying', label: 'Paying', value: a.paying, color: appColor(a) },
                      { key: 'trial', label: 'Trial', value: a.trial, color: '#FDBA74' },
                      { key: 'free', label: 'Free', value: a.free, color: '#7DD3FC' },
                      { key: 'readOnly', label: 'Read-only', value: a.readOnly, color: '#FCD34D' },
                      { key: 'locked', label: 'Locked', value: a.locked, color: '#E5E7EB' },
                    ]
                    return (
                      <li key={a.slug}>
                        <div className="mb-1.5 flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                            <AppIcon app={a} size={20} />
                            {a.name}
                            {a.availability === 'coming_soon' ? (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-gray-500">Soon</span>
                            ) : null}
                          </span>
                          <span className="text-xs tabular-nums text-gray-500">
                            {a.total} subs · {formatINRCompact(a.mrr)}/mo
                          </span>
                        </div>
                        <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                          {a.total > 0 &&
                            parts.map((p) =>
                              p.value ? (
                                <span
                                  key={p.key}
                                  title={`${p.label}: ${p.value}`}
                                  style={{ width: `${(p.value / a.total) * 100}%`, background: p.color }}
                                />
                              ) : null
                            )}
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500">
                          {parts.filter((p) => p.value).map((p) => (
                            <span key={p.key} className="inline-flex items-center gap-1">
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                              {p.label} {p.value}
                            </span>
                          ))}
                          {a.total === 0 ? <span>No subscriptions yet</span> : null}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
            <Panel className="xl:col-span-2" title="Growth" subtitle="New organizations and users per month" icon={Sparkles}>
              <TrendAreaChart
                data={data.growthByMonth}
                series={[
                  { key: 'organizations', name: 'Organizations', color: '#F5630F' },
                  { key: 'users', name: 'Users', color: '#1F4FFF' },
                ]}
              />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Trials ending soon" subtitle="Next 7 days — a good time to reach out" action={<ViewAll href="/subscriptions?tab=ending" />}>
              {data.trialsEndingSoon.length === 0 ? (
                <EmptyLine>No trials end in the next 7 days.</EmptyLine>
              ) : (
                <ul className="-mx-2 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60 p-1">
                  {data.trialsEndingSoon.map((s) => (
                    <ListRow key={s.id} href={`/organizations/${s.organization.id}`}>
                      <OrgAvatar name={s.organization.name} id={s.organization.id} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{s.organization.name}</span>
                        <span className="block text-xs text-gray-500">
                          <AppChip app={s.app} />
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                          s.daysLeft <= 2 ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                        }`}
                      >
                        {s.daysLeft === 0 ? 'Ends today' : `${s.daysLeft}d left`}
                      </span>
                    </ListRow>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Needs attention" subtitle="Read-only, past due or set to cancel" action={<ViewAll href="/organizations?tab=at_risk" />}>
              {data.attention.length === 0 ? (
                <EmptyLine>Nothing needs attention right now.</EmptyLine>
              ) : (
                <ul className="-mx-2 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60 p-1">
                  {data.attention.map((s) => (
                    <ListRow key={s.id} href={`/organizations/${s.organization.id}`}>
                      <OrgAvatar name={s.organization.name} id={s.organization.id} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{s.organization.name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {s.app?.name} ·{' '}
                          {s.cancelAtPeriodEnd && s.access === 'full'
                            ? `cancels ${formatDate(s.endsAt)}`
                            : s.lockAt
                              ? `locks ${formatDate(s.lockAt)}`
                              : s.status.replace('_', ' ')}
                        </span>
                      </span>
                      <SubStateBadge state={s.state} />
                    </ListRow>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Newest organizations" action={<ViewAll href="/organizations" />}>
              {data.recentOrganizations.length === 0 ? (
                <EmptyLine>No organizations have signed up yet.</EmptyLine>
              ) : (
                <ul className="-mx-2 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60 p-1">
                  {data.recentOrganizations.map((o) => (
                    <ListRow key={o.id} href={`/organizations/${o.id}`}>
                      <OrgAvatar name={o.name} id={o.id} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{o.name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {o.owner?.email || 'No owner'} · joined {formatRelative(o.createdAt)}
                        </span>
                      </span>
                      <span className="hidden sm:inline-flex">
                        <AppStack apps={o.apps} />
                      </span>
                      <StageBadge stage={o.stage} />
                    </ListRow>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Recent payments" action={<ViewAll href="/billing" />} icon={Receipt}>
              {data.recentPayments.length === 0 ? (
                <EmptyLine>No payments yet.</EmptyLine>
              ) : (
                <ul className="-mx-2 divide-y divide-gray-100 rounded-lg border border-gray-100 bg-gray-50/60 p-1">
                  {data.recentPayments.map((p) => (
                    <ListRow key={p.id} href={`/organizations/${p.organization.id}`}>
                      <AppIcon app={p.app} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-gray-900">{p.organization.name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {p.invoiceNumber || `Order #${p.id}`} · {formatRelative(p.paidAt || p.createdAt)}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-sm font-bold tabular-nums text-gray-900">{formatINR(p.total)}</span>
                        <PaymentBadge status={p.status} />
                      </span>
                    </ListRow>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
          <p className="pb-2 text-center text-xs text-gray-400">
            Updated {formatRelative(data.generatedAt)} · amounts in INR, revenue and MRR exclude GST
          </p>
        </>
      ) : null}
    </div>
  )
}
