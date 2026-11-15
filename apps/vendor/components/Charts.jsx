'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from 'recharts'
import { formatINR, formatINRCompact, formatNumber, appColor } from '../lib/format'
import { EmptyLine } from './VendorUI'

const AXIS = { fontSize: 11, fill: '#6B7280' }
const GRID = '#F1F1EF'

function ChartTooltip({ active, payload, label, money }) {
  if (!active || !payload?.length) return null
  return (
    <div className="min-w-[160px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-lg">
      <p className="mb-1.5 text-xs font-semibold text-gray-900">{label}</p>
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={p.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-gray-600">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
              {p.name}
            </span>
            <span className="font-semibold tabular-nums text-gray-900">
              {money ? formatINR(p.value) : formatNumber(p.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const hasData = (rows, keys) => rows?.some((r) => keys.some((k) => Number(r[k]) > 0))

/** Revenue stacked by app. series: [{ key, name, color }] */
export function StackedRevenueChart({ data, series, height = 260 }) {
  if (!hasData(data, series.map((s) => s.key))) {
    return <div style={{ height }} className="flex"><EmptyLine>No payments in this period yet.</EmptyLine></div>
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={56} tickFormatter={formatINRCompact} />
          <Tooltip content={<ChartTooltip money />} cursor={{ fill: 'rgba(245,99,15,0.06)' }} />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="rev"
              fill={s.color}
              radius={i === series.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              maxBarSize={36}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Two-series area chart (e.g. organizations and users). series: [{ key, name, color }] */
export function TrendAreaChart({ data, series, height = 240, money = false }) {
  if (!hasData(data, series.map((s) => s.key))) {
    return <div style={{ height }} className="flex"><EmptyLine>Nothing to chart for this period yet.</EmptyLine></div>
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.28} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis
            tick={AXIS}
            axisLine={false}
            tickLine={false}
            width={money ? 56 : 32}
            allowDecimals={false}
            tickFormatter={money ? formatINRCompact : undefined}
          />
          <Tooltip content={<ChartTooltip money={money} />} />
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.name}
              stroke={s.color}
              strokeWidth={2}
              fill={`url(#grad-${s.key})`}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function TrendLineChart({ data, series, height = 240 }) {
  if (!hasData(data, series.map((s) => s.key))) {
    return <div style={{ height }} className="flex"><EmptyLine>Nothing to chart for this period yet.</EmptyLine></div>
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
          <Tooltip content={<ChartTooltip />} />
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
          {series.map((s) => (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

/** Donut with a centre total. rows: [{ name, value, color? }] */
export function DonutChart({ rows, height = 220, money = false, centerLabel = 'Total' }) {
  const total = rows.reduce((s, r) => s + (Number(r.value) || 0), 0)
  if (!total) return <div style={{ height }} className="flex"><EmptyLine>No data yet.</EmptyLine></div>
  const palette = ['#F5630F', '#1F4FFF', '#0E9F6E', '#7A3FF2', '#F59E0B', '#06B6D4', '#EC4899', '#9CA3AF']
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full max-w-[200px] shrink-0" style={{ height: Math.min(height, 200) }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
              {rows.map((r, i) => (
                <Cell key={r.name} fill={r.color || palette[i % palette.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip money={money} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold tabular-nums text-gray-900">{money ? formatINRCompact(total) : formatNumber(total)}</span>
          <span className="text-[11px] text-gray-500">{centerLabel}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2">
        {rows.map((r, i) => (
          <li key={r.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-gray-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: r.color || palette[i % palette.length] }} />
              <span className="truncate">{r.name}</span>
            </span>
            <span className="shrink-0 tabular-nums font-semibold text-gray-900">
              {money ? formatINR(r.value) : formatNumber(r.value)}
              <span className="ml-1.5 text-xs font-normal text-gray-500">{Math.round((r.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Series definitions for revenue split by app. */
export function appSeries(apps, prefix = '') {
  return [
    ...apps.map((a) => ({ key: `${prefix}${a.slug}`, name: a.name, color: appColor(a) })),
    { key: `${prefix}other`, name: 'Other', color: appColor(null) },
  ]
}
