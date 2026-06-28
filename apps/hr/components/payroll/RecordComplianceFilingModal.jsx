'use client'

import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Save } from 'lucide-react'
import { Button, FormSectionCard, Input, Modal, Textarea } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { formatPayrollInr } from '../../lib/payrollPage'

export default function RecordComplianceFilingModal({
  open,
  onClose,
  selectedRun,
  obligations = [],
  initialObligationId = '',
  readOnlyRun = false,
  onSaved,
}) {
  const [obligationId, setObligationId] = useState('')
  const [reference, setReference] = useState('')
  const [filedAt, setFiledAt] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const fileableRows = useMemo(
    () => obligations.filter((row) => row.status === 'Ready'),
    [obligations],
  )

  const obligationOptions = useMemo(
    () =>
      fileableRows.map((row) => ({
        value: row.id,
        label: `${row.name} · ${formatPayrollInr(row.amount)}`,
      })),
    [fileableRows],
  )

  const selectedRow = useMemo(
    () => fileableRows.find((row) => row.id === obligationId) || null,
    [fileableRows, obligationId],
  )

  useEffect(() => {
    if (!open) return
    setSubmitError('')
    setReference('')
    setNotes('')
    setFiledAt(new Date().toISOString().slice(0, 10))
    const preferred =
      initialObligationId && fileableRows.some((row) => row.id === initialObligationId)
        ? initialObligationId
        : fileableRows[0]?.id || ''
    setObligationId(preferred)
  }, [open, fileableRows, initialObligationId])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!selectedRun?.id || !obligationId || readOnlyRun) return
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await onSaved?.({
        obligationId,
        reference: reference.trim(),
        notes: notes.trim(),
        filedAt: filedAt ? new Date(filedAt).toISOString() : new Date().toISOString(),
      })
      onClose?.()
    } catch (error) {
      setSubmitError(error?.message || 'Failed to record filing')
    } finally {
      setIsSubmitting(false)
    }
  }

  const runLabel = selectedRun?.monthLabel || 'No run selected'
  const canSubmit = Boolean(selectedRun?.id) && obligationId && !readOnlyRun && fileableRows.length > 0

  return (
    <Modal
      isOpen={open}
      onClose={() => !isSubmitting && onClose?.()}
      title="Record Filing"
      subtitle={`Mark statutory filing for ${runLabel}`}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormSectionCard
          icon={ShieldCheck}
          title="Filing details"
          description="Record acknowledgement for PF, ESI, PT, or TDS obligations"
        >
          <div className="grid grid-cols-1 gap-6">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
              <p className="font-semibold text-gray-900">Payroll run</p>
              <p className="mt-1">{runLabel}</p>
              <p className="mt-2 text-gray-600">
                {fileableRows.length === 0
                  ? 'Lock the payroll run to mark obligations as ready, then record filing acknowledgements here.'
                  : `${fileableRows.length} obligation${fileableRows.length === 1 ? '' : 's'} ready to file.`}
              </p>
            </div>

            {fileableRows.length > 0 ? (
              <>
                <Select
                  label="Obligation *"
                  value={obligationId}
                  onChange={setObligationId}
                  options={obligationOptions}
                  allowEmpty={false}
                  disabled={readOnlyRun || isSubmitting}
                />
                <Input
                  label="Acknowledgement / reference no."
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. EPFO-TRRN-202606-001"
                  disabled={isSubmitting}
                />
                <Input
                  label="Filed date"
                  type="date"
                  value={filedAt}
                  onChange={(e) => setFiledAt(e.target.value)}
                  disabled={isSubmitting}
                />
                <Textarea
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this filing"
                  rows={3}
                  disabled={isSubmitting}
                />
              </>
            ) : null}

            {selectedRow ? (
              <div className="rounded-lg border border-orange-100 bg-orange-50/60 px-4 py-3 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">{selectedRow.name}</p>
                <p className="mt-1">
                  {selectedRow.authority} · Liability {formatPayrollInr(selectedRow.amount)} · {selectedRow.period}
                </p>
              </div>
            ) : null}

            {readOnlyRun ? (
              <p className="text-sm text-amber-700">Filings cannot be edited while the payroll run is read-only.</p>
            ) : null}
          </div>
        </FormSectionCard>

        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
            Cancel
          </Button>
          {fileableRows.length > 0 ? (
            <Button type="submit" disabled={!canSubmit || isSubmitting} className="gap-2">
              {isSubmitting ? (
                'Saving…'
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  Record Filing
                </>
              )}
            </Button>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}
