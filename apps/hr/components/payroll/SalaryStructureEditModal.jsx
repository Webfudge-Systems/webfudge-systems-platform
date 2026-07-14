'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import SalaryStructureForm, { salaryStructureToForm } from './SalaryStructureForm'
import { updateSalaryStructure } from '../../lib/payrollSyncService'

export default function SalaryStructureEditModal({ structure, open, onClose, onSaved }) {
  const [form, setForm] = useState(() => salaryStructureToForm(structure))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open && structure) {
      setForm(salaryStructureToForm(structure))
      setSubmitError('')
    }
  }, [open, structure])

  if (!structure) return null

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const updated = await updateSalaryStructure(structure.id, {
        name: form.name,
        ctc: Number(form.ctc || 0),
        basicPercent: Number(form.basicPercent || 0),
        hraPercent: Number(form.hraPercent || 0),
        specialAllowancePercent: Number(form.specialAllowancePercent || 0),
        fbpPercent: Number(form.fbpPercent || 0),
      })
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
      title={`Edit ${structure.name}`}
      subtitle="Update CTC band and salary component splits"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <SalaryStructureForm form={form} onChange={handleChange} />
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
    </Modal>
  )
}
