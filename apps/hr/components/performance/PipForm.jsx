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
      employeeId: '',
      manager: '',
      start: '',
      duration: '90 days',
      milestones: '0/5',
      status: 'Active',
    }
  }

  return {
    employee: pip.employee || '',
    employeeId: pip.employeeId ? String(pip.employeeId) : '',
    manager: pip.manager || '',
    start: pip.start || '',
    duration: pip.duration || '',
    milestones: pip.milestones || '0/5',
    status: ['Active', 'Closed', 'Terminated'].includes(pip.status) ? pip.status : 'Active',
  }
}

export default function PipForm({ form, onChange, employees = [] }) {
  const employeeOptions = [
    { value: '', label: 'Select employee' },
    ...employees.map((employee) => ({
      value: String(employee.id || ''),
      label: employee.name || employee.email || 'Unknown employee',
    })),
  ]
  return (
    <FormSectionCard
      icon={AlertTriangle}
      title="PIP details"
      description="Define the employee, manager, timeline, milestones, and status"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <Select
            label="Employee *"
            value={form.employeeId}
            onChange={(value) => {
              const selected = employees.find((employee) => String(employee.id) === String(value))
              onChange('employeeId', value)
              onChange('employeeMembershipId', String(selected?.membershipId || selected?.id || value || ''))
              onChange('employee', selected?.name || '')
              if (selected?.manager) onChange('manager', selected.manager)
            }}
            options={employeeOptions}
            placeholder="Select employee"
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
