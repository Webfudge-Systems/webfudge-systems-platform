'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import ReviewCycleForm, { reviewCycleToForm } from './ReviewCycleForm'
import { createReviewCycle } from '../../lib/performanceReviewsService'

export default function AddReviewCycleModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState(() => reviewCycleToForm(null))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(reviewCycleToForm(null))
    setSubmitError('')
  }, [open])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const created = createReviewCycle(form)
      await onSaved?.(created)
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create review cycle')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title="Add Review Cycle"
      subtitle="Create a new quarterly or annual review cycle"
      size="xl"
    >
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
                Create Cycle
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
