'use client'

import { useId, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import {
  Button,
  DashboardChartCanvas,
  DASHBOARD_CHART_ACCENT,
  EmptyState,
} from '@webfudge/ui'
import HRDashboardInsightShell, { HRInsightCountBadge } from './HRDashboardInsightShell'
import { buildHeadcountTrendFromEmployees, headcountYAxisMax } from '../../lib/headcountTrend'

function formatHeadcount(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? `${Math.round(n)} people` : '0 people'
}

function buildYAxisTicks(max) {
  if (max <= 0) return [0, 5]
  const step = max <= 25 ? 5 : max <= 50 ? 10 : max <= 100 ? 20 : 50
  const ticks = []
  for (let value = 0; value <= max; value += step) ticks.push(value)
  return ticks
}

function HeadcountTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const value = payload[0]?.value
  return (
    <div className="min-w-[9rem] rounded-xl border border-gray-200/90 bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums text-gray-900">{formatHeadcount(value)}</p>
    </div>
  )
}

export default function HeadcountTrendChart({ employees, monthCount = 6, className = '' }) {
  const router = useRouter()
  const gradientId = useId().replace(/:/g, '')

  const data = useMemo(
    () => buildHeadcountTrendFromEmployees(employees, monthCount),
    [employees, monthCount]
  )

  const yMax = useMemo(() => headcountYAxisMax(data.map((d) => d.count)), [data])
  const yTicks = useMemo(() => buildYAxisTicks(yMax), [yMax])
  const latest = data[data.length - 1]?.count ?? 0
  const first = data[0]?.count ?? 0
  const delta = latest - first
  const hasData = data.some((d) => d.count > 0)

  return (
    <HRDashboardInsightShell
      className={`w-full ${className}`.trim()}
      title="Headcount trend"
      badge={latest > 0 ? <HRInsightCountBadge tone="orange">{latest}</HRInsightCountBadge> : null}
      subtitle={`Active team size · last ${monthCount} months · ${delta >= 0 ? '+' : ''}${delta} vs ${data[0]?.month ?? 'start'}`}
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/employees')}
          className="!h-7 !px-2 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
        >
          View all
        </Button>
      }
      panelClassName="overflow-hidden p-2 sm:p-3"
    >
      {!hasData ? (
        <EmptyState
          icon={TrendingUp}
          title="No headcount data"
          description="Employee join dates will populate this trend."
          className="py-8"
        />
      ) : (
        <DashboardChartCanvas className="h-[260px]">
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={DASHBOARD_CHART_ACCENT} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={DASHBOARD_CHART_ACCENT} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, yMax]}
                ticks={yTicks}
                allowDecimals={false}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<HeadcountTooltip />} />
              <Area
                type="monotone"
                dataKey="count"
                name="Headcount"
                stroke={DASHBOARD_CHART_ACCENT}
                strokeWidth={2.5}
                fill={`url(#${gradientId})`}
                dot={{ r: 4, fill: DASHBOARD_CHART_ACCENT, stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#c2410c', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </DashboardChartCanvas>
      )}
    </HRDashboardInsightShell>
  )
}
