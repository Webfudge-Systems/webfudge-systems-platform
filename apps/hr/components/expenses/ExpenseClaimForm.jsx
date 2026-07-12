'use client'

import { useEffect, useMemo, useState } from 'react'
import { Checkbox, FormSectionCard, Input, Textarea } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { EXPENSE_STATUSES, getExpenseCategoryOptions } from '../../lib/expensesShared'
import { listSyncedEmployees } from '../../lib/employeeSyncService'

export default function ExpenseClaimForm({ form, onChange, readOnly = false }) {
  const [employees, setEmployees] = useState([])
  const categories = useMemo(() => getExpenseCategoryOptions(), [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { employees: rows } = await listSyncedEmployees()
        if (!cancelled) setEmployees(rows || [])
      } catch {
        if (!cancelled) setEmployees([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        value: String(employee.userId || ''),
        label: `${employee.name} · ${employee.employeeId || employee.id}`,
      })),
    [employees],
  )

  const set = (field, value) => {
    if (readOnly) return
    onChange?.(field, value)
  }

  const handleEmployeeChange = (userId) => {
    const employee = employees.find((row) => String(row.userId) === String(userId))
    onChange?.('employeeId', userId)
    onChange?.('employee', employee?.name || '')
  }

  return (
    <div className="space-y-5">
      <FormSectionCard title="Claim details" description="Employee expense submission synced to Books">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {readOnly ? (
            <Input label="Employee *" value={form.employee} disabled readOnly />
          ) : (
            <Select
              label="Employee *"
              value={form.employeeId}
              onChange={handleEmployeeChange}
              options={[{ value: '', label: 'Select employee' }, ...employeeOptions]}
            />
          )}
          <Select
            label="Category *"
            value={form.category}
            onChange={(value) => set('category', value)}
            options={[{ value: '', label: 'Select category' }, ...categories]}
            disabled={readOnly}
          />
          <Input
            label="Amount (₹) *"
            type="number"
            min="0"
            value={form.amount}
            onChange={(e) => set('amount', e.target.value)}
            disabled={readOnly}
            required
          />
          <Input
            label="Submitted date *"
            type="date"
            value={form.submitted}
            onChange={(e) => set('submitted', e.target.value)}
            disabled={readOnly}
            required
          />
          {readOnly ? (
            <Input label="Status" value={form.status} disabled readOnly />
          ) : (
            <Select
              label="Status"
              value={form.status}
              onChange={(value) => set('status', value)}
              options={EXPENSE_STATUSES.map((s) => ({ value: s, label: s }))}
              disabled
            />
          )}
        </div>
        <Textarea
          label="Description *"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What was this expense for?"
          rows={3}
          disabled={readOnly}
          required
        />
        <Checkbox
          checked={form.receipt}
          onChange={(checked) => set('receipt', checked)}
          label="Receipt attached"
          disabled={readOnly}
        />
      </FormSectionCard>
    </div>
  )
}
