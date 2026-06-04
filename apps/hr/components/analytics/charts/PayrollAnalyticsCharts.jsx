'use client'

import { useMemo } from 'react'
import {
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { PAYROLL_ANALYTICS } from '../../../lib/mock-data/analytics'
import { payrollTrendData } from '../../../lib/analyticsPage'
import HRAnalyticsChartCard from '../HRAnalyticsChartCard'
import {
  HR_CHART_GRID,
  HR_CHART_TICK,
  HR_CHART_TICK_MUTED,
  HR_CHART_TOOLTIP,
  HR_ORANGE,
  HR_ORANGE_FILL,
  HR_PIE_COLORS,
} from './chartPrimitives'

export default function PayrollAnalyticsCharts() {
  const trend = useMemo(() => payrollTrendData(), [])

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <HRAnalyticsChartCard title="Payroll cost trend" subtitle="Gross payroll (₹L)">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 12, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART_GRID} vertical={false} />
            <XAxis dataKey="month" tick={HR_CHART_TICK} axisLine={false} tickLine={false} />
            <YAxis tick={HR_CHART_TICK_MUTED} axisLine={false} tickLine={false} width={40} />
            <Tooltip contentStyle={HR_CHART_TOOLTIP} formatter={(v) => [`₹${v}L`, 'Gross']} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={HR_ORANGE}
              strokeWidth={2.5}
              dot={{ r: 4, fill: HR_ORANGE_FILL, stroke: '#fff', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </HRAnalyticsChartCard>

      <HRAnalyticsChartCard title="Cost by department" subtitle="Share of total payroll">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={PAYROLL_ANALYTICS.byDept}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="52%"
              outerRadius="78%"
              paddingAngle={3}
            >
              {PAYROLL_ANALYTICS.byDept.map((_, i) => (
                <Cell key={i} fill={HR_PIE_COLORS[i % HR_PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={HR_CHART_TOOLTIP} formatter={(v) => [`${v}%`, 'Share']} />
            <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
      </HRAnalyticsChartCard>
    </div>
  )
}
