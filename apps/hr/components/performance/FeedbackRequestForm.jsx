'use client'

import { MessageSquare } from 'lucide-react'
import { FormSectionCard, Input } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { listReviewCycles } from '../../lib/performanceReviewsService'

const TYPE_OPTIONS = [
  { value: 'Peer', label: 'Peer' },
  { value: 'Manager', label: 'Manager' },
]

export function feedbackRequestToForm(item) {
  if (!item) {
    return {
      label: '',
      employeeId: '',
      employeeName: '',
      due: '',
      type: 'Peer',
      reviewCycle: '',
    }
  }

  return {
    label: item.label || '',
    employeeId: item.employeeId ? String(item.employeeId) : '',
    employeeName: item.employeeName || '',
    due: item.due || '',
    type: item.type === 'Manager' ? 'Manager' : 'Peer',
    reviewCycle: item.reviewCycle || '',
  }
}

export default function FeedbackRequestForm({ form, onChange, employees = [] }) {
  const reviewCycleOptions = [
    { value: '', label: 'Select review cycle' },
    ...listReviewCycles().map((cycle) => ({
      value: cycle.name,
      label: `${cycle.name} (${cycle.period})`,
    })),
  ]
  const employeeOptions = [
    { value: '', label: 'Select employee' },
    ...employees.map((employee) => ({
      value: String(employee.id || ''),
      label: employee.name || employee.email || 'Unknown employee',
    })),
  ]

  return (
    <FormSectionCard
      icon={MessageSquare}
      title="Feedback request"
      description="Define who the feedback is for, when it is due, and the review cycle"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Input
            label="Request label *"
            value={form.label}
            onChange={(event) => onChange('label', event.target.value)}
            placeholder="e.g. Peer review for Ankit Sharma"
            required
          />
        </div>
        <div>
          <Select
            label="Employee *"
            value={form.employeeId}
            onChange={(value) => {
              const selected = employees.find((employee) => String(employee.id) === String(value))
              onChange('employeeId', value)
              onChange('employeeMembershipId', String(selected?.membershipId || selected?.id || value || ''))
              onChange('employeeName', selected?.name || '')
            }}
            options={employeeOptions}
            placeholder="Select employee"
          />
        </div>
        <div>
          <Select
            label="Type *"
            value={form.type}
            onChange={(value) => onChange('type', value)}
            options={TYPE_OPTIONS}
            placeholder="Select type"
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
          <Select
            label="Review cycle"
            value={form.reviewCycle}
            onChange={(value) => onChange('reviewCycle', value)}
            options={reviewCycleOptions}
            placeholder="Select review cycle"
          />
        </div>
      </div>
    </FormSectionCard>
  )
}
