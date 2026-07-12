'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import ExpenseClaimForm from './ExpenseClaimForm'
import { expenseClaimToForm, parseClaimForm } from '../../lib/expensesShared'
import useExpenseData from '../../hooks/useExpenseData'

export default function EditExpenseClaimModal({ claim, open, onClose, onSaved }) {
  const { updateClaim } = useExpenseData()
  const [form, setForm] = useState(() => expenseClaimToForm(claim))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open || !claim) return
    setForm(expenseClaimToForm(claim))
    setSubmitError('')
  }, [open, claim])

  if (!claim) return null

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = parseClaimForm(form)
    if (!payload.category || !payload.amount || !payload.description) {
      setSubmitError('Please fill in all required fields.')
      return
    }
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await updateClaim(claim.id, payload, {
        submittedById: payload.employeeId || claim.submittedById,
      })
      onSaved?.()
      onClose?.()
    } catch (err) {
      setSubmitError(err?.message || 'Failed to update claim')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Edit expense claim"
      subtitle={claim.employee}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <ExpenseClaimForm form={form} onChange={handleChange} readOnly={claim.status !== 'Pending'} />
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-5">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting || claim.status !== 'Pending'}>
            <Save className="h-4 w-4" aria-hidden />
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
