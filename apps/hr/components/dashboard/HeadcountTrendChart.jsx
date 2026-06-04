'use client'

import { useId, useMemo } from 'react'
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
import HRGlassCard from '../shared/HRGlassCard'
import HRPanelHeader from '../shared/HRPanelHeader'
import { buildHeadcountTrendFromEmployees, headcountYAxisMax } from '../../lib/headcountTrend'

const CHART_TOOLTIP_STYLE = {
  borderRadius: '0.75rem',
  border: '1px solid rgba(251, 146, 60, 0.35)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  color: '#111827',
  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
}

function formatHeadcount(value) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? `${Math.round(n)} people` : '0 people'
}

export default function HeadcountTrendChart({ employees, monthCount = 6, className = '' }) {
  const gradientId = useId().replace(/:/g, '')

  const data = useMemo(
    () => buildHeadcountTrendFromEmployees(employees, monthCount),
    [employees, monthCount]
  )

  const yMax = useMemo(() => headcountYAxisMax(data.map((d) => d.count)), [data])
  const latest = data[data.length - 1]?.count ?? 0
  const first = data[0]?.count ?? 0
  const delta = latest - first

  return (
    <HRGlassCard className={className}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <HRPanelHeader
            className="mb-0"
            title="Headcount trend"
            subtitle={`Active team size · last ${monthCount} months`}
            icon={TrendingUp}
          />
        </div>
        <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-4">
          <span className="rounded-full border border-orange-200/80 bg-white/70 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
            From roster
          </span>
          <div className="text-right">
            <p className="text-2xl font-bold tracking-tight text-gray-900">{latest}</p>
            <p className="text-xs text-gray-500">
              {delta >= 0 ? '+' : ''}
              {delta} vs {data[0]?.month ?? 'start'}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.32} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="4 4" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 12, fill: '#64748b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, yMax]}
              allowDecimals={false}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
              width={36}
            />
            <Tooltip
              formatter={(value) => formatHeadcount(value)}
              labelStyle={{ fontWeight: 600, color: '#111827' }}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Area
              type="monotone"
              dataKey="count"
              name="Headcount"
              stroke="#ea580c"
              strokeWidth={2.5}
              fill={`url(#${gradientId})`}
              dot={{ r: 4, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#c2410c', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </HRGlassCard>
  )
}
