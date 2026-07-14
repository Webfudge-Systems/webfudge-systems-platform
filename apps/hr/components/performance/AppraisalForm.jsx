'use client'

import { TrendingUp } from 'lucide-react'
import { FormSectionCard, Input } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'Select department' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
  { value: 'HR', label: 'HR' },
]

const PROMOTION_OPTIONS = [
  { value: 'No', label: 'Not now' },
  { value: 'Yes', label: 'Recommended' },
]

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
]

export function appraisalToForm(appraisal) {
  if (!appraisal) {
    return {
      employee: '',
      employeeId: '',
      department: '',
      rating: '',
      revision: '',
      promotion: 'No',
      effective: '',
      status: 'Pending',
    }
  }

  return {
    employee: appraisal.employee || '',
    employeeId: appraisal.employeeId ? String(appraisal.employeeId) : '',
    department: appraisal.department || '',
    rating: appraisal.rating ?? '',
    revision: appraisal.revision ?? '',
    promotion: appraisal.promotion === 'Yes' ? 'Yes' : 'No',
    effective: appraisal.effective || '',
    status: appraisal.status === 'Approved' ? 'Approved' : 'Pending',
  }
}

export default function AppraisalForm({ form, onChange, employees = [] }) {
  const employeeOptions = [
    { value: '', label: 'Select employee' },
    ...employees.map((employee) => ({
      value: String(employee.id || ''),
      label: employee.name || employee.email || 'Unknown employee',
    })),
  ]
  return (
    <FormSectionCard
      icon={TrendingUp}
      title="Appraisal details"
      description="Finalize rating, salary revision, promotion recommendation, and effective date"
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
              if (selected?.department) onChange('department', selected.department)
            }}
            options={employeeOptions}
            placeholder="Select employee"
          />
        </div>
        <div>
          <Select
            label="Department"
            value={form.department}
            onChange={(value) => onChange('department', value)}
            options={DEPARTMENT_OPTIONS}
            placeholder="Select department"
          />
        </div>
        <div>
          <Input
            label="Rating *"
            type="number"
            min="0"
            max="5"
            step="0.1"
            value={form.rating}
            onChange={(event) => onChange('rating', event.target.value)}
            placeholder="e.g. 4.2"
            required
          />
        </div>
        <div>
          <Input
            label="Salary revision %"
            type="number"
            min="0"
            max="100"
            value={form.revision}
            onChange={(event) => onChange('revision', event.target.value)}
            placeholder="e.g. 12"
          />
        </div>
        <div>
          <Select
            label="Promotion"
            value={form.promotion}
            onChange={(value) => onChange('promotion', value)}
            options={PROMOTION_OPTIONS}
            placeholder="Select recommendation"
          />
        </div>
        <div>
          <Input
            label="Effective date"
            type="date"
            value={form.effective}
            onChange={(event) => onChange('effective', event.target.value)}
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
      </div>
    </FormSectionCard>
  )
}
