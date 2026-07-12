'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { FileText, Plus, RefreshCcw } from 'lucide-react'
import { Button, FormSectionCard, Modal } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { formatPayrollInr, getPayslipGenerationStatus } from '../../lib/payrollPage'
import { generatePayslip, generateAllPayslips } from '../../lib/payrollSyncService'

const ALL_PENDING_VALUE = 'all'

export default function GeneratePayslipModal({
  open,
  onClose,
  selectedRun,
  payslips = [],
  lineItems = [],
  pendingRows = [],
  readOnlyRun = false,
  onGenerated,
  onRecalculate,
  onViewGenerated,
}) {
  const [selection, setSelection] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const runStatus = useMemo(
    () => getPayslipGenerationStatus({ payslips, lineItems }),
    [payslips, lineItems],
  )

  const employeeOptions = useMemo(() => {
    const rows = [
      ...(pendingRows.length > 1
        ? [{ value: ALL_PENDING_VALUE, label: `All pending employees (${pendingRows.length})` }]
        : []),
      ...pendingRows.map((row) => ({
        value: String(row.payrollLineItemId),
        label: `${row.name} · Net ${formatPayrollInr(row.net)}`,
      })),
    ]
    return rows
  }, [pendingRows])

  const selectedRow = useMemo(
    () => pendingRows.find((row) => String(row.payrollLineItemId) === String(selection)) || null,
    [pendingRows, selection],
  )

  const generateCount = selection === ALL_PENDING_VALUE ? pendingRows.length : selection ? 1 : 0

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    if (pendingRows.length === 1) {
      setSelection(String(pendingRows[0].payrollLineItemId))
      return
    }
    setSelection(pendingRows.length > 1 ? ALL_PENDING_VALUE : '')
  }, [open, pendingRows])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedRun?.id || readOnlyRun || !selection || pendingRows.length === 0) return

    const targets =
      selection === ALL_PENDING_VALUE
        ? pendingRows
        : pendingRows.filter((row) => String(row.payrollLineItemId) === String(selection))

    if (!targets.length) return

    try {
      setIsSubmitting(true)
      setSubmitError('')
      if (selection === ALL_PENDING_VALUE) {
        await generateAllPayslips({
          payrollRunId: selectedRun.id,
          payrollLineItemIds: pendingRows.map((row) => row.payrollLineItemId),
        })
      } else {
        await generatePayslip({
          payrollRunId: selectedRun.id,
          payrollLineItemId: targets[0].payrollLineItemId,
        })
      }
      await onGenerated?.(selectedRun.id)
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to generate payslip')
    } finally {
      setIsSubmitting(false)
    }
  }

  const runLabel = selectedRun?.monthLabel || 'No run selected'
  const canSubmit = Boolean(selectedRun?.id) && !readOnlyRun && selection && runStatus.canGenerate

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title="Generate Payslip"
      subtitle={`Create payslips for ${runLabel}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionCard
          icon={FileText}
          title="Payslip details"
          description={
            runStatus.kind === 'all-generated'
              ? 'Payslips for this run are already generated'
              : 'Choose employees without a payslip in this payroll run'
          }
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Payroll run</p>
              <p className="mt-1">{runLabel}</p>
              <p className="mt-2 text-gray-600">{runStatus.message}</p>
              {runStatus.stats.generated > 0 ? (
                <p className="mt-2 font-medium text-emerald-700">
                  {runStatus.stats.generated} payslip{runStatus.stats.generated === 1 ? '' : 's'} already generated for this run.
                </p>
              ) : null}
            </div>

            {runStatus.kind === 'no-employees' ? (
              <div className="flex flex-wrap gap-2">
                {onRecalculate && selectedRun?.status === 'draft' ? (
                  <Button type="button" variant="secondary" className="gap-2" onClick={onRecalculate}>
                    <RefreshCcw className="h-4 w-4" aria-hidden />
                    Recalculate run
                  </Button>
                ) : null}
                <Link
                  href="/payroll"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Go to Payroll Overview
                </Link>
              </div>
            ) : null}

            {runStatus.kind === 'all-generated' ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="primary"
                  className="bg-orange-500 hover:bg-orange-600"
                  onClick={() => {
                    onViewGenerated?.()
                    onClose?.()
                  }}
                >
                  View Generated tab
                </Button>
              </div>
            ) : null}

            {runStatus.canGenerate ? (
              <Select
                label="Employee *"
                value={selection}
                onChange={setSelection}
                options={employeeOptions}
                placeholder="Select employee"
                allowEmpty={false}
                disabled={readOnlyRun || isSubmitting}
              />
            ) : null}

            {selectedRow ? (
              <div className="rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{selectedRow.name}</p>
                <p className="mt-1">
                  {selectedRow.dept} · Net pay {formatPayrollInr(selectedRow.net)}
                </p>
              </div>
            ) : null}

            {selection === ALL_PENDING_VALUE ? (
              <div className="rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">Bulk generation</p>
                <p className="mt-1">
                  Payslips will be generated for all {pendingRows.length} pending employees in this run.
                </p>
              </div>
            ) : null}

            {readOnlyRun ? (
              <p className="text-sm text-amber-700">
                This payroll run is locked or disbursed. Payslips cannot be generated.
              </p>
            ) : null}
          </div>
        </FormSectionCard>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          {runStatus.canGenerate ? (
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="gap-2 bg-orange-500 hover:bg-orange-600"
            >
              {isSubmitting ? (
                'Generating…'
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden />
                  Generate {generateCount > 1 ? `${generateCount} Payslips` : 'Payslip'}
                </>
              )}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
