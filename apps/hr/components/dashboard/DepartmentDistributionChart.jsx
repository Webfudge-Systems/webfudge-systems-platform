'use client'

import { useMemo, useState } from 'react'
import { PieChart as PieChartIcon } from 'lucide-react'
import { EmptyState } from '@webfudge/ui'
import HRDashboardInsightShell, { HRInsightCountBadge } from './HRDashboardInsightShell'
import HRDepartmentDistributionDonut, {
  HR_SEGMENT_COLORS,
  HR_SEGMENT_BAR_COLORS,
} from './HRDepartmentDistributionDonut'
import { buildDeptChartSlices } from '../../lib/deptDistribution'

const SORT_OPTIONS = [
  { value: 'high-low', label: 'High to low' },
  { value: 'low-high', label: 'Low to high' },
]

function buildStableDeptPalette(baseSlices) {
  const map = new Map()
  const ordered = [...baseSlices].sort((a, b) => a.dept.localeCompare(b.dept))
  ordered.forEach((row, index) => {
    map.set(row.dept, {
      color: HR_SEGMENT_COLORS[index % HR_SEGMENT_COLORS.length],
      barColor: HR_SEGMENT_BAR_COLORS[index % HR_SEGMENT_BAR_COLORS.length],
    })
  })
  return map
}

export default function DepartmentDistributionChart({ employees, className = '' }) {
  const [sortOrder, setSortOrder] = useState('high-low')

  const baseSlices = useMemo(() => buildDeptChartSlices(employees), [employees])
  const paletteByDept = useMemo(() => buildStableDeptPalette(baseSlices), [baseSlices])

  const slices = useMemo(() => {
    const copy = [...baseSlices]
    const cmp =
      sortOrder === 'low-high'
        ? (a, b) => a.count - b.count
        : (a, b) => b.count - a.count
    return copy.sort(cmp)
  }, [baseSlices, sortOrder])

  const segments = useMemo(
    () =>
      slices.map((row) => {
        const palette = paletteByDept.get(row.dept) ?? {}
        return {
          id: row.dept,
          label: row.dept,
          value: row.count,
          color: palette.color,
          barColor: palette.barColor,
        }
      }),
    [slices, paletteByDept]
  )

  const total = useMemo(() => slices.reduce((sum, row) => sum + row.count, 0), [slices])

  return (
    <HRDashboardInsightShell
      fillHeight
      className={`w-full ${className}`.trim()}
      panelClassName="flex min-h-0 flex-1 flex-col"
      title="Department distribution"
      badge={
        slices.length > 0 ? (
          <HRInsightCountBadge tone="orange">{slices.length}</HRInsightCountBadge>
        ) : null
      }
      subtitle={`${total} active · ${slices.length} teams`}
      action={
        slices.length > 1 ? (
          <label className="flex items-center">
            <span className="sr-only">Sort departments</span>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null
      }
    >
      {total === 0 ? (
        <EmptyState
          icon={PieChartIcon}
          title="No departments yet"
          description="Active employees will appear grouped by team."
          className="py-5"
        />
      ) : (
        <HRDepartmentDistributionDonut
          segments={segments}
          centerLabel="total"
          fillHeight
        />
      )}
    </HRDashboardInsightShell>
  )
}
