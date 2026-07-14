'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import PayrollRecordForm, { payrollRecordToForm } from './PayrollRecordForm'
import { updatePayrollLineItem } from '../../lib/payrollSyncService'
import { getSyncedEmployeeById } from '../../lib/employeeSyncService'
import { resolvePayrollLineItemBlockers } from '../../lib/payrollShared'

export default function EditPayrollRecordModal({
  record,
  open,
  onClose,
  readOnlyRun = false,
  month,
  onSaved,
}) {
  const [form, setForm] = useState(() => payrollRecordToForm(record))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (open && record) {
      setForm(payrollRecordToForm(record))
      setSubmitError('')
    }
  }, [open, record])

  if (!record) return null

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (readOnlyRun) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      const gross = Number(form.gross || 0)
      const pf = Number(form.pf || 0)
      const esi = Number(form.esi || 0)
      const pt = Number(form.pt || 0)
      const tds = Number(form.tds || 0)
      const net = Number(form.net || 0)
      const blockers = await resolvePayrollLineItemBlockers(
        record,
        { gross, net },
        getSyncedEmployeeById,
      )
      await updatePayrollLineItem(record.id, {
        gross,
        pf,
        esi,
        pt,
        tds,
        net,
        deductionsTotal: pf + esi + pt + tds,
        missingSalaryStructure: blockers.missingSalaryStructure,
        missingBankDetails: blockers.missingBankDetails,
      })
      await onSaved?.()
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
      title={`Edit ${record.name}`}
      subtitle="Update salary and deduction details for this payroll run"
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <PayrollRecordForm form={form} onChange={handleChange} month={month} />
        {readOnlyRun ? (
          <p className="text-sm text-amber-700">This payroll run is locked and cannot be edited.</p>
        ) : null}
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || readOnlyRun} className="gap-2">
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
