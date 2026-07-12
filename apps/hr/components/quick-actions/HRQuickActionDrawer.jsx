'use client'

import { useState } from 'react'
import { Button, Modal } from '@webfudge/ui'
import { HR_QUICK_ACTION_META, HR_QUICK_ACTION_IDS } from '../../lib/quickActions'
import { HR_QUICK_FORM_ID } from './HRQuickFormFields'
import { useHRQuickActions } from './HRQuickActionsContext'
import { notifyLeaveUpdated } from '../../lib/leaveShared'
import { createLeaveRequest } from '../../lib/leaveSyncService'
import { createExpenseClaim } from '../../lib/expenseSyncService'
import { notifyHrExpensesUpdated } from '../../lib/expensesShared'
import AddEmployeeQuickForm from './AddEmployeeQuickForm'
import ApplyLeaveQuickForm from './ApplyLeaveQuickForm'
import NewExpenseQuickForm from './NewExpenseQuickForm'
import PostJobQuickForm from './PostJobQuickForm'

const FORM_MAP = {
  [HR_QUICK_ACTION_IDS.ADD_EMPLOYEE]: AddEmployeeQuickForm,
  [HR_QUICK_ACTION_IDS.APPLY_LEAVE]: ApplyLeaveQuickForm,
  [HR_QUICK_ACTION_IDS.NEW_EXPENSE]: NewExpenseQuickForm,
  [HR_QUICK_ACTION_IDS.POST_JOB]: PostJobQuickForm,
}

export default function HRQuickActionDrawer() {
  const { activeAction, closeQuickAction, isOpen } = useHRQuickActions()
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const meta = activeAction ? HR_QUICK_ACTION_META[activeAction] : null
  const FormComponent = activeAction ? FORM_MAP[activeAction] : null

  const handleSuccess = async (payload) => {
    setSubmitting(true)
    setSubmitError('')
    try {
      if (activeAction === HR_QUICK_ACTION_IDS.APPLY_LEAVE) {
        await createLeaveRequest(payload)
        notifyLeaveUpdated()
      } else if (activeAction === HR_QUICK_ACTION_IDS.NEW_EXPENSE) {
        await createExpenseClaim({
          category: payload.category,
          amount: payload.amount,
          submitted: payload.submitted,
          description: payload.description,
          receipt: payload.receipt,
          status: 'Pending',
        })
        notifyHrExpensesUpdated()
      } else {
        console.log('[HR Quick action]', activeAction, payload)
      }
      closeQuickAction()
    } catch (err) {
      setSubmitError(err?.message || 'Failed to save')
    } finally {
      setSubmitting(false)
    }
  }

  if (!meta || !FormComponent) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeQuickAction}
      title={meta.title}
      subtitle={meta.subtitle}
      size="sm"
    >
      <FormComponent onSuccess={handleSuccess} />
      {submitError ? <p className="mt-3 text-sm text-red-600">{submitError}</p> : null}
      <div className="mt-4 flex justify-end gap-2 border-t border-gray-200 pt-4">
        <Button type="button" variant="secondary" onClick={closeQuickAction} disabled={submitting}>
          Cancel
        </Button>
        <Button
          type="submit"
          form={HR_QUICK_FORM_ID}
          variant="primary"
          className="bg-orange-500 hover:bg-orange-600"
          disabled={submitting}
        >
          {submitting ? 'Saving…' : meta.submitLabel}
        </Button>
      </div>
    </Modal>
  )
}
