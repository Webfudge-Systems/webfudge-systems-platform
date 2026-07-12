'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import ExpensePayoutForm from './ExpensePayoutForm'
import { expensePayoutToForm, parsePayoutForm } from '../../lib/expensesShared'
import useExpenseData from '../../hooks/useExpenseData'

export default function EditExpensePayoutModal({ payout, open, onClose, onSaved }) {
  const { updatePayout } = useExpenseData()
  const [form, setForm] = useState(() => expensePayoutToForm(payout))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open || !payout) return
    setForm(expensePayoutToForm(payout))
    setSubmitError('')
  }, [open, payout])

  if (!payout) return null

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = parsePayoutForm(form)
    if (!payload.employee || !payload.amount) {
      setSubmitError('Please fill in all required fields.')
      return
    }
    try {
      setIsSubmitting(true)
      setSubmitError('')
      updatePayout(payout.id, payload)
      onSaved?.()
      onClose?.()
    } catch (err) {
      setSubmitError(err?.message || 'Failed to update payout')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Edit payout" subtitle={payout.employee} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <ExpensePayoutForm form={form} onChange={handleChange} />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-5">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting}>
            <Save className="h-4 w-4" aria-hidden />
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
