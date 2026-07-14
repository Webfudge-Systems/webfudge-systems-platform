'use client'

import { Download, CalendarRange } from 'lucide-react'
import { Button, Card } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'

const PERIOD_OPTIONS = [
  { value: 'fy2526', label: 'FY 2025–26' },
  { value: 'last12', label: 'Last 12 months' },
  { value: 'q2', label: 'Q2 2026' },
]

export default function AnalyticsCommandBar({
  tabs,
  activeTab,
  onTabChange,
  period,
  onPeriodChange,
  onExport,
}) {
  return (
    <Card glass padding={false} className="p-3 sm:p-4">
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
          <Select
            value={period}
            onChange={onPeriodChange}
            options={PERIOD_OPTIONS}
            allowEmpty={false}
            icon={CalendarRange}
            containerClassName="min-w-[160px]"
          />
          <Button variant="secondary" size="sm" onClick={onExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>
    </Card>
  )
}
