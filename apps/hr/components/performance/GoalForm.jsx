'use client'

import { Plus, Target, Trash2 } from 'lucide-react'
import { Button, FormSectionCard, Input } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { listReviewCycles } from '../../lib/performanceReviewsService'

const SCOPE_OPTIONS = [
  { value: 'company', label: 'Company' },
  { value: 'department', label: 'Department' },
  { value: 'individual', label: 'Individual' },
]

const DEPARTMENT_OPTIONS = [
  { value: '', label: 'Select department' },
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Operations', label: 'Operations' },
  { value: 'HR', label: 'HR' },
]

export function goalToForm(goal) {
  if (!goal) {
    return {
      objective: '',
      scope: 'company',
      department: '',
      assigneeId: '',
      assigneeName: '',
      reviewCycle: '',
      keyResults: [{ label: '', progress: 0 }],
    }
  }

  return {
    objective: goal.objective || '',
    scope: goal.scope || 'company',
    department: goal.department || '',
    assigneeId: goal.assigneeId ? String(goal.assigneeId) : '',
    assigneeName: goal.assigneeName || '',
    reviewCycle: goal.reviewCycle || '',
    keyResults: goal.keyResults?.length
      ? goal.keyResults.map((keyResult) => ({
          label: keyResult.label || '',
          progress: Number(keyResult.progress || 0),
        }))
      : [{ label: '', progress: 0 }],
  }
}

export default function GoalForm({ form, onChange, departments = DEPARTMENT_OPTIONS, employees = [] }) {
  const reviewCycles = listReviewCycles()
  const reviewCycleOptions = [
    { value: '', label: 'Select review cycle' },
    ...reviewCycles.map((cycle) => ({
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

  const handleKeyResultChange = (index, field, value) => {
    const next = form.keyResults.map((keyResult, itemIndex) =>
      itemIndex === index ? { ...keyResult, [field]: value } : keyResult,
    )
    onChange('keyResults', next)
  }

  const addKeyResult = () => {
    onChange('keyResults', [...form.keyResults, { label: '', progress: 0 }])
  }

  const removeKeyResult = (index) => {
    if (form.keyResults.length <= 1) return
    onChange(
      'keyResults',
      form.keyResults.filter((_, itemIndex) => itemIndex !== index),
    )
  }

  return (
    <div className="space-y-6">
      <FormSectionCard
        icon={Target}
        title="Objective details"
        description="Define the goal and how it aligns to the current review cycle"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <Input
              label="Objective *"
              value={form.objective}
              onChange={(event) => onChange('objective', event.target.value)}
              placeholder="e.g. Grow revenue 25% YoY"
              required
            />
          </div>
          <div>
            <Select
              label="Scope *"
              value={form.scope}
              onChange={(value) => onChange('scope', value)}
              options={SCOPE_OPTIONS}
              placeholder="Select scope"
            />
          </div>
          {form.scope === 'department' ? (
            <div>
              <Select
                label="Department *"
                value={form.department}
                onChange={(value) => onChange('department', value)}
                options={departments}
                placeholder="Select department"
              />
            </div>
          ) : null}
          {form.scope === 'individual' ? (
            <div>
              <Select
                label="Employee *"
                value={form.assigneeId}
                onChange={(value) => {
                  const selected = employees.find((employee) => String(employee.id) === String(value))
                  onChange('assigneeId', value)
                  onChange('assigneeMembershipId', String(selected?.membershipId || selected?.id || value || ''))
                  onChange('assigneeName', selected?.name || '')
                }}
                options={employeeOptions}
                placeholder="Select employee"
              />
            </div>
          ) : null}
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

      <FormSectionCard
        icon={Target}
        title="Key results"
        description="Measurable outcomes that indicate progress toward the objective"
      >
        <div className="space-y-4">
          {form.keyResults.map((keyResult, index) => (
            <div
              key={`kr-${index}`}
              className="grid grid-cols-1 gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4 md:grid-cols-[1fr_140px_auto]"
            >
              <Input
                label={index === 0 ? 'Key result *' : 'Key result'}
                value={keyResult.label}
                onChange={(event) => handleKeyResultChange(index, 'label', event.target.value)}
                placeholder="e.g. Close ₹5Cr new ARR"
                required={index === 0}
              />
              <Input
                label="Progress %"
                type="number"
                min="0"
                max="100"
                value={keyResult.progress}
                onChange={(event) =>
                  handleKeyResultChange(index, 'progress', event.target.value)
                }
              />
              <div className="flex items-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  disabled={form.keyResults.length <= 1}
                  onClick={() => removeKeyResult(index)}
                  title="Remove key result"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addKeyResult} className="gap-2">
            <Plus className="h-4 w-4" />
            Add key result
          </Button>
        </div>
      </FormSectionCard>
    </div>
  )
}
