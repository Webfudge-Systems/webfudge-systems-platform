'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import HRAnalyticsChartCard from '../HRAnalyticsChartCard'
import {
  HR_CHART_GRID,
  HR_CHART_TICK,
  HR_CHART_TICK_MUTED,
  HR_CHART_TOOLTIP,
  HR_ORANGE_FILL,
  HR_SLATE_BAR,
} from './chartPrimitives'

export default function HiresExitsChart({ data, className = '' }) {
  return (
    <HRAnalyticsChartCard
      className={className}
      title="Hires vs exits"
      subtitle="Last 6 months"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={6}>
          <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART_GRID} vertical={false} />
          <XAxis dataKey="month" tick={HR_CHART_TICK} axisLine={false} tickLine={false} />
          <YAxis tick={HR_CHART_TICK_MUTED} axisLine={false} tickLine={false} width={28} allowDecimals={false} />
          <Tooltip contentStyle={HR_CHART_TOOLTIP} />
          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
          <Bar dataKey="hires" name="Hires" fill={HR_ORANGE_FILL} radius={[4, 4, 0, 0]} maxBarSize={32} />
          <Bar dataKey="exits" name="Exits" fill={HR_SLATE_BAR} radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </HRAnalyticsChartCard>
  )
}
