'use client'

import { FormSectionCard, Input } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { EXPENSE_PAYMENT_METHODS, EXPENSE_PAYOUT_STATUSES } from '../../lib/expensesShared'

export default function ExpensePayoutForm({ form, onChange, readOnly = false }) {
  const set = (field, value) => {
    if (readOnly) return
    onChange?.(field, value)
  }

  return (
    <FormSectionCard title="Payout details" description="Reimbursement scheduling and payment method">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Employee *"
          value={form.employee}
          onChange={(e) => set('employee', e.target.value)}
          disabled={readOnly}
          required
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
        <Select
          label="Payment method *"
          value={form.method}
          onChange={(value) => set('method', value)}
          options={EXPENSE_PAYMENT_METHODS.map((m) => ({ value: m, label: m }))}
          disabled={readOnly}
        />
        <Input
          label="Scheduled date *"
          type="date"
          value={form.scheduled}
          onChange={(e) => set('scheduled', e.target.value)}
          disabled={readOnly}
          required
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(value) => set('status', value)}
          options={EXPENSE_PAYOUT_STATUSES.map((s) => ({ value: s, label: s }))}
          disabled={readOnly}
        />
        <Input
          label="Reference"
          value={form.reference}
          onChange={(e) => set('reference', e.target.value)}
          placeholder="Transaction / payroll ref"
          disabled={readOnly}
        />
      </div>
    </FormSectionCard>
  )
}
