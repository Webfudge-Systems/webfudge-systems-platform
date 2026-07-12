'use client'

import { useState } from 'react'
import { Input, Textarea, Checkbox } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { getExpenseCategoryOptions } from '../../lib/expensesShared'
import { HRQuickForm, HRQuickFormSection } from './HRQuickFormFields'

const EMPTY = {
  category: '',
  amount: '',
  description: '',
  submitted: '',
  receipt: true,
}

export default function NewExpenseQuickForm({ onSuccess }) {
  const [form, setForm] = useState({
    ...EMPTY,
    submitted: new Date().toISOString().slice(0, 10),
  })

  const categories = getExpenseCategoryOptions()

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSuccess?.(form)
    setForm({
      ...EMPTY,
      submitted: new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <HRQuickForm onSubmit={handleSubmit}>
      <HRQuickFormSection title="Expense claim" description="Attach receipt after submit if needed">
        <Select
          label="Category *"
          value={form.category}
          onChange={(value) => set('category', value)}
          options={[
            { value: '', label: 'Select category' },
            ...categories.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />
        <Input
          label="Amount (₹) *"
          type="number"
          min="0"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          placeholder="0"
          required
        />
        <Input
          label="Date *"
          type="date"
          value={form.submitted}
          onChange={(e) => set('submitted', e.target.value)}
          required
        />
        <Textarea
          label="Description *"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What was this expense for?"
          rows={3}
          required
        />
        <Checkbox
          checked={form.receipt}
          onChange={(checked) => set('receipt', checked)}
          label="Receipt attached or will upload later"
        />
      </HRQuickFormSection>
    </HRQuickForm>
  )
}
