'use client'

import { AlertTriangle } from 'lucide-react'
import { FormSectionCard, Input } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Closed', label: 'Closed' },
  { value: 'Terminated', label: 'Terminated' },
]

export function pipToForm(pip) {
  if (!pip) {
    return {
      employee: '',
      manager: '',
      start: '',
      duration: '90 days',
      milestones: '0/5',
      status: 'Active',
    }
  }

  return {
    employee: pip.employee || '',
    manager: pip.manager || '',
    start: pip.start || '',
    duration: pip.duration || '',
    milestones: pip.milestones || '0/5',
    status: ['Active', 'Closed', 'Terminated'].includes(pip.status) ? pip.status : 'Active',
  }
}

export default function PipForm({ form, onChange }) {
  return (
    <FormSectionCard
      icon={AlertTriangle}
      title="PIP details"
      description="Define the employee, manager, timeline, milestones, and status"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Input
            label="Employee *"
            value={form.employee}
            onChange={(event) => onChange('employee', event.target.value)}
            placeholder="e.g. Rajesh Pillai"
            required
          />
        </div>
        <div>
          <Input
            label="Manager *"
            value={form.manager}
            onChange={(event) => onChange('manager', event.target.value)}
            placeholder="e.g. Ankit Sharma"
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
            label="Start date"
            type="date"
            value={form.start}
            onChange={(event) => onChange('start', event.target.value)}
          />
        </div>
        <div>
          <Input
            label="Duration"
            value={form.duration}
            onChange={(event) => onChange('duration', event.target.value)}
            placeholder="e.g. 90 days"
          />
        </div>
        <div>
          <Input
            label="Milestones"
            value={form.milestones}
            onChange={(event) => onChange('milestones', event.target.value)}
            placeholder="e.g. 3/5"
          />
        </div>
      </div>
    </FormSectionCard>
  )
}
