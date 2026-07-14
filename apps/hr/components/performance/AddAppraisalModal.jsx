'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import AppraisalForm, { appraisalToForm } from './AppraisalForm'
import { createAppraisal } from '../../lib/performanceAppraisalsService'

export default function AddAppraisalModal({ open, onClose, onSaved, employees = [] }) {
  const [form, setForm] = useState(() => appraisalToForm(null))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(appraisalToForm(null))
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
      const created = createAppraisal(form)
      await onSaved?.(created)
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create appraisal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title="Add Appraisal"
      subtitle="Create a new employee appraisal record"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AppraisalForm form={form} onChange={handleChange} employees={employees} />
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
                Create Appraisal
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
