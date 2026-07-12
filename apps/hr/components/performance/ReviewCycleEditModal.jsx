'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import ReviewCycleForm, { reviewCycleToForm } from './ReviewCycleForm'
import { isCustomReviewCycle, updateReviewCycle } from '../../lib/performanceReviewsService'

export default function ReviewCycleEditModal({ cycle, open, onClose, onSaved }) {
  const [form, setForm] = useState(() => reviewCycleToForm(cycle))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open && cycle) {
      setForm(reviewCycleToForm(cycle))
      setSubmitError('')
    }
  }, [open, cycle])

  if (!cycle) return null

  const editable = isCustomReviewCycle(cycle)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!editable) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const updated = updateReviewCycle(cycle.id, form)
      onSaved?.(updated)
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to save changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title={`Edit ${cycle.name}`}
      subtitle="Update cycle details and completion progress"
      size="xl"
    >
      {editable ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <ReviewCycleForm form={form} onChange={handleChange} />
          {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                'Saving…'
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sample review cycles cannot be edited. Add a new cycle to customize your workspace.
          </p>
          <div className="flex justify-end border-t border-gray-200 pt-5">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
