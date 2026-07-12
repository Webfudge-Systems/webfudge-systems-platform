'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import FeedbackRequestForm, { feedbackRequestToForm } from './FeedbackRequestForm'
import { GiveFeedbackForm, giveFeedbackToForm } from './GiveFeedbackForm'
import {
  isCustomFeedbackItem,
  submitFeedback,
  updateFeedbackRequest,
  updateReceivedFeedback,
} from '../../lib/performanceFeedbackService'

export default function FeedbackEditModal({
  item,
  open,
  onClose,
  onSaved,
  mode = 'edit',
  employees = [],
}) {
  const isPending = item?.kind === 'pending'
  const isGive = mode === 'give' && isPending
  const [form, setForm] = useState(() =>
    isGive ? giveFeedbackToForm(item) : isPending ? feedbackRequestToForm(item) : giveFeedbackToForm(null, item),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open || !item) return
    setForm(
      isGive ? giveFeedbackToForm(item) : isPending ? feedbackRequestToForm(item) : giveFeedbackToForm(null, item),
    )
    setSubmitError('')
  }, [open, item, isGive, isPending])

  if (!item) return null

  const editable = isCustomFeedbackItem(item) || isGive

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      setSubmitError('')

      let saved
      if (isGive) {
        saved = submitFeedback(item.id, form)
      } else if (isPending) {
        if (!isCustomFeedbackItem(item)) throw new Error('This feedback request cannot be edited')
        saved = updateFeedbackRequest(item.id, form)
      } else {
        if (!isCustomFeedbackItem(item)) throw new Error('This feedback cannot be edited')
        saved = updateReceivedFeedback(item.id, form)
      }

      onSaved?.(saved)
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to save changes')
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = isGive
    ? 'Give Feedback'
    : isPending
      ? `Edit ${item.label}`
      : 'Edit received feedback'

  const subtitle = isGive
    ? 'Submit your peer or manager feedback for this request'
    : isPending
      ? 'Update request details and due date'
      : 'Update anonymized feedback text and period'

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title={title}
      subtitle={subtitle}
      size="xl"
    >
      {editable || isGive ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          {isGive || !isPending ? (
            <GiveFeedbackForm
              form={form}
              onChange={handleChange}
              pendingLabel={isGive ? item.label : item.sourceLabel}
            />
          ) : (
            <FeedbackRequestForm form={form} onChange={handleChange} employees={employees} />
          )}
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
                  {isGive ? 'Submit Feedback' : 'Save Changes'}
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sample feedback items cannot be edited. Add a new request to customize your workspace.
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
