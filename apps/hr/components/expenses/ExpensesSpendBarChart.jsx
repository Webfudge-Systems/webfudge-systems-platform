'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  DashboardChartPanel,
  DashboardChartEmpty,
  DashboardChartCanvas,
  DashboardProgressRow,
  DASHBOARD_CHART_ACCENT,
  DASHBOARD_BAR_TOOLTIP_CURSOR,
  PRIMARY_ORANGE_SHADES,
} from '@webfudge/ui'
import { formatExpenseAmount } from '../../lib/expensesShared'

function shortenLabel(name) {
  const s = String(name || '').trim()
  if (!s) return '—'
  return s.length > 14 ? `${s.slice(0, 12)}…` : s
}

function ExpenseAmountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const entry = payload[0]
  const row = entry?.payload
  const name = row?.fullName ?? row?.name ?? label ?? '—'
  const value = Number(entry?.value) || 0

  return (
    <div className="min-w-[9rem] rounded-xl border border-gray-200/90 bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-900">{name}</p>
      <p className="mt-1 text-xs text-gray-600">
        <span className="font-bold tabular-nums text-gray-900">{formatExpenseAmount(value)}</span>
      </p>
    </div>
  )
}

export default function ExpensesSpendBarChart({
  title,
  subtitle,
  icon,
  data = [],
  emptyMessage = 'No spend data for this period.',
  className = '',
  chartClassName = 'h-72',
  multicolor = true,
  showLegend = true,
}) {
  const rows = useMemo(() => {
    const filtered = data
      .map((row) => ({
        name: row.name,
        fullName: row.name,
        value: Number(row.value) || 0,
      }))
      .filter((row) => row.value > 0)
    const total = filtered.reduce((sum, row) => sum + row.value, 0)
    return filtered.map((row, index) => ({
      ...row,
      chartName: shortenLabel(row.name),
      pct: total > 0 ? Math.round((row.value / total) * 100) : 0,
      color: multicolor
        ? PRIMARY_ORANGE_SHADES[index % PRIMARY_ORANGE_SHADES.length]
        : DASHBOARD_CHART_ACCENT,
      barColor: 'orange',
    }))
  }, [data, multicolor])

  const chartData = useMemo(
    () => rows.map((row) => ({ name: row.chartName, fullName: row.fullName, value: row.value })),
    [rows],
  )

  const hasData = rows.length > 0

  return (
    <DashboardChartPanel
      title={title}
      subtitle={subtitle}
      icon={icon}
      brandChart
      chartClassName={chartClassName}
      className={className}
    >
      {!hasData ? (
        <DashboardChartEmpty message={emptyMessage} />
      ) : (
        <div className="flex min-h-[15rem] flex-col gap-3">
          <DashboardChartCanvas className="min-h-[11rem] flex-1">
            <ResponsiveContainer width="100%" height="100%" minHeight={200}>
              <BarChart data={chartData} margin={{ top: 12, right: 12, left: 4, bottom: 4 }} barCategoryGap="22%">
                <CartesianGrid strokeDasharray="3 6" stroke="#e5e7eb" strokeOpacity={0.65} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#4b5563', fontWeight: 600 }}
                  axisLine={{ stroke: '#f3f4f6' }}
                  tickLine={false}
                  dy={8}
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af', fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)}
                />
                <Tooltip
                  content={<ExpenseAmountTooltip />}
                  cursor={DASHBOARD_BAR_TOOLTIP_CURSOR}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName}
                />
                <Bar dataKey="value" fill={DASHBOARD_CHART_ACCENT} radius={[8, 8, 0, 0]} maxBarSize={52}>
                  {chartData.map((row, index) => (
                    <Cell
                      key={row.fullName}
                      fill={
                        multicolor
                          ? PRIMARY_ORANGE_SHADES[index % PRIMARY_ORANGE_SHADES.length]
                          : DASHBOARD_CHART_ACCENT
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </DashboardChartCanvas>
          {showLegend && rows.length > 0 ? (
            <div className="divide-y divide-gray-100/90 border-t border-gray-100/90">
              {rows.map((row) => (
                <div key={row.fullName} className="px-1 py-2">
                  <DashboardProgressRow
                    label={row.fullName}
                    meta={`${formatExpenseAmount(row.value)} · ${row.pct}%`}
                    percent={row.pct}
                    avatarFallback={row.fullName.charAt(0).toUpperCase()}
                    avatarClassName="bg-orange-500 text-white"
                    barColor={row.barColor}
                    showPercent={false}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </DashboardChartPanel>
  )
}
