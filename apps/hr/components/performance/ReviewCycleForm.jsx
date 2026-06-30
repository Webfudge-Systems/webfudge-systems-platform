'use client'

import { ClipboardList } from 'lucide-react'
import { FormSectionCard, Input } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Closed', label: 'Closed' },
]

export function reviewCycleToForm(cycle) {
  if (!cycle) {
    return {
      name: '',
      period: '',
      due: '',
      completion: 0,
      status: 'Active',
    }
  }

  return {
    name: cycle.name || '',
    period: cycle.period || '',
    due: cycle.due || '',
    completion: Number(cycle.completion || 0),
    status: cycle.status === 'Closed' ? 'Closed' : 'Active',
  }
}

export default function ReviewCycleForm({ form, onChange }) {
  return (
    <FormSectionCard
      icon={ClipboardList}
      title="Review cycle details"
      description="Define the cycle name, period, due date, and completion progress"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Input
            label="Cycle name *"
            value={form.name}
            onChange={(event) => onChange('name', event.target.value)}
            placeholder="e.g. Q2 2026 Review"
            required
          />
        </div>
        <div>
          <Select
            label="Status *"
            value={form.status}
            onChange={(value) => onChange('status', value)}
            options={STATUS_OPTIONS}
            placeholder="Select status"
          />
        </div>
        <div>
          <Input
            label="Period *"
            value={form.period}
            onChange={(event) => onChange('period', event.target.value)}
            placeholder="e.g. Apr–Jun 2026"
            required
          />
        </div>
        <div>
          <Input
            label="Due date"
            type="date"
            value={form.due}
            onChange={(event) => onChange('due', event.target.value)}
          />
        </div>
        <div>
          <Input
            label="Completion %"
            type="number"
            min="0"
            max="100"
            value={form.completion}
            onChange={(event) => onChange('completion', event.target.value)}
          />
        </div>
      </div>
    </FormSectionCard>
  )
}
