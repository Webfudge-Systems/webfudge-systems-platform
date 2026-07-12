'use client'

import { CheckCircle, Edit, Trash2, XCircle } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import ExpenseClaimForm from './ExpenseClaimForm'
import { expenseClaimToForm, formatExpenseAmount, getExpenseCategoryLabel } from '../../lib/expensesShared'

export default function ExpenseClaimDetailModal({
  claim,
  open,
  onClose,
  onEdit,
  onDelete,
  showDelete = true,
  approvalMode = false,
  onApprove,
  onReject,
  acting = false,
}) {
  if (!claim) return null

  const form = expenseClaimToForm(claim)
  const isPending = claim.status === 'Pending'

  return (
    <Modal
      isOpen={open}
      onClose={() => !acting && onClose?.()}
      title={claim.employee}
      subtitle={`${getExpenseCategoryLabel(claim.category)} · ${claim.status} · ${formatExpenseAmount(claim.amount)}`}
      size="lg"
    >
      <div className="space-y-5">
        {claim.expenseNumber ? (
          <p className="text-sm text-gray-500">
            Claim <span className="font-medium text-gray-700">{claim.expenseNumber}</span>
            {claim.receipt ? ' · Receipt attached' : ' · No receipt'}
          </p>
        ) : null}

        <ExpenseClaimForm form={form} readOnly />

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button variant="outline" onClick={onClose} disabled={acting}>
            Close
          </Button>

          {approvalMode && isPending ? (
            <>
              <Button
                variant="secondary"
                className="gap-2 text-red-600 hover:bg-red-50"
                disabled={acting}
                onClick={() => onReject?.(claim)}
              >
                <XCircle className="h-4 w-4" aria-hidden />
                Reject
              </Button>
              <Button
                variant="primary"
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                disabled={acting}
                onClick={() => onApprove?.(claim)}
              >
                <CheckCircle className="h-4 w-4" aria-hidden />
                {acting ? 'Approving…' : 'Approve'}
              </Button>
            </>
          ) : (
            <>
              {showDelete ? (
                <Button
                  variant="secondary"
                  className="gap-2 text-red-600 hover:bg-red-50"
                  onClick={() => onDelete?.(claim)}
                  disabled={acting}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Delete
                </Button>
              ) : null}
              <Button variant="secondary" className="gap-2" onClick={() => onEdit?.(claim)} disabled={acting}>
                <Edit className="h-4 w-4" aria-hidden />
                Edit
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}
