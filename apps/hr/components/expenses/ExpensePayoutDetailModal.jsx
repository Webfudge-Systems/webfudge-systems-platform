'use client'

import { CheckCircle } from 'lucide-react'
import { Button, Modal } from '@webfudge/ui'
import ExpensePayoutForm from './ExpensePayoutForm'
import { expensePayoutToForm, formatExpenseAmount } from '../../lib/expensesShared'

export default function ExpensePayoutDetailModal({
  payout,
  open,
  onClose,
  onReimburse,
  acting = false,
}) {
  if (!payout) return null
  const form = expensePayoutToForm(payout)
  const isScheduled = payout.status === 'Scheduled'

  return (
    <Modal
      isOpen={open}
      onClose={() => !acting && onClose?.()}
      title={payout.employee}
      subtitle={`${payout.method} · ${payout.status} · ${formatExpenseAmount(payout.amount)}`}
      size="lg"
    >
      <div className="space-y-5">
        {payout.expenseNumber ? (
          <p className="text-sm text-gray-500">
            Claim <span className="font-medium text-gray-700">{payout.expenseNumber}</span>
            {payout.categoryLabel ? ` · ${payout.categoryLabel}` : ''}
          </p>
        ) : null}
        {payout.description ? <p className="text-sm text-gray-600">{payout.description}</p> : null}

        <ExpensePayoutForm form={form} readOnly />

        <div className="flex flex-wrap justify-end gap-2 border-t border-gray-200 pt-5">
          <Button variant="outline" onClick={onClose} disabled={acting}>
            Close
          </Button>
          {isScheduled ? (
            <Button
              variant="primary"
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={acting}
              onClick={() => onReimburse?.(payout)}
            >
              <CheckCircle className="h-4 w-4" aria-hidden />
              {acting ? 'Processing…' : 'Mark reimbursed'}
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  )
}
