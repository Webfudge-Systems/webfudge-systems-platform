'use client'

import { useEffect, useState } from 'react'
import { Button, Modal, Textarea } from '@webfudge/ui'

export default function ExpenseRejectModal({ open, claim, onClose, onConfirm, submitting = false }) {
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setReason('')
  }, [open, claim?.id])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!claim?.id) return
    await onConfirm?.(claim.id, reason.trim())
  }

  return (
    <Modal
      isOpen={open}
      onClose={() => !submitting && onClose?.()}
      title="Reject expense claim"
      subtitle={claim ? `${claim.employee} · ${claim.expenseNumber || claim.id}` : ''}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-gray-600">
          The employee will see this claim as rejected in ESS. Optionally add a reason.
        </p>
        <Textarea
          label="Rejection reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Missing receipt or policy limit exceeded"
          rows={3}
        />
        <div className="flex justify-end gap-2 border-t border-gray-200 pt-4">
          <Button variant="outline" type="button" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="!bg-red-600 hover:!bg-red-700"
            disabled={submitting}
          >
            {submitting ? 'Rejecting…' : 'Reject claim'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
