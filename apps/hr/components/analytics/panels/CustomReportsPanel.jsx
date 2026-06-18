'use client'

import { FileSpreadsheet, Sparkles } from 'lucide-react'
import { Button, Card } from '@webfudge/ui'

const SAVED_REPORTS = [
  { name: 'Monthly headcount — Engineering', updated: '2 days ago', type: 'Headcount' },
  { name: 'Q2 payroll cost breakdown', updated: '1 week ago', type: 'Payroll' },
  { name: 'Sales attrition watchlist', updated: 'Jun 1, 2026', type: 'Attrition' },
]

export default function CustomReportsPanel() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
      <Card variant="elevated" padding={false} className="space-y-4 rounded-2xl p-5 sm:p-6 lg:col-span-3">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-orange-600" aria-hidden />
          <div>
            <h3 className="text-base font-semibold text-gray-900">Report builder</h3>
            <p className="text-sm text-gray-500">Combine metrics, groupings, and date range</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Metrics</label>
            <select className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
              <option>Headcount</option>
              <option>Payroll cost</option>
              <option>Attendance rate</option>
              <option>Attrition</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Group by</label>
            <select className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20">
              <option>Department</option>
              <option>Location</option>
              <option>Employment type</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Date range</label>
            <input
              type="month"
              defaultValue="2026-06"
              className="mt-1.5 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            />
          </div>
        </div>
        <Button variant="primary" className="bg-orange-500 hover:bg-orange-600">
          Generate report
        </Button>
      </Card>

      <Card variant="elevated" padding={false} className="rounded-2xl p-5 sm:p-6 lg:col-span-2">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-600" aria-hidden />
          <h3 className="text-base font-semibold text-gray-900">Saved reports</h3>
        </div>
        <ul className="space-y-3">
          {SAVED_REPORTS.map((r) => (
            <li
              key={r.name}
              className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3 transition-colors hover:bg-white"
            >
              <p className="font-medium text-gray-900">{r.name}</p>
              <p className="mt-0.5 text-xs text-gray-500">
                {r.type} · {r.updated}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
