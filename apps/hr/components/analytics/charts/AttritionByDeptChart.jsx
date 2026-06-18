'use client'

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ATTRITION_ANALYTICS } from '../../../lib/mock-data/analytics'
import HRAnalyticsChartCard from '../HRAnalyticsChartCard'
import { HR_CHART_GRID, HR_CHART_TICK, HR_CHART_TICK_MUTED, HR_CHART_TOOLTIP } from './chartPrimitives'

function rateColor(rate) {
  if (rate >= 3) return '#ef4444'
  if (rate >= 2) return '#f97316'
  return '#22c55e'
}

export default function AttritionByDeptChart({ className = '' }) {
  return (
    <HRAnalyticsChartCard
      className={className}
      title="Attrition by department"
      subtitle="Monthly exit rate %"
      badge="YTD"
      chartHeightClass="h-72"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={ATTRITION_ANALYTICS.byDept} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={HR_CHART_GRID} horizontal={false} />
          <XAxis type="number" unit="%" tick={HR_CHART_TICK_MUTED} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="dept" width={100} tick={HR_CHART_TICK} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={HR_CHART_TOOLTIP} formatter={(v) => [`${v}%`, 'Attrition']} />
          <Bar dataKey="rate" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {ATTRITION_ANALYTICS.byDept.map((entry) => (
              <Cell key={entry.dept} fill={rateColor(entry.rate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </HRAnalyticsChartCard>
  )
}
