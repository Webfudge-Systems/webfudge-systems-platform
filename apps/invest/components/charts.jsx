'use client'

import { useMemo } from 'react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'
import { formatINR, formatINRCompact, formatPct, formatPrice, formatDate, KIND_COLORS, KIND_LABELS } from '../lib/format'

const AXIS = { fontSize: 11, fill: '#6b7280' }
const GRID = '#f1f1f1'

function TooltipBox({ children }) {
  return <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg">{children}</div>
}

/** Donut of current value by instrument kind, with a legend + values beside it. */
export function AllocationDonut({ rows }) {
  const total = rows.reduce((s, r) => s + r.currentValue, 0)
  if (!total) return <p className="py-10 text-center text-sm text-gray-500">No open holdings yet.</p>
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} dataKey="currentValue" nameKey="kind" innerRadius="62%" outerRadius="100%" stroke="#fff" strokeWidth={2} isAnimationActive={false}>
              {rows.map((r) => (
                <Cell key={r.kind} fill={KIND_COLORS[r.kind] || KIND_COLORS.other} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipBox>
                    <p className="font-medium text-gray-900">{KIND_LABELS[payload[0].payload.kind]}</p>
                    <p className="text-gray-600">{formatINR(payload[0].payload.currentValue)} · {formatPct(payload[0].payload.currentValue / total, { signed: false })}</p>
                  </TooltipBox>
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="w-full space-y-2.5">
        {rows.map((r) => (
          <li key={r.kind} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 text-gray-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: KIND_COLORS[r.kind] || KIND_COLORS.other }} aria-hidden />
              {KIND_LABELS[r.kind]} <span className="text-xs text-gray-400">({r.count})</span>
            </span>
            <span className="tabular-nums text-gray-900">
              {formatINRCompact(r.currentValue)}
              <span className="ml-2 text-xs text-gray-500">{formatPct(r.currentValue / total, { signed: false })}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Cumulative net invested (buys + SIPs − sells) month by month. */
export function InvestedAreaChart({ series }) {
  if (series.length < 2) return <p className="py-10 text-center text-sm text-gray-500">Add a few months of transactions to see this trend.</p>
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="investedFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F5630F" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#F5630F" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="month" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={64} tickFormatter={formatINRCompact} />
          <Tooltip
            cursor={{ stroke: '#d1d5db' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox>
                  <p className="font-medium text-gray-900">{payload[0].payload.month}</p>
                  <p className="text-gray-600">Net invested {formatINR(payload[0].payload.net)}</p>
                  <p className="text-gray-500">This month {formatINR(payload[0].payload.added, { signed: true })}</p>
                </TooltipBox>
              ) : null
            }
          />
          <Area type="monotone" dataKey="net" stroke="#F5630F" strokeWidth={2} fill="url(#investedFill)" isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

/**
 * Price / NAV history with the average cost as a reference line and dots for each purchase:
 * "where we invested vs where it stands now".
 */
export function PriceHistoryChart({ history, avgCost, purchases = [] }) {
  // Each purchase is pinned to the first trading day on/after it, as a dot-only series.
  const data = useMemo(() => {
    const rows = history.map((h) => ({ date: h.date, price: h.price, buy: null }))
    for (const p of purchases) {
      if (!p.price) continue
      const row = rows.find((r) => r.date >= p.date)
      if (row && row.date <= addDaysIso(p.date, 10)) row.buy = p.price
    }
    return rows
  }, [history, purchases])
  if (data.length < 2) return <p className="py-16 text-center text-sm text-gray-500">No price history available for this range.</p>
  const up = data[data.length - 1].price >= data[0].price
  const stroke = up ? '#047857' : '#dc2626'
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.16} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tick={AXIS} tickLine={false} axisLine={false} minTickGap={40} tickFormatter={(d) => formatDate(d).replace(/^\d+ /, '')} />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={64} domain={['auto', 'auto']} tickFormatter={(v) => formatINRCompact(v)} />
          <Tooltip
            cursor={{ stroke: '#d1d5db' }}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox>
                  <p className="font-medium text-gray-900">{formatDate(payload[0].payload.date)}</p>
                  <p className="text-gray-600">{formatPrice(payload[0].payload.price)}</p>
                  {avgCost ? <p className="text-gray-500">vs avg cost {formatPct(payload[0].payload.price / avgCost - 1)}</p> : null}
                </TooltipBox>
              ) : null
            }
          />
          <Area type="monotone" dataKey="price" stroke={stroke} strokeWidth={2} fill="url(#priceFill)" isAnimationActive={false} />
          {avgCost ? (
            <ReferenceLine
              y={avgCost}
              stroke="#F5630F"
              strokeDasharray="4 4"
              label={{ value: `Avg cost ${formatPrice(avgCost)}`, position: 'insideTopLeft', fill: '#9a3412', fontSize: 11 }}
            />
          ) : null}
          <Area dataKey="buy" stroke="none" fill="none" connectNulls={false} isAnimationActive={false} activeDot={false} dot={{ r: 4, fill: '#F5630F', stroke: '#fff', strokeWidth: 2 }} />

        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function addDaysIso(iso, days) {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + days * 86400000).toISOString().slice(0, 10)
}
