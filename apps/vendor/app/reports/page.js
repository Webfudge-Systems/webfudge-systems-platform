'use client'

import { useState } from 'react'
import Link from 'next/link'
import { KPICard, LoadingSpinner, Table } from '@webfudge/ui'
import {
  Wallet,
  TrendingUp,
  Building2,
  UserMinus,
  BarChart3,
  Users,
  Repeat,
  Download,
  Trophy,
  Factory,
  PieChart as PieIcon,
  Layers,
} from 'lucide-react'
import VendorPageHeader from '../../components/VendorPageHeader'
import { BarList, ErrorState, Panel, RefreshButton, Segmented, StageBadge } from '../../components/VendorUI'
import { DonutChart, StackedRevenueChart, TrendAreaChart, TrendLineChart, appSeries } from '../../components/Charts'
import vendorApi from '../../lib/api'
import useVendorQuery from '../../lib/useVendorQuery'
import { downloadCsv } from '../../lib/csv'
import {
  appColor,
  cycleLabel,
  formatDate,
  formatINR,
  formatINRCompact,
  formatNumber,
  formatPercent,
  industryLabel,
  PAYMENT_KIND,
  planLabel,
  sizeLabel,
  stageLabel,
} from '../../lib/format'

const RANGES = [
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '6m', label: '6 months' },
  { value: '12m', label: '12 months' },
  { value: 'all', label: 'All time' },
]

const STAGE_COLORS = {
  paying: '#10B981',
  trial: '#F5630F',
  free: '#38BDF8',
  at_risk: '#F59E0B',
  churned: '#9CA3AF',
  suspended: '#EF4444',
  no_apps: '#E5E7EB',
}

function CsvButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Download CSV"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600"
    >
      <Download className="h-4 w-4" />
    </button>
  )
}

export default function ReportsPage() {
  const [range, setRange] = useState('12m')
  const { data, error, loading, refreshing, refresh } = useVendorQuery((opts) => vendorApi.reports(range, opts), [range])
  const t = data?.totals
  const rangeLabel = RANGES.find((r) => r.value === range)?.label.toLowerCase()
  const stamp = () => `${range}-${new Date().toISOString().slice(0, 10)}`

  const exportSeries = () =>
    downloadCsv(
      `webfudge-report-${stamp()}`,
      [
        { label: 'Period', value: (r) => r.label },
        { label: 'Net revenue (INR)', value: (r) => r.revenue },
        { label: 'GST (INR)', value: (r) => r.gst },
        ...(data?.apps || []).map((a) => ({ label: `${a.name} revenue (INR)`, value: (r) => r[`app_${a.slug}`] || 0 })),
        { label: 'New organizations', value: (r) => r.organizations },
        { label: 'New users', value: (r) => r.users },
        { label: 'Trials started', value: (r) => r.trials },
        { label: 'Conversions', value: (r) => r.conversions },
        { label: 'Churned subscriptions', value: (r) => r.churned },
      ],
      data?.series || []
    )

  const exportRows = (name, rows, valueLabel) =>
    downloadCsv(`${name}-${stamp()}`, [{ label: 'Name', value: (r) => r.name }, { label: valueLabel, value: (r) => r.value }], rows)

  const topColumns = [
    {
      key: 'rank',
      label: '#',
      render: (_, r) => <span className="font-semibold tabular-nums text-gray-400">{data.topOrganizations.indexOf(r) + 1}</span>,
    },
    {
      key: 'name',
      label: 'Organization',
      render: (v, r) => (
        <Link href={`/organizations/${r.id}`} className="font-semibold text-gray-900 hover:text-orange-600">
          {v}
        </Link>
      ),
    },
    { key: 'stage', label: 'Stage', render: (v) => (v ? <StageBadge stage={v} /> : '—') },
    { key: 'apps', label: 'Apps', render: (v) => <span className="text-gray-600">{v.join(', ') || '—'}</span> },
    { key: 'seats', label: 'Paid seats', render: (v) => <span className="tabular-nums text-gray-700">{v}</span> },
    { key: 'mrr', label: 'MRR now', render: (v) => <span className="tabular-nums text-gray-700">{v ? formatINR(v) : '—'}</span> },
    { key: 'revenue', label: `Revenue (${rangeLabel})`, render: (v) => <span className="font-semibold tabular-nums text-gray-900">{formatINR(v)}</span> },
  ]

  return (
    <div className="min-h-full space-y-6 bg-white p-4 md:p-6">
      <VendorPageHeader
        title="Reports"
        subtitle="Revenue, growth, conversion and churn across the platform"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Reports', href: '/reports' },
        ]}
        showActions
        onExportClick={data ? exportSeries : undefined}
        actions={<RefreshButton onClick={refresh} refreshing={refreshing} />}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented options={RANGES} value={range} onChange={setRange} />
        {data ? (
          <p className="text-sm text-gray-500">
            {formatDate(data.range.from)} – {formatDate(data.range.to)} · grouped by {data.range.unit}
          </p>
        ) : null}
      </div>

      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" message="Building report..." />
        </div>
      ) : data ? (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard
              title="Net revenue"
              value={formatINRCompact(t.netRevenue)}
              valueTitle={formatINR(t.netRevenue)}
              subtitle={`${formatINRCompact(t.grossRevenue)} incl. ${formatINRCompact(t.gst)} GST`}
              icon={Wallet}
              colorScheme="orange"
            />
            <KPICard
              title="Trial → paid"
              value={formatPercent(t.conversionRate)}
              subtitle={`${t.conversions} conversions from ${t.trialsStarted} trials`}
              icon={TrendingUp}
              colorScheme="orange"
            />
            <KPICard
              title="New organizations"
              value={formatNumber(t.newOrganizations)}
              subtitle={`${formatNumber(t.newUsers)} new users`}
              icon={Building2}
              colorScheme="orange"
            />
            <KPICard
              title="Churned subscriptions"
              value={formatNumber(t.churnedSubscriptions)}
              subtitle={`${t.churnedPaidSubscriptions} were paid · ${t.churnedSubscriptions - t.churnedPaidSubscriptions} trials`}
              icon={UserMinus}
              colorScheme="orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: 'MRR now', value: formatINR(t.mrr) },
              { label: 'ARR now', value: formatINR(t.arr) },
              { label: 'ARPA (MRR per paying org)', value: formatINR(t.arpa) },
              { label: 'Average invoice', value: formatINR(t.averageOrderValue) },
              { label: 'Paid invoices', value: formatNumber(t.payments) },
              { label: 'Failed payments', value: formatNumber(t.failedPayments) },
              { label: 'Paying organizations', value: formatNumber(t.payingOrganizations) },
              { label: 'Trials started', value: formatNumber(t.trialsStarted) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-medium text-gray-500">{s.label}</p>
                <p className="mt-0.5 text-lg font-bold tabular-nums text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <Panel
            title="Revenue by app"
            subtitle={`Paid invoices per ${data.range.unit}, excl. GST`}
            action={<CsvButton onClick={exportSeries} />}
            icon={BarChart3}
          >
            <StackedRevenueChart data={data.series} series={appSeries(data.apps, 'app_')} height={300} />
          </Panel>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel title="Sign-ups" subtitle={`New organizations and users per ${data.range.unit}`} icon={Users}>
              <TrendAreaChart
                data={data.series}
                series={[
                  { key: 'organizations', name: 'Organizations', color: '#F5630F' },
                  { key: 'users', name: 'Users', color: '#1F4FFF' },
                ]}
              />
            </Panel>
            <Panel title="Trials, conversions and churn" subtitle="Subscriptions started, first payments and locks" icon={Repeat}>
              <TrendLineChart
                data={data.series}
                series={[
                  { key: 'trials', name: 'Trials started', color: '#FDBA74' },
                  { key: 'conversions', name: 'Converted to paid', color: '#10B981' },
                  { key: 'churned', name: 'Churned', color: '#9CA3AF' },
                ]}
              />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="Revenue by app" subtitle={`Net, ${rangeLabel}`} action={<CsvButton onClick={() => exportRows('revenue-by-app', data.revenueByApp, 'Net revenue (INR)')} />}>
              <DonutChart
                money
                centerLabel="net revenue"
                rows={data.revenueByApp.map((r) => ({ ...r, color: appColor(data.apps.find((a) => a.slug === r.key) || { slug: r.key }) }))}
              />
            </Panel>
            <Panel title="Revenue by plan" subtitle={`Net, ${rangeLabel}`} action={<CsvButton onClick={() => exportRows('revenue-by-plan', data.revenueByPlan, 'Net revenue (INR)')} />}>
              <BarList rows={data.revenueByPlan.map((r) => ({ ...r, name: planLabel(r.key) }))} format={formatINR} />
            </Panel>
            <Panel title="MRR by app" subtitle="Current recurring revenue" icon={Layers}>
              <BarList rows={data.mrrByApp} format={formatINR} colorFor={(r) => appColor(data.apps.find((a) => a.slug === r.key) || { slug: r.key })} />
            </Panel>
            <Panel title="Billing cycle" subtitle={`Net revenue, ${rangeLabel}`}>
              <BarList rows={data.revenueByCycle.map((r) => ({ ...r, name: cycleLabel(r.key) }))} format={formatINR} colorFor={() => '#1F4FFF'} />
            </Panel>
            <Panel title="Payment type" subtitle={`Net revenue, ${rangeLabel}`}>
              <BarList rows={data.revenueByKind.map((r) => ({ ...r, name: PAYMENT_KIND[r.key] || r.key }))} format={formatINR} colorFor={() => '#0E9F6E'} />
            </Panel>
            <Panel title="Organizations by stage" subtitle="All organizations, today" icon={PieIcon}>
              <DonutChart
                centerLabel="organizations"
                rows={data.organizationsByStage.map((r) => ({ name: stageLabel(r.key), value: r.value, color: STAGE_COLORS[r.key] }))}
              />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Industry" subtitle="All organizations" icon={Factory} action={<CsvButton onClick={() => exportRows('organizations-by-industry', data.organizationsByIndustry.map((r) => ({ ...r, name: industryLabel(r.key) })), 'Organizations')} />}>
              <BarList rows={data.organizationsByIndustry.map((r) => ({ ...r, name: industryLabel(r.key) }))} format={formatNumber} />
            </Panel>
            <Panel title="Company size" subtitle="All organizations" icon={Building2} action={<CsvButton onClick={() => exportRows('organizations-by-size', data.organizationsBySize.map((r) => ({ ...r, name: sizeLabel(r.key) })), 'Organizations')} />}>
              <BarList rows={data.organizationsBySize.map((r) => ({ ...r, name: sizeLabel(r.key) }))} format={formatNumber} colorFor={() => '#7A3FF2'} />
            </Panel>
          </div>

          <Panel
            title="Top organizations by revenue"
            subtitle={`Net revenue, ${rangeLabel}`}
            icon={Trophy}
            action={
              <CsvButton
                onClick={() =>
                  downloadCsv(
                    `top-organizations-${stamp()}`,
                    [
                      { label: 'Organization', value: (r) => r.name },
                      { label: 'Stage', value: (r) => stageLabel(r.stage) },
                      { label: 'Apps', value: (r) => r.apps.join('; ') },
                      { label: 'Paid seats', value: (r) => r.seats },
                      { label: 'MRR now (INR)', value: (r) => r.mrr },
                      { label: 'Revenue (INR)', value: (r) => r.revenue },
                    ],
                    data.topOrganizations
                  )
                }
              />
            }
          >
            {data.topOrganizations.length ? (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <Table columns={topColumns} data={data.topOrganizations} keyField="id" variant="modernEmbedded" />
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-8 text-center text-sm text-gray-500">
                No paid invoices in this period.
              </p>
            )}
          </Panel>

          <p className="pb-2 text-center text-xs text-gray-400">
            Revenue counts paid invoices by payment date and excludes GST. Conversions are first payments on a subscription. Churn counts subscriptions that locked in the period.
          </p>
        </div>
      ) : null}
    </div>
  )
}
