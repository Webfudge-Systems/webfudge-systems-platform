'use client'

import { Card } from '@webfudge/ui'

/**
 * Books/PM-style elevated chart shell — fixed h-64 plot area so Recharts renders reliably.
 */
export default function HRAnalyticsChartCard({
  title,
  subtitle,
  badge,
  headerRight,
  children,
  chartHeightClass = 'h-64',
  className = '',
}) {
  return (
    <Card variant="elevated" padding={false} className={`overflow-hidden rounded-2xl ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {badge ? (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
              {badge}
            </span>
          ) : null}
          {headerRight}
        </div>
      </div>
      <div className={`w-full ${chartHeightClass} px-2 pb-2 pt-1 sm:px-3`}>{children}</div>
    </Card>
  )
}

export function HRAnalyticsTableSection({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search…',
  headerRight,
  children,
  resultCount,
}) {
  return (
    <Card variant="elevated" padding={false} className="overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onSearchChange ? (
            <input
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full min-w-[200px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 sm:w-56"
            />
          ) : null}
          {headerRight}
        </div>
      </div>
      {typeof resultCount === 'number' ? (
        <p className="border-b border-gray-50 px-5 py-2 text-sm text-gray-600">
          Showing <span className="font-semibold text-gray-900">{resultCount}</span> result
          {resultCount !== 1 ? 's' : ''}
        </p>
      ) : null}
      <div className="overflow-x-auto">{children}</div>
    </Card>
  )
}
