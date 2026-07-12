'use client'

import { useEffect, useMemo, useState } from 'react'
import { Banknote, CheckCircle, Save } from 'lucide-react'
import { Button, Input, Modal } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import { EXPENSE_PAYMENT_METHODS, formatExpenseAmount } from '../../lib/expensesShared'
import useExpenseData from '../../hooks/useExpenseData'

export default function AddExpensePayoutModal({ open, onClose, onSaved, defaultExpenseId = '' }) {
  const { claims, reimburseClaim } = useExpenseData()
  const [expenseId, setExpenseId] = useState('')
  const [method, setMethod] = useState('Bank Transfer')
  const [scheduled, setScheduled] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const approvedClaims = useMemo(
    () => claims.filter((claim) => claim.status === 'Approved'),
    [claims],
  )

  useEffect(() => {
    if (!open) return
    const preferred =
      defaultExpenseId && approvedClaims.some((claim) => String(claim.id) === String(defaultExpenseId))
        ? String(defaultExpenseId)
        : approvedClaims[0]
          ? String(approvedClaims[0].id)
          : ''
    setExpenseId(preferred)
    setMethod('Bank Transfer')
    setScheduled(new Date().toISOString().slice(0, 10))
    setReference('')
    setSubmitError('')
  }, [open, approvedClaims, defaultExpenseId])

  const selectedClaim = useMemo(
    () => approvedClaims.find((claim) => String(claim.id) === String(expenseId)) || null,
    [approvedClaims, expenseId],
  )

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!expenseId) {
      setSubmitError('Select an approved claim to reimburse.')
      return
    }
    try {
      setIsSubmitting(true)
      setSubmitError('')
      await reimburseClaim(expenseId, {
        method,
        scheduled,
        reference: reference || selectedClaim?.expenseNumber,
      })
      onSaved?.()
      onClose?.()
    } catch (err) {
      setSubmitError(err?.message || 'Failed to process payout')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="Process payout" subtitle="Reimburse an approved claim via Books" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <Select
          label="Approved claim *"
          value={expenseId}
          onChange={setExpenseId}
          options={[
            { value: '', label: approvedClaims.length ? 'Select claim' : 'No approved claims' },
            ...approvedClaims.map((claim) => ({
              value: String(claim.id),
              label: `${claim.employee} · ${formatExpenseAmount(claim.amount)} · ${claim.expenseNumber || claim.id}`,
            })),
          ]}
        />
        {selectedClaim ? (
          <p className="rounded-lg border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-gray-700">
            {selectedClaim.categoryLabel || selectedClaim.category} · {selectedClaim.description || 'No description'}
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Payment method *"
            value={method}
            onChange={setMethod}
            options={EXPENSE_PAYMENT_METHODS.map((item) => ({ value: item, label: item }))}
          />
          <Input label="Payment date *" type="date" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
        </div>
        <Input
          label="Reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Transaction / payroll reference"
        />
        <p className="text-xs text-gray-500">
          Books sync: creates a payment-made record and posts DR Accounts Payable · CR Cash.
        </p>
        {submitError ? <p className="text-sm text-red-600">{submitError}</p> : null}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-5">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitting || !approvedClaims.length}>
            <Save className="h-4 w-4" aria-hidden />
            {isSubmitting ? 'Processing…' : 'Mark reimbursed'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
