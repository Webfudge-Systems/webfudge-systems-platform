'use client'

import { useMemo, useState } from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Sector } from 'recharts'
import {
  DashboardChartCanvas,
  DonutChartFrame,
  DashboardProgressRow,
  DONUT_TOOLTIP_WRAPPER_STYLE,
} from '@webfudge/ui'

export const HR_SEGMENT_COLORS = [
  '#FF7A00',
  '#3B82F6',
  '#10B981',
  '#EF4444',
  '#8B5CF6',
  '#F59E0B',
  '#0EA5E9',
  '#64748B',
]

export const HR_SEGMENT_BAR_COLORS = [
  'orange',
  'blue',
  'green',
  'red',
  'purple',
  'orange',
  'blue',
  'indigo',
]

const TRACK_FILL = '#ffedd5'
const CHART_INNER = 54
const CHART_OUTER = 86

const AVATAR_BG = [
  'bg-orange-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-red-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-slate-600',
]

function ActiveSlice(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 5}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
      cornerRadius={5}
    />
  )
}

function SegmentTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="min-w-[9rem] rounded-xl border border-gray-200/90 bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-900">{row.label}</p>
      <p className="mt-1 text-xs text-gray-600">
        <span className="font-bold tabular-nums text-gray-900">{row.value}</span>
        {row.pct != null ? (
          <>
            {' '}
            · <span className="font-semibold text-orange-600">{row.pct}%</span>
          </>
        ) : null}
      </p>
    </div>
  )
}

/** HR-only department distribution donut — keeps shared DonutChartFrame UI unchanged. */
export default function HRDepartmentDistributionDonut({
  segments = [],
  centerLabel = 'total',
  colors = HR_SEGMENT_COLORS,
  barColors = HR_SEGMENT_BAR_COLORS,
  className = '',
  legendClassName,
  compact = false,
  dense = false,
  fillHeight = false,
}) {
  const [activeIndex, setActiveIndex] = useState(-1)

  const rows = useMemo(() => {
    const total = segments.reduce((sum, seg) => sum + (seg.value || 0), 0)
    return segments.map((seg, index) => {
      const value = seg.value || 0
      const pct = total > 0 ? Math.round((value / total) * 100) : 0
      const colorIndex = seg.color != null ? colors.findIndex((c) => c === seg.color) : index
      const resolvedIndex = colorIndex >= 0 ? colorIndex : index
      return {
        id: seg.id ?? seg.label ?? index,
        label: seg.label,
        value,
        pct,
        color: seg.color ?? colors[resolvedIndex % colors.length],
        barColor: seg.barColor ?? barColors[resolvedIndex % barColors.length],
        avatarClassName:
          seg.avatarClassName ??
          `${AVATAR_BG[resolvedIndex % AVATAR_BG.length]} text-white`,
      }
    })
  }, [segments, colors, barColors])

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.value, 0), [rows])
  const pieData = useMemo(
    () => rows.map((row) => ({ name: row.label, value: row.value, label: row.label, pct: row.pct })),
    [rows]
  )
  const trackData = [{ value: 1 }]

  const chartInner = compact ? 38 : dense ? 46 : CHART_INNER
  const chartOuter = compact ? 58 : dense ? 72 : CHART_OUTER
  const chartMinHeight = fillHeight
    ? 'min-h-0 h-full'
    : compact
      ? 'min-h-[140px]'
      : dense
        ? 'min-h-[11rem]'
        : 'min-h-[220px]'
  const resolvedLegendClass = fillHeight
    ? `min-h-0 flex-1 max-h-none ${legendClassName || ''}`.trim()
    : compact
      ? `min-h-0 flex-1 ${legendClassName || 'max-h-[240px]'}`.trim()
      : legendClassName || (dense ? 'max-h-[11rem]' : 'max-h-[240px]')

  if (rows.length === 0 || total === 0) return null

  return (
    <div
      className={`flex flex-col gap-2 ${
        compact || fillHeight ? 'min-h-0 flex-1' : ''
      } ${compact ? '' : 'sm:flex-row sm:items-stretch'} ${className}`.trim()}
    >
      <div
        className={`min-w-0 shrink-0 ${
          fillHeight ? 'flex min-h-0 flex-1 flex-col sm:w-[40%]' : ''
        } ${compact ? 'w-full' : dense ? 'sm:w-[38%]' : 'sm:w-[44%] lg:w-[42%]'}`}
      >
        <DashboardChartCanvas className={`${chartMinHeight} ${fillHeight ? 'flex-1' : ''}`.trim()}>
          <DonutChartFrame total={total} centerLabel={centerLabel}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trackData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  innerRadius={chartInner}
                  outerRadius={chartOuter}
                  fill={TRACK_FILL}
                  stroke="none"
                  isAnimationActive={false}
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={chartInner}
                  outerRadius={chartOuter}
                  paddingAngle={rows.length > 1 ? 3 : 0}
                  cornerRadius={5}
                  stroke="#ffffff"
                  strokeWidth={3}
                  activeIndex={activeIndex}
                  activeShape={ActiveSlice}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(-1)}
                >
                  {rows.map((row) => (
                    <Cell key={row.id} fill={row.color} />
                  ))}
                </Pie>
                <Tooltip content={<SegmentTooltip />} wrapperStyle={DONUT_TOOLTIP_WRAPPER_STYLE} />
              </PieChart>
            </ResponsiveContainer>
          </DonutChartFrame>
        </DashboardChartCanvas>
      </div>

      <div
        className={`min-w-0 flex-1 divide-y divide-gray-100/90 overflow-y-auto overscroll-contain [scrollbar-width:thin] ${resolvedLegendClass}`.trim()}
      >
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} transition-colors ${
              activeIndex === index ? 'bg-orange-50/50' : 'hover:bg-white/60'
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(-1)}
          >
            <DashboardProgressRow
              label={row.label}
              meta={`${row.value} · ${row.pct}%`}
              percent={row.pct}
              avatarFallback={row.label.charAt(0).toUpperCase()}
              avatarClassName={row.avatarClassName}
              barColor={row.barColor}
              showPercent={false}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
