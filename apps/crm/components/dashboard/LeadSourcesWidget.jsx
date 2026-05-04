'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card } from '@webfudge/ui'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { PieChart as PieChartIcon, ChevronRight } from 'lucide-react'
import leadCompanyService from '../../lib/api/leadCompanyService'
import { SOURCE_OPTIONS } from '../../lib/dealFormOptions'

const ACCENT_COLORS = ['#ea580c', '#8b5cf6', '#0f172a', '#14b8a6', '#f59e0b', '#64748b', '#3b82f6']

const scrollbarClass =
  'max-h-[min(22rem,calc(100vh-12rem))] overflow-y-auto overscroll-contain [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-200'

function sourceLabel(key) {
  if (!key || key === 'UNKNOWN') return 'Not set'
  const u = String(key).toUpperCase()
  const opt = SOURCE_OPTIONS.find((o) => o.value === u)
  if (opt) return opt.label
  return String(key)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function aggregateBySource(companies) {
  const map = new Map()
  for (const c of companies) {
    const raw = c?.source
    const k =
      raw != null && String(raw).trim() !== '' ? String(raw).trim().toUpperCase() : 'UNKNOWN'
    map.set(k, (map.get(k) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

function toPieSlices(entries) {
  if (entries.length === 0) return []
  if (entries.length <= 6) {
    return entries.map(([key, value]) => ({
      name: sourceLabel(key),
      value,
      key,
    }))
  }
  const head = entries.slice(0, 5)
  const rest = entries.slice(5).reduce((s, [, n]) => s + n, 0)
  return [
    ...head.map(([key, value]) => ({ name: sourceLabel(key), value, key })),
    { name: 'Other', value: rest, key: 'OTHER' },
  ]
}

function SourceTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  const v = typeof p?.value === 'number' ? p.value : p?.payload?.value ?? 0
  const name = p?.name ?? p?.payload?.name ?? ''
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-gray-900">{name}</p>
      <p className="text-gray-600">{v} leads</p>
    </div>
  )
}

export default function LeadSourcesWidget() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const list = await leadCompanyService.fetchAll()
        if (!cancelled) setCompanies(Array.isArray(list) ? list : [])
      } catch (e) {
        console.error('LeadSourcesWidget:', e)
        if (!cancelled) setCompanies([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const { rows, total, pieData } = useMemo(() => {
    const entries = aggregateBySource(companies)
    const sum = entries.reduce((s, [, n]) => s + n, 0)
    const max = entries.reduce((m, [, n]) => Math.max(m, n), 0) || 1
    const listRows = entries.map(([key, count], i) => ({
      key: String(key),
      label: sourceLabel(key),
      count,
      color: ACCENT_COLORS[i % ACCENT_COLORS.length],
      barPct: max > 0 ? Math.round((count / max) * 100) : 0,
    }))
    return {
      rows: listRows,
      total: sum,
      pieData: toPieSlices(entries),
    }
  }, [companies])

  return (
    <Card className="p-6 shadow-lg">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-gray-900">Lead sources</h2>
          <p className="mt-0.5 text-sm text-gray-600">Where your lead companies originate</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 shadow-sm">
          <PieChartIcon className="h-[22px] w-[22px] text-orange-600" aria-hidden />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="mx-auto h-36 max-w-[200px] rounded-full bg-gray-100" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-gray-100" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-10 text-center">
          <p className="text-sm text-gray-500">No lead companies yet. Add leads to see source mix.</p>
          <Link
            href="/sales/lead-companies/new"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            Add a lead
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_160px] xl:items-start">
          <div className={`min-w-0 space-y-5 ${scrollbarClass}`}>
            {rows.map((row) => (
              <div key={row.key} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-500">
                    {row.label}
                  </p>
                  <span className="shrink-0 text-xs tabular-nums text-gray-400">
                    {total > 0 ? `${Math.round((row.count / total) * 100)}%` : ''}
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{row.count}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${row.barPct}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-start xl:pt-2">
            <div className="h-[160px] w-full max-w-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={72}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={ACCENT_COLORS[i % ACCENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<SourceTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 w-full space-y-1.5 text-xs text-gray-600">
              {pieData.slice(0, 6).map((slice, i) => (
                <li key={`${slice.key}-${i}`} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: ACCENT_COLORS[i % ACCENT_COLORS.length] }}
                  />
                  <span className="min-w-0 truncate">{slice.name}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {!loading && total > 0 ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500 align-middle" />
            {total} total lead{total === 1 ? '' : 's'}
          </p>
          <Link
            href="/sales/lead-companies"
            className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            View all leads
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </Card>
  )
}
