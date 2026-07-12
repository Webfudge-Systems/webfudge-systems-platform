'use client'

import { useEffect, useMemo, useState } from 'react'
import { Receipt } from 'lucide-react'
import { Checkbox, FormSectionCard, Input, Modal, Textarea } from '@webfudge/ui'
import { Select } from '../shared/ESSSelect'
import {
  createExpenseClaim,
  deleteExpenseClaim,
  updateExpenseClaim,
} from '../../lib/expenseSyncService'
import {
  expenseClaimToForm,
  getExpenseCategoryOptions,
  notifyExpenseUpdated,
  parseClaimForm,
  formatExpenseAmount,
  getExpenseCategoryLabel,
} from '../../lib/expenseShared'

function ESSExpenseClaimForm({ form, onChange, readOnly = false }) {
  const categories = useMemo(() => getExpenseCategoryOptions(), [])
  const set = (field, value) => {
    if (readOnly) return
    onChange?.(field, value)
  }

  return (
    <FormSectionCard icon={Receipt} title="Expense claim">
      <Select
        label="Category *"
        value={form.category}
        onChange={(value) => set('category', value)}
        options={[{ value: '', label: 'Select category' }, ...categories]}
        disabled={readOnly}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="Amount (₹) *"
          type="number"
          min="0"
          value={form.amount}
          onChange={(e) => set('amount', e.target.value)}
          disabled={readOnly}
        />
        <Input
          label="Expense date *"
          type="date"
          value={form.submitted}
          onChange={(e) => set('submitted', e.target.value)}
          disabled={readOnly}
        />
      </div>
      <Textarea
        label="Description *"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={3}
        disabled={readOnly}
      />
      {!readOnly ? (
        <Checkbox
          checked={form.receipt}
          onChange={(checked) => set('receipt', checked)}
          label="I have a receipt for this expense"
          disabled={readOnly}
        />
      ) : (
        <p className="text-sm text-gray-600">
          Receipt: {form.receipt ? 'Yes' : 'No'}
        </p>
      )}
    </FormSectionCard>
  )
}

export default function ESSSubmitExpenseModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(() => expenseClaimToForm(null))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(expenseClaimToForm(null))
    setError('')
  }, [open])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    const payload = parseClaimForm(form)
    if (!payload.category || !payload.amount || !payload.description) {
      setError('Please fill in all required fields.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      await createExpenseClaim(payload)
      notifyExpenseUpdated()
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Failed to submit claim')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => !submitting && onClose?.()}
      title="Submit expense claim"
      subtitle="HR will review before reimbursement"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ESSExpenseClaimForm form={form} onChange={set} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Submitting…' : 'Submit claim'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ESSEditExpenseModal({ open, claim, onClose, onSuccess }) {
  const [form, setForm] = useState(() => expenseClaimToForm(claim))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setForm(expenseClaimToForm(claim))
    setError('')
  }, [open, claim])

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!claim?.id) return
    const payload = parseClaimForm(form)
    if (!payload.category || !payload.amount || !payload.description) {
      setError('Please fill in all required fields.')
      return
    }
    try {
      setSubmitting(true)
      setError('')
      await updateExpenseClaim(claim.id, payload)
      notifyExpenseUpdated()
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Failed to update claim')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => !submitting && onClose?.()}
      title="Edit expense claim"
      subtitle={claim?.expenseNumber || ''}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <ESSExpenseClaimForm form={form} onChange={set} />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <button
            type="button"
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ESSExpenseDetailModal({ open, claim, onClose, onEdit, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const isPending = claim?.status === 'Pending'

  const handleDelete = async () => {
    if (!claim?.id || !window.confirm('Delete this expense claim?')) return
    try {
      setDeleting(true)
      setError('')
      await deleteExpenseClaim(claim.id)
      notifyExpenseUpdated()
      onDelete?.()
      onClose?.()
    } catch (err) {
      setError(err?.message || 'Failed to delete claim')
    } finally {
      setDeleting(false)
    }
  }

  if (!claim) return null

  return (
    <Modal
      isOpen={open}
      onClose={() => !deleting && onClose?.()}
      title={claim.expenseNumber || 'Expense claim'}
      subtitle={claim.status}
      size="sm"
    >
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-gray-500">Category</p>
            <p className="font-medium">{getExpenseCategoryLabel(claim.category)}</p>
          </div>
          <div>
            <p className="text-gray-500">Amount</p>
            <p className="font-medium">{formatExpenseAmount(claim.amount)}</p>
          </div>
          <div>
            <p className="text-gray-500">Expense date</p>
            <p className="font-medium">{claim.submitted || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Receipt</p>
            <p className="font-medium">{claim.receipt ? 'Yes' : 'No'}</p>
          </div>
        </div>
        <div>
          <p className="text-gray-500">Description</p>
          <p className="font-medium">{claim.description || '—'}</p>
        </div>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          {isPending ? (
            <>
              <button
                type="button"
                className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white"
                onClick={() => {
                  onClose?.()
                  onEdit?.(claim)
                }}
              >
                Edit
              </button>
            </>
          ) : (
            <button
              type="button"
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
