'use client'

import { Plus, RefreshCcw } from 'lucide-react'
import { Button } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'

export default function PayrollRunToolbar({
  runs = [],
  selectedRunId = '',
  onRunChange,
  onCreateRun,
  onRecalculate,
  showRecalculate = false,
}) {
  const runOptions = runs.map((run) => ({
    value: String(run.id),
    label: `${run.monthLabel} · ${run.status}`,
  }))

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-3">
      <div className="w-full min-w-[220px] max-w-xs flex-1 sm:flex-none">
        <Select
          label="Payroll run"
          value={selectedRunId}
          onChange={onRunChange}
          options={runOptions}
          placeholder="Select a payroll run"
        />
      </div>

      <Button variant="secondary" className="shrink-0 gap-2" onClick={onCreateRun}>
        <Plus className="h-4 w-4" aria-hidden />
        Run Payroll
      </Button>

      {showRecalculate ? (
        <Button variant="outline" className="shrink-0 gap-2 bg-white" onClick={onRecalculate}>
          <RefreshCcw className="h-4 w-4" aria-hidden />
          Recalculate
        </Button>
      ) : null}
    </div>
  )
}
