'use client'

import { useState } from 'react'
import { Button } from '@webfudge/ui'
import HRModal from '../shared/HRModal'
import { HR_QUICK_ACTION_META, HR_QUICK_ACTION_IDS } from '../../lib/quickActions'
import { HR_QUICK_FORM_ID } from './HRQuickFormFields'
import { useHRQuickActions } from './HRQuickActionsContext'
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

  const meta = activeAction ? HR_QUICK_ACTION_META[activeAction] : null
  const FormComponent = activeAction ? FORM_MAP[activeAction] : null

  const handleSuccess = (payload) => {
    setSubmitting(true)
    console.log('[HR Quick action]', activeAction, payload)
    setTimeout(() => {
      setSubmitting(false)
      closeQuickAction()
    }, 400)
  }

  if (!meta || !FormComponent) return null

  return (
    <HRModal
      open={isOpen}
      onClose={closeQuickAction}
      title={meta.title}
      subtitle={meta.subtitle}
      sizeClass="max-w-md"
      footer={
        <>
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
        </>
      }
    >
      <FormComponent onSuccess={handleSuccess} />
    </HRModal>
  )
}
