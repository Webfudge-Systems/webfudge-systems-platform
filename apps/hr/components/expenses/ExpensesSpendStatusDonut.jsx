'use client'

import { useMemo, useState } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip } from 'recharts'
import {
  DashboardChartPanel,
  DashboardChartEmpty,
  DashboardChartCanvas,
  DashboardProgressRow,
  DonutChartFrame,
  DONUT_TOOLTIP_WRAPPER_STYLE,
} from '@webfudge/ui'
import { formatExpenseAmount, formatExpenseAmountK } from '../../lib/expensesShared'

const STATUS_COLORS = {
  Pending: '#F59E0B',
  Approved: '#10B981',
  Rejected: '#EF4444',
  Paid: '#3B82F6',
}

const STATUS_BAR_COLORS = {
  Pending: 'orange',
  Approved: 'green',
  Rejected: 'red',
  Paid: 'blue',
}

const TRACK_FILL = '#ffedd5'

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

function StatusTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div className="min-w-[9rem] rounded-xl border border-gray-200/90 bg-white/95 px-3 py-2.5 shadow-lg ring-1 ring-black/5 backdrop-blur-sm">
      <p className="text-sm font-semibold text-gray-900">{row.label}</p>
      <p className="mt-1 text-xs text-gray-600">
        <span className="font-bold tabular-nums text-gray-900">{formatExpenseAmount(row.value)}</span>
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

export default function ExpensesSpendStatusDonut({
  title,
  subtitle,
  icon,
  data = [],
  emptyMessage = 'No claims to summarize by status.',
  className = '',
  chartClassName = 'h-72',
}) {
  const [activeIndex, setActiveIndex] = useState(-1)

  const rows = useMemo(() => {
    const filtered = data
      .map((row) => ({ label: row.name, value: Number(row.value) || 0 }))
      .filter((row) => row.value > 0)
    const total = filtered.reduce((sum, row) => sum + row.value, 0)
    return filtered.map((row) => ({
      ...row,
      pct: total > 0 ? Math.round((row.value / total) * 100) : 0,
      color: STATUS_COLORS[row.label] || '#FF7A00',
      barColor: STATUS_BAR_COLORS[row.label] || 'orange',
    }))
  }, [data])

  const total = useMemo(() => rows.reduce((sum, row) => sum + row.value, 0), [rows])
  const pieData = useMemo(
    () => rows.map((row) => ({ name: row.label, value: row.value, label: row.label, pct: row.pct })),
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
        <div className="flex min-h-[15rem] flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="min-w-0 shrink-0 sm:w-[42%]">
            <DashboardChartCanvas className="min-h-[11rem]">
              <DonutChartFrame total={formatExpenseAmountK(total)} centerLabel="total">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ value: 1 }]}
                      dataKey="value"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={72}
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
                      innerRadius={46}
                      outerRadius={72}
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
                        <Cell key={row.label} fill={row.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<StatusTooltip />} wrapperStyle={DONUT_TOOLTIP_WRAPPER_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </DonutChartFrame>
            </DashboardChartCanvas>
          </div>
          <div className="min-w-0 flex-1 divide-y divide-gray-100/90 overflow-y-auto overscroll-contain [scrollbar-width:thin] max-h-[11rem]">
            {rows.map((row, index) => (
              <div
                key={row.label}
                className={`px-3 py-2 transition-colors ${
                  activeIndex === index ? 'bg-orange-50/50' : 'hover:bg-white/60'
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(-1)}
              >
                <DashboardProgressRow
                  label={row.label}
                  meta={`${formatExpenseAmount(row.value)} · ${row.pct}%`}
                  percent={row.pct}
                  avatarFallback={row.label.charAt(0).toUpperCase()}
                  avatarClassName="bg-orange-500 text-white"
                  barColor={row.barColor}
                  showPercent={false}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </DashboardChartPanel>
  )
}
