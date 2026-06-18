'use client'

import { useMemo, useState } from 'react'
import { Input, Select, Textarea } from '@webfudge/ui'
import { EMPLOYEES } from '../../lib/mock-data/employees'
import { LEAVE_POLICIES } from '../../lib/mock-data/leave'
import { HRQuickForm, HRQuickFormSection } from './HRQuickFormFields'

const EMPTY = {
  employeeId: '',
  type: '',
  from: '',
  to: '',
  reason: '',
}

export default function ApplyLeaveQuickForm({ onSuccess }) {
  const [form, setForm] = useState(EMPTY)

  const employeeOptions = useMemo(
    () => [
      { value: '', label: 'Select employee' },
      ...EMPLOYEES.filter((e) => e.status !== 'Exited').map((e) => ({
        value: e.id,
        label: `${e.name} (${e.employeeId})`,
      })),
    ],
    []
  )

  const leaveTypes = useMemo(
    () => [
      { value: '', label: 'Leave type' },
      ...LEAVE_POLICIES.map((p) => ({ value: p.name, label: p.name })),
      { value: 'WFH', label: 'WFH' },
    ],
    []
  )

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSuccess?.(form)
    setForm(EMPTY)
  }

  return (
    <HRQuickForm onSubmit={handleSubmit}>
      <HRQuickFormSection title="Leave request" description="Manager approval required">
        <Select
          label="Employee *"
          value={form.employeeId}
          onChange={(value) => set('employeeId', value)}
          options={employeeOptions}
        />
        <Select
          label="Leave type *"
          value={form.type}
          onChange={(value) => set('type', value)}
          options={leaveTypes}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="From *"
            type="date"
            value={form.from}
            onChange={(e) => set('from', e.target.value)}
            required
          />
          <Input
            label="To *"
            type="date"
            value={form.to}
            onChange={(e) => set('to', e.target.value)}
            required
          />
        </div>
        <Textarea
          label="Reason"
          value={form.reason}
          onChange={(e) => set('reason', e.target.value)}
          placeholder="Brief reason for leave"
          rows={3}
        />
      </HRQuickFormSection>
    </HRQuickForm>
  )
}
