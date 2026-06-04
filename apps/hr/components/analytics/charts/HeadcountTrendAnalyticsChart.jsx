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
import { headcountTrendData } from '../../../lib/analyticsPage'
import { headcountYAxisMax } from '../../../lib/headcountTrend'
import HRAnalyticsChartCard from '../HRAnalyticsChartCard'
import { HR_CHART_GRID, HR_CHART_TICK, HR_CHART_TICK_MUTED, HR_CHART_TOOLTIP, HR_ORANGE, HR_ORANGE_FILL } from './chartPrimitives'

export default function HeadcountTrendAnalyticsChart({ className = '' }) {
  const gradientId = useId().replace(/:/g, '')
  const data = useMemo(() => headcountTrendData(), [])
  const yMax = useMemo(() => headcountYAxisMax(data.map((d) => d.count)), [data])
  const latest = data[data.length - 1]?.count ?? 0
  const first = data[0]?.count ?? 0
  const delta = latest - first

  return (
    <HRAnalyticsChartCard
      className={className}
      title="Headcount trend"
      subtitle="12-month active workforce"
      badge="Live"
      headerRight={
        <div className="text-right">
          <p className="text-xl font-bold tabular-nums text-gray-900">{latest}</p>
          <p className="text-xs text-gray-500">
            {delta >= 0 ? '+' : ''}
            {delta} vs {data[0]?.month}
          </p>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={HR_ORANGE_FILL} stopOpacity={0.32} />
              <stop offset="100%" stopColor={HR_ORANGE_FILL} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 4" stroke={HR_CHART_GRID} vertical={false} />
          <XAxis dataKey="month" tick={HR_CHART_TICK} axisLine={false} tickLine={false} />
          <YAxis
            domain={[0, yMax]}
            allowDecimals={false}
            tick={HR_CHART_TICK_MUTED}
            axisLine={false}
            tickLine={false}
            width={36}
          />
          <Tooltip
            formatter={(value) => `${Math.round(Number(value))} people`}
            contentStyle={HR_CHART_TOOLTIP}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={HR_ORANGE}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={{ r: 3, fill: HR_ORANGE_FILL, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 5, fill: '#c2410c', stroke: '#fff', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </HRAnalyticsChartCard>
  )
}
