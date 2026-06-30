'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import AppraisalForm, { appraisalToForm } from './AppraisalForm'
import { isCustomAppraisal, updateAppraisal } from '../../lib/performanceAppraisalsService'

export default function AppraisalEditModal({ appraisal, open, onClose, onSaved }) {
  const [form, setForm] = useState(() => appraisalToForm(appraisal))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open && appraisal) {
      setForm(appraisalToForm(appraisal))
      setSubmitError('')
    }
  }, [open, appraisal])

  if (!appraisal) return null

  const editable = isCustomAppraisal(appraisal)

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!editable) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const updated = updateAppraisal(appraisal.id, form)
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
      title={`Edit ${appraisal.employee}`}
      subtitle="Update rating, revision, promotion, and status"
      size="xl"
    >
      {editable ? (
        <form onSubmit={handleSubmit} className="space-y-5">
          <AppraisalForm form={form} onChange={handleChange} />
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
            Sample appraisals cannot be edited. Add a new appraisal to customize your workspace.
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
