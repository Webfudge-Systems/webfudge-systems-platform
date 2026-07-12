'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import GoalForm, { goalToForm } from './GoalForm'
import { createGoal } from '../../lib/performanceGoalsService'

export default function AddGoalModal({ open, onClose, onSaved, employees = [] }) {
  const [form, setForm] = useState(() => goalToForm(null))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(goalToForm(null))
    setSubmitError('')
  }, [open])

  const handleChange = (field, value) => {
    setForm((prev) => {
      if (field === 'scope') {
        if (value === 'department') {
          return { ...prev, scope: value, assigneeId: '', assigneeName: '' }
        }
        if (value === 'individual') {
          return { ...prev, scope: value, department: '' }
        }
        return { ...prev, scope: value, department: '', assigneeId: '', assigneeName: '' }
      }
      return { ...prev, [field]: value }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    try {
      setIsSubmitting(true)
      setSubmitError('')
      if (form.scope === 'department' && !form.department) {
        throw new Error('Department is required for department-scoped goals')
      }
      const created = await createGoal(form)
      await onSaved?.(created)
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to create goal')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title="Add Goal"
      subtitle="Create a new objective with measurable key results"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <GoalForm form={form} onChange={handleChange} employees={employees} />
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
                Create Goal
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
