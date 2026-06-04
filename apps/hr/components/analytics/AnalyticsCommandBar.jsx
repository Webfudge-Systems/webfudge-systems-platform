'use client'

import { Download, CalendarRange } from 'lucide-react'
import { Button } from '@webfudge/ui'
import HRGlassCard from '../shared/HRGlassCard'

export default function AnalyticsCommandBar({
  tabs,
  activeTab,
  onTabChange,
  period,
  onPeriodChange,
  onExport,
}) {
  return (
    <HRGlassCard className="!p-3 sm:!p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <nav
          className="flex flex-wrap gap-1 rounded-xl bg-white/50 p-1 ring-1 ring-orange-100/40"
          aria-label="Analytics reports"
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                  active
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                    : 'text-gray-600 hover:bg-white/80 hover:text-orange-700'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </nav>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-lg border border-white/60 bg-white/70 px-3 py-2 text-sm text-gray-700 shadow-sm">
            <CalendarRange className="h-4 w-4 text-orange-500" aria-hidden />
            <select
              value={period}
              onChange={(e) => onPeriodChange(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none"
              aria-label="Reporting period"
            >
              <option value="fy2526">FY 2025–26</option>
              <option value="last12">Last 12 months</option>
              <option value="q2">Q2 2026</option>
            </select>
          </div>
          <Button variant="secondary" size="sm" onClick={onExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </HRGlassCard>
  )
}
