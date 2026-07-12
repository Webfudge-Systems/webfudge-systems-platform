'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import GoalForm, { goalToForm } from './GoalForm'
import { isCustomGoal, updateGoal } from '../../lib/performanceGoalsService'

export default function GoalEditModal({ goal, open, onClose, onSaved, employees = [] }) {
  const [form, setForm] = useState(() => goalToForm(goal))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open && goal) {
      setForm(goalToForm(goal))
      setSubmitError('')
    }
  }, [open, goal])

  if (!goal) return null

  const editable = isCustomGoal(goal)

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
    if (!editable) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      if (form.scope === 'department' && !form.department) {
        throw new Error('Department is required for department-scoped goals')
      }
      const updated = updateGoal(goal.id, form)
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
      title={`Edit ${goal.objective}`}
      subtitle="Update objective details and key results"
      size="xl"
    >
      {editable ? (
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
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Sample company goals cannot be edited. Add a new goal to customize your workspace.
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
