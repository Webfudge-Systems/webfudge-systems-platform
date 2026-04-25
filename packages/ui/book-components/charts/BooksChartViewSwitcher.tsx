'use client'

import { useId, useMemo, useState } from 'react'
import { BarChart3, Filter, Info } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button, Card } from '@webfudge/ui'

export type AnalyticsAreaPoint = {
  month: string
  amount: number
}

export type ProfitLossMonth = {
  month: string
  profit: number
  loss: number
}

export type BooksChartViewSwitcherProps = {
  salesValue: string
  salesSubLabel?: string
  salesTrendLabel?: string
  salesTrendPositive?: boolean
  conversionValue: string
  conversionSubLabel?: string
  conversionTrendLabel?: string
  conversionTrendPositive?: boolean
  analyticsData: AnalyticsAreaPoint[]
  profitLossData: ProfitLossMonth[]
  plSubtitle?: string
  sectionTitle?: string
  profitLabel?: string
  lossLabel?: string
  periodLabel?: string
  onPeriodClick?: () => void
  onFiltersClick?: () => void
  className?: string
  defaultView?: ChartViewMode
  lockView?: boolean
  plHeaderTitle?: string
}

function formatAxisK(v: number) {
  if (v === 0) return '00'
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  return String(Math.round(v))
}

function tooltipPLNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function plYAxisMax(rows: ProfitLossMonth[]) {
  let max = 0
  for (const r of rows) {
    max = Math.max(max, r.profit, r.loss, r.profit + r.loss)
  }
  if (max <= 0) return 50_000
  const padded = max * 1.12
  const step = 5000
  return Math.max(step, Math.ceil(padded / step) * step)
}

export type ChartViewMode = 'analytics' | 'pl'

export function BooksChartViewSwitcher({
  salesValue,
  salesSubLabel = 'sales',
  salesTrendLabel = '↓ 0.4%',
  salesTrendPositive = false,
  conversionValue,
  conversionSubLabel = 'Conv. rate',
  conversionTrendLabel = '↑ 13%',
  conversionTrendPositive = true,
  analyticsData,
  profitLossData,
  plSubtitle = 'Stacked income vs spend by month',
  sectionTitle = 'Bars overview',
  profitLabel = 'Profit',
  lossLabel = 'Loss',
  periodLabel = 'This year',
  onPeriodClick,
  onFiltersClick,
  className,
  defaultView = 'analytics',
  lockView = false,
  plHeaderTitle = 'Total Income',
}: BooksChartViewSwitcherProps) {
  const [view, setView] = useState<ChartViewMode>(defaultView)
  const uid = useId().replace(/:/g, '')
  const hatchAnalyticsId = `books-switch-analytics-hatch-${uid}`
  const hatchBarId = `books-switch-bar-hatch-${uid}`

  const plHasData = useMemo(
    () => profitLossData.some((r) => (r.profit ?? 0) > 0 || (r.loss ?? 0) > 0),
    [profitLossData]
  )
  const plYMax = useMemo(() => plYAxisMax(profitLossData), [profitLossData])

  return (
    <Card
      variant="elevated"
      padding={false}
      className={twMerge(
        'flex h-full min-h-0 min-w-0 flex-col overflow-hidden !bg-[var(--books-bg-card,#ffffff)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]',
        className
      )}
    >
      <div className="flex shrink-0 flex-col gap-3 p-6 pb-0 pt-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between md:px-7 md:pt-7">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight text-[var(--books-text-primary,#111827)]">
              {view === 'analytics' ? 'Analytics' : plHeaderTitle}
            </h2>
            {view === 'analytics' ? (
              <button
                type="button"
                className="rounded-lg p-1 text-[var(--books-text-tertiary,#9ca3af)] transition-colors hover:bg-[var(--books-bg-elevated,#f3f4f6)] hover:text-[var(--books-text-secondary,#4b5563)]"
                aria-label="About analytics"
              >
                <Info className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          {view === 'pl' ? (
            <p className="mt-1 text-sm text-[var(--books-text-secondary,#6b7280)]">{plSubtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {view === 'analytics' ? (
            <>
              <Button
                type="button"
                variant="muted"
                size="sm"
                rounded="pill"
                className="border border-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-elevated,#f9fafb)] px-3 text-xs font-semibold text-[var(--books-text-secondary,#374151)]"
                onClick={onPeriodClick}
              >
                {periodLabel}
              </Button>
              <Button
                type="button"
                variant="muted"
                size="sm"
                rounded="pill"
                className="border border-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-elevated,#f9fafb)] px-3 text-xs font-semibold text-[var(--books-text-secondary,#374151)]"
                onClick={onFiltersClick}
              >
                <Filter className="mr-1.5 h-3.5 w-3.5 text-[var(--books-text-secondary,#6b7280)]" aria-hidden />
                Filters
              </Button>
            </>
          ) : null}
          {!lockView ? (
            <select
              id={`books-chart-view-${uid}`}
              aria-label="Chart view"
              value={view}
              onChange={(e) => setView(e.target.value as ChartViewMode)}
              className={clsx(
                'min-w-[10.5rem] cursor-pointer rounded-full border border-orange-200/90 py-2 pl-3 pr-9 text-sm font-semibold shadow-sm',
                'bg-[var(--books-input-bg,#ffffff)] text-[var(--books-input-text,#1f2937)]',
                'transition-all duration-200 hover:border-orange-300 hover:bg-[var(--books-bg-elevated,#fff7ed)] focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25'
              )}
            >
              <option value="analytics">Analytics</option>
              <option value="pl">Profit &amp; Loss</option>
            </select>
          ) : null}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 px-6 pb-6 md:px-7 md:pb-7">
        <div
          className={clsx(
            'absolute inset-0 flex min-h-0 flex-col gap-6 overflow-hidden transition-opacity duration-300 ease-out',
            view === 'analytics' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
          )}
          aria-hidden={view !== 'analytics'}
        >
          <div className="grid shrink-0 gap-6 sm:grid-cols-2">
            <div>
              <p className="text-2xl font-bold tracking-tight text-[var(--books-text-primary,#111827)] sm:text-3xl">
                {salesValue}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-[var(--books-text-secondary,#6b7280)]">{salesSubLabel}</span>
                {salesTrendLabel ? (
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      salesTrendPositive
                        ? 'bg-[var(--books-green-bg,rgba(16,185,129,0.1))] text-[var(--books-green,#059669)]'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400'
                    )}
                  >
                    {salesTrendLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight text-[var(--books-text-primary,#111827)] sm:text-3xl">
                {conversionValue}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-sm text-[var(--books-text-secondary,#6b7280)]">{conversionSubLabel}</span>
                {conversionTrendLabel ? (
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-xs font-semibold',
                      conversionTrendPositive
                        ? 'bg-[var(--books-green-bg,rgba(16,185,129,0.1))] text-[var(--books-green,#059669)]'
                        : 'bg-red-500/15 text-red-600 dark:text-red-400'
                    )}
                  >
                    {conversionTrendLabel}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <div className="h-full min-h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analyticsData} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
                  <defs>
                    <pattern
                      id={hatchAnalyticsId}
                      patternUnits="userSpaceOnUse"
                      width="10"
                      height="10"
                      patternTransform="rotate(-45)"
                    >
                      <rect width="10" height="10" fill="#ffedd5" />
                      <path
                        d="M0 10 L10 0"
                        stroke="#fb923c"
                        strokeOpacity={0.45}
                        strokeWidth={1.2}
                      />
                    </pattern>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--books-chart-grid, #e5e7eb)" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: 'var(--books-chart-tick, #6b7280)', fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tickFormatter={formatAxisK}
                    tick={{ fontSize: 11, fill: 'var(--books-chart-tick-muted, #9ca3af)' }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: '1px solid var(--books-tooltip-border, #fed7aa)',
                      backgroundColor: 'var(--books-tooltip-bg, #ffffff)',
                      color: 'var(--books-tooltip-text, #111827)',
                      boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                    }}
                    labelStyle={{ color: 'var(--books-tooltip-text, #111827)', fontWeight: 600 }}
                    itemStyle={{ color: 'var(--books-tooltip-text, #111827)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Amount"
                    stroke="#ea580c"
                    strokeWidth={2}
                    fill={`url(#${hatchAnalyticsId})`}
                    fillOpacity={0.85}
                    dot={{ r: 3, fill: '#ea580c', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#c2410c', stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div
          className={clsx(
            'absolute inset-0 flex min-h-0 flex-col gap-6 overflow-hidden transition-opacity duration-300 ease-out',
            view === 'pl' ? 'z-10 opacity-100' : 'z-0 opacity-0 pointer-events-none'
          )}
          aria-hidden={view !== 'pl'}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--books-text-primary,#111827)]">{sectionTitle}</h3>
            <div className="flex items-center gap-4 rounded-full border border-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-elevated,#f9fafb)] px-3 py-1.5 text-[12px] font-medium text-[var(--books-text-secondary,#374151)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#EA580C]" aria-hidden />
                {profitLabel}
              </span>
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-[var(--books-chart-loss,#1c1c1c)]"
                  aria-hidden
                />
                {lossLabel}
              </span>
            </div>
          </div>
          <div className="relative min-h-0 flex-1">
            <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
              {!plHasData ? (
                <div className="mb-4 flex min-h-[220px] flex-1 items-center justify-center">
                  <div className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl border border-dashed border-[color:var(--books-border,rgba(0,0,0,0.12))] bg-[var(--books-bg-elevated,#f9fafb)] px-6 py-10 text-center">
                    <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--books-orange-bg,rgba(234,88,12,0.1))] text-[var(--books-orange-text,#ea580c)]">
                      <BarChart3 className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="text-sm font-semibold text-[var(--books-text-primary,#111827)]">No chart data yet</p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--books-text-secondary,#6b7280)]">
                      No income or expenses in this period yet. Bars will appear as you record invoices and expenses.
                    </p>
                  </div>
                </div>
              ) : null}
              {plHasData ? (
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={profitLossData}
                      barCategoryGap={8}
                      barGap={4}
                      margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <pattern
                          id={hatchBarId}
                          patternUnits="userSpaceOnUse"
                          width="6"
                          height="6"
                          patternTransform="rotate(45)"
                        >
                          <rect width="6" height="6" fill="transparent" />
                          <line x1="0" y1="0" x2="0" y2="6" stroke="#EA580C" strokeWidth="2.4" />
                        </pattern>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="var(--books-chart-grid, #e5e7eb)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 11, fill: 'var(--color-text-secondary, #6b7280)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, Math.max(50_000, plYMax)]}
                        ticks={[0, 10000, 20000, 30000, 40000, 50000]}
                        tickFormatter={formatAxisK}
                        tick={{ fontSize: 11, fill: 'var(--color-text-secondary, #6b7280)' }}
                        axisLine={false}
                        tickLine={false}
                        width={44}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          tooltipPLNumber(value).toLocaleString(),
                          String(name ?? ''),
                        ]}
                        labelFormatter={(label) => `Month: ${String(label ?? '')}`}
                        contentStyle={{
                          borderRadius: 8,
                          border: '0.5px solid var(--books-tooltip-border, #e5e7eb)',
                          backgroundColor: 'var(--books-tooltip-bg, #ffffff)',
                          color: 'var(--books-tooltip-text, #111827)',
                          fontSize: 12,
                          padding: '8px 12px',
                        }}
                      />
                      <Bar
                        dataKey="profit"
                        name={profitLabel}
                        fill={`url(#${hatchBarId})`}
                        stroke="#EA580C"
                        strokeWidth={1}
                        radius={[3, 3, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="loss"
                        name={lossLabel}
                        fill="var(--books-chart-loss, #1c1c1c)"
                        radius={[3, 3, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

    </Card>
  )
}
