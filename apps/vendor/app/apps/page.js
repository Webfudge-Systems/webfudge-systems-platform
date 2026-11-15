'use client'

import { KPICard, LoadingSpinner } from '@webfudge/ui'
import { Boxes, IndianRupee, Users, Hourglass, Check, Star } from 'lucide-react'
import VendorPageHeader from '../../components/VendorPageHeader'
import { AppIcon, EmptyLine, ErrorState, Pill, RefreshButton } from '../../components/VendorUI'
import vendorApi from '../../lib/api'
import useVendorQuery from '../../lib/useVendorQuery'
import { appColor, formatINR, formatINRCompact, formatNumber } from '../../lib/format'

function PlanRow({ plan }) {
  const yearly = plan.pricePerUserMonthly * (1 - (plan.yearlyDiscountPercent ?? 15) / 100)
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
            {plan.name}
            {plan.isPopular ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Popular" /> : null}
            {!plan.isActive ? <Pill className="border-gray-200 bg-gray-100 text-gray-500">Hidden</Pill> : null}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">{plan.description || plan.code}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold tabular-nums text-gray-900">
            {plan.pricePerUserMonthly ? formatINR(plan.pricePerUserMonthly) : 'Free'}
            {plan.pricePerUserMonthly ? <span className="text-xs font-normal text-gray-500"> /user/mo</span> : null}
          </p>
          {plan.pricePerUserMonthly ? (
            <p className="text-[11px] text-gray-500">
              {formatINR(yearly)} yearly ({plan.yearlyDiscountPercent}% off)
            </p>
          ) : plan.maxUsers ? (
            <p className="text-[11px] text-gray-500">Up to {plan.maxUsers} users</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-gray-50 px-3 py-2 text-center">
        <div>
          <p className="text-[11px] text-gray-500">Subscribers</p>
          <p className="text-sm font-bold tabular-nums text-gray-900">{formatNumber(plan.subscribers)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">Seats</p>
          <p className="text-sm font-bold tabular-nums text-gray-900">{formatNumber(plan.seats)}</p>
        </div>
        <div>
          <p className="text-[11px] text-gray-500">MRR</p>
          <p className="text-sm font-bold tabular-nums text-gray-900">{formatINRCompact(plan.mrr)}</p>
        </div>
      </div>
      {plan.features?.length ? (
        <ul className="mt-3 space-y-1">
          {plan.features.slice(0, 4).map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export default function AppsPage() {
  const { data, error, loading, refreshing, refresh } = useVendorQuery((opts) => vendorApi.apps(opts), [])
  const apps = data?.data || []
  const totals = apps.reduce(
    (acc, a) => ({
      subs: acc.subs + a.stats.subscriptions,
      mrr: acc.mrr + a.stats.mrr,
      seats: acc.seats + a.stats.seats,
      trial: acc.trial + a.stats.trial,
    }),
    { subs: 0, mrr: 0, seats: 0, trial: 0 }
  )

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VendorPageHeader
        title="Apps & plans"
        subtitle="The catalogue customers buy from, and how each plan is doing"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Apps & plans', href: '/apps' },
        ]}
        actions={<RefreshButton onClick={refresh} refreshing={refreshing} />}
      />

      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" message="Loading catalogue..." />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard title="Apps" value={formatNumber(apps.length)} subtitle={`${apps.filter((a) => a.availability === 'available').length} available, ${apps.filter((a) => a.availability === 'coming_soon').length} coming soon`} icon={Boxes} colorScheme="orange" />
            <KPICard title="Subscriptions" value={formatNumber(totals.subs)} subtitle="Across every app" icon={Users} colorScheme="orange" />
            <KPICard title="Active trials" value={formatNumber(totals.trial)} subtitle="Full access, no plan yet" icon={Hourglass} colorScheme="orange" />
            <KPICard title="MRR" value={formatINRCompact(totals.mrr)} valueTitle={formatINR(totals.mrr)} subtitle={`${formatNumber(totals.seats)} paid seats`} icon={IndianRupee} colorScheme="orange" />
          </div>

          {apps.length === 0 ? (
            <EmptyLine>No apps in the catalogue. The API seeds them on start when PLATFORM_MODE=saas.</EmptyLine>
          ) : (
            <div className="space-y-6">
              {apps.map((app) => (
                <section key={app.slug} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md">
                  <div
                    className="flex flex-wrap items-center gap-4 border-b border-gray-200 px-5 py-4"
                    style={{ background: `linear-gradient(90deg, ${appColor(app)}14, transparent 60%)` }}
                  >
                    <AppIcon app={app} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-gray-900">{app.name}</h2>
                        {app.availability === 'coming_soon' ? (
                          <Pill className="border-gray-200 bg-white text-gray-600">Coming soon</Pill>
                        ) : (
                          <Pill className="border-emerald-200 bg-emerald-50 text-emerald-700">Available</Pill>
                        )}
                        {!app.isActive ? <Pill className="border-red-200 bg-red-50 text-red-700">Inactive</Pill> : null}
                      </div>
                      <p className="mt-0.5 text-sm text-gray-600">{app.tagline}</p>
                    </div>
                    <dl className="grid grid-cols-4 gap-5 text-right">
                      {[
                        ['Subs', formatNumber(app.stats.subscriptions)],
                        ['Paying', formatNumber(app.stats.paying)],
                        ['Trials', formatNumber(app.stats.trial)],
                        ['MRR', formatINRCompact(app.stats.mrr)],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <dt className="text-[11px] font-medium text-gray-500">{label}</dt>
                          <dd className="text-base font-bold tabular-nums text-gray-900">{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div className="p-5">
                    {app.plans.length === 0 ? (
                      <EmptyLine>No plans for this app yet.</EmptyLine>
                    ) : (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        {app.plans.map((plan) => (
                          <PlanRow key={plan.id} plan={plan} />
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          )}
          <p className="text-center text-xs text-gray-400">Prices exclude GST. Edit plans in the Strapi admin under Content Manager → Plan.</p>
        </>
      )}
    </div>
  )
}
