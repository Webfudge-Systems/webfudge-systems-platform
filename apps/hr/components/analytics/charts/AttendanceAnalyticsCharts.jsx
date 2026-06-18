'use client'

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
import { ATTENDANCE_ANALYTICS } from '../../../lib/mock-data/analytics'
import HRAnalyticsChartCard from '../HRAnalyticsChartCard'
import {
  HR_CHART_GRID,
  HR_CHART_TICK,
  HR_CHART_TICK_MUTED,
  HR_CHART_TOOLTIP,
  HR_ORANGE_FILL,
  HR_SLATE_BAR,
} from './chartPrimitives'

export default function AttendanceAnalyticsCharts() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <HRAnalyticsChartCard title="Weekly attendance rate" subtitle="Rolling 6-week average">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ATTENDANCE_ANALYTICS.weeklyTrend} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="hrAttGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={HR_ORANGE_FILL} stopOpacity={0.3} />
                <stop offset="100%" stopColor={HR_ORANGE_FILL} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART_GRID} vertical={false} />
            <XAxis dataKey="week" tick={HR_CHART_TICK} axisLine={false} tickLine={false} />
            <YAxis domain={[90, 100]} unit="%" tick={HR_CHART_TICK_MUTED} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={HR_CHART_TOOLTIP} formatter={(v) => [`${v}%`, 'Rate']} />
            <Area type="monotone" dataKey="rate" stroke={HR_ORANGE_FILL} strokeWidth={2} fill="url(#hrAttGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </HRAnalyticsChartCard>

      <HRAnalyticsChartCard title="Late arrivals by department" subtitle="Current month">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={ATTENDANCE_ANALYTICS.byDept} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART_GRID} horizontal={false} />
            <XAxis type="number" tick={HR_CHART_TICK_MUTED} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="dept" width={92} tick={HR_CHART_TICK} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={HR_CHART_TOOLTIP} />
            <Bar dataKey="late" fill={HR_SLATE_BAR} name="Late" radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </HRAnalyticsChartCard>
    </div>
  )
}
