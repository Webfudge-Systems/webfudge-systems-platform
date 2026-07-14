'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input, Textarea } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { listSyncedEmployees } from '../../lib/employeeSyncService'
import { LEAVE_TYPE_OPTIONS } from '../../lib/leaveShared'
import { HRQuickForm, HRQuickFormSection } from './HRQuickFormFields'

const EMPTY = {
  organizationUserId: '',
  leaveType: '',
  fromDate: '',
  toDate: '',
  reason: '',
}

export default function ApplyLeaveQuickForm({ onSuccess }) {
  const [form, setForm] = useState(EMPTY)
  const [employees, setEmployees] = useState([])
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let cancelled = false
    listSyncedEmployees()
      .then(({ employees: rows }) => {
        if (cancelled) return
        setEmployees((rows || []).filter((row) => row.status !== 'Exited'))
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err?.message || 'Failed to load employees')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const employeeOptions = useMemo(
    () => [
      { value: '', label: 'Select employee' },
      ...employees.map((e) => ({
        value: String(e.membershipId || e.id),
        label: `${e.name} (${e.employeeId})`,
      })),
    ],
    [employees],
  )

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.organizationUserId || !form.leaveType || !form.fromDate) return
    onSuccess?.({
      organizationUserId: form.organizationUserId,
      leaveType: form.leaveType,
      fromDate: form.fromDate,
      toDate: form.toDate || form.fromDate,
      reason: form.reason,
    })
    setForm(EMPTY)
  }

  return (
    <HRQuickForm onSubmit={handleSubmit}>
      <HRQuickFormSection title="Leave request" description="Manager approval required">
        {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
        <Select
          label="Employee *"
          value={form.organizationUserId}
          onChange={(value) => set('organizationUserId', value)}
          options={employeeOptions}
        />
        <Select
          label="Leave type *"
          value={form.leaveType}
          onChange={(value) => set('leaveType', value)}
          options={[{ value: '', label: 'Leave type' }, ...LEAVE_TYPE_OPTIONS]}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="From *"
            type="date"
            value={form.fromDate}
            onChange={(e) => set('fromDate', e.target.value)}
            required
          />
          <Input
            label="To *"
            type="date"
            value={form.toDate}
            min={form.fromDate || undefined}
            onChange={(e) => set('toDate', e.target.value)}
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
