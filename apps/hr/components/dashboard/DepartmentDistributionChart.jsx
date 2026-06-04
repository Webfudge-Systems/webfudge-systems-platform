'use client'

import { useMemo, useState } from 'react'
import { Users, PieChart as PieChartIcon } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { buildDeptChartSlices } from '../../lib/deptDistribution'
import HRGlassCard from '../shared/HRGlassCard'

const DEPT_COLORS = [
  '#ea580c',
  '#f59e0b',
  '#0ea5e9',
  '#16a34a',
  '#7c3aed',
  '#dc2626',
  '#1e40af',
  '#64748b',
]

const TOOLTIP_STYLE = {
  borderRadius: '0.75rem',
  border: '1px solid rgba(251, 146, 60, 0.35)',
  backgroundColor: 'rgba(255, 255, 255, 0.98)',
  boxShadow: '0 10px 28px rgba(15, 23, 42, 0.1)',
}

function DonutCenterHub({ total, activeDept }) {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
      role="img"
      aria-label={`${total} total active employees${activeDept ? `, ${activeDept} selected` : ''}`}
    >
      <div className="relative flex aspect-square w-[30%] min-w-[68px] max-w-[84px] items-center justify-center rounded-full bg-white shadow-[0_6px_20px_rgba(15,23,42,0.1),inset_0_1px_0_rgba(255,255,255,1)] ring-[3px] ring-white">
        <div
          className="absolute inset-[4px] rounded-full border border-orange-100/80 bg-gradient-to-b from-orange-50/40 to-transparent"
          aria-hidden
        />
        <div className="relative flex flex-col items-center px-1">
          <div className="mb-1 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 shadow-[0_2px_8px_rgba(234,88,12,0.3)]">
            <Users className="h-3.5 w-3.5 text-white" strokeWidth={2.5} aria-hidden />
          </div>
          <span className="text-xl font-bold leading-none tracking-tight text-gray-900 tabular-nums">
            {total}
          </span>
          <span className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-gray-400">Total</span>
        </div>
      </div>
      {activeDept ? (
        <p className="mt-1.5 max-w-[120px] truncate text-[10px] font-semibold text-orange-700">{activeDept}</p>
      ) : null}
    </div>
  )
}

function DeptTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0]?.payload
  if (!row) return null
  return (
    <div style={TOOLTIP_STYLE} className="px-3 py-2.5 text-sm">
      <p className="font-bold uppercase tracking-wide text-gray-900">{row.dept}</p>
      <p className="mt-0.5 text-orange-600">
        <span className="font-semibold">{row.count}</span> employees ·{' '}
        <span className="font-semibold">{row.pct}%</span>
      </p>
    </div>
  )
}

function LegendItem({ row, color, isActive, onEnter, onLeave }) {
  return (
    <li>
      <button
        type="button"
        className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-all ${
          isActive
            ? 'border-orange-200/90 bg-white shadow-md ring-1 ring-orange-100'
            : 'border-white/70 bg-white/55 hover:border-orange-100 hover:bg-white/80'
        }`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="h-3.5 w-3.5 shrink-0 rounded-[4px] shadow-sm"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            <span className="truncate text-xs font-bold uppercase tracking-wide text-gray-800">
              {row.dept}
            </span>
          </div>
          <span className="shrink-0 text-xs font-bold tabular-nums text-gray-900">{row.pct}%</span>
        </div>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${row.pct}%`, backgroundColor: color }}
            />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-gray-500">{row.count}</span>
        </div>
      </button>
    </li>
  )
}

const SORT_OPTIONS = [
  { value: 'high-low', label: 'High to low' },
  { value: 'low-high', label: 'Low to high' },
]

export default function DepartmentDistributionChart({ employees, className = '' }) {
  const [sortOrder, setSortOrder] = useState('high-low')
  const [activeIndex, setActiveIndex] = useState(null)

  const baseSlices = useMemo(() => buildDeptChartSlices(employees), [employees])
  const colorByDept = useMemo(() => {
    const map = new Map()
    baseSlices.forEach((row, i) => {
      map.set(row.dept, DEPT_COLORS[i % DEPT_COLORS.length])
    })
    return map
  }, [baseSlices])

  const slices = useMemo(() => {
    const copy = [...baseSlices]
    const cmp =
      sortOrder === 'low-high'
        ? (a, b) => a.count - b.count
        : (a, b) => b.count - a.count
    return copy.sort(cmp)
  }, [baseSlices, sortOrder])

  const total = useMemo(() => slices.reduce((s, r) => s + r.count, 0), [slices])
  const activeDept = activeIndex != null ? slices[activeIndex]?.dept : null

  return (
    <HRGlassCard className={`!p-4 sm:!p-5 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">Department distribution</h2>
          <p className="mt-0.5 text-sm text-gray-500">Active employees by team</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          <label className="sr-only" htmlFor="dept-dist-sort">
            Sort departments
          </label>
          <select
            id="dept-dist-sort"
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value)
              setActiveIndex(null)
            }}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200/80 bg-white/60 shadow-sm"
            aria-hidden
          >
            <PieChartIcon className="h-5 w-5 text-orange-600" />
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/60 bg-white/40 px-4 py-14 text-center text-sm text-gray-500">
          No active employees on roster yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/50 bg-gradient-to-br from-[#e9f0ea]/90 via-[#f6f8f6] to-white/80 p-3 sm:p-4">
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(0,200px)_1fr] sm:gap-5">
            <div className="relative mx-auto h-[200px] w-[200px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="68%"
                    outerRadius="90%"
                    paddingAngle={2}
                    stroke="#ffffff"
                    strokeWidth={3}
                    onMouseEnter={(_, index) => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  >
                    {slices.map((entry, i) => (
                      <Cell
                        key={entry.dept}
                        fill={colorByDept.get(entry.dept) || DEPT_COLORS[i % DEPT_COLORS.length]}
                        opacity={activeIndex == null || activeIndex === i ? 1 : 0.35}
                        style={{ transition: 'opacity 0.2s ease' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<DeptTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <DonutCenterHub total={total} activeDept={activeDept} />
            </div>

            <ul className="max-h-[200px] space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 [scrollbar-width:thin]">
              {slices.map((row, i) => (
                <LegendItem
                  key={row.dept}
                  row={row}
                  color={colorByDept.get(row.dept) || DEPT_COLORS[i % DEPT_COLORS.length]}
                  isActive={activeIndex === i}
                  onEnter={() => setActiveIndex(i)}
                  onLeave={() => setActiveIndex(null)}
                />
              ))}
            </ul>
          </div>
        </div>
      )}

      {total > 0 ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-orange-100/50 pt-2">
          <p className="text-[11px] text-gray-500">
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-orange-500 align-middle" />
            {total} active · {slices.length} teams
          </p>
          <p className="text-[10px] font-medium text-gray-400">Hover to highlight</p>
        </div>
      ) : null}
    </HRGlassCard>
  )
}
