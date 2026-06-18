'use client'

import { Card, Button } from '@webfudge/ui'

export default function PayrollRunBanner({ run, onReview, onLock, onDisburse, onRecalculate }) {
  if (!run) return null
  const status = String(run.status || 'draft').toLowerCase()
  const canReview = status === 'draft'
  const canLock = status === 'review'
  const canDisburse = status === 'locked'
  const canRecalculate = status === 'draft'

  return (
    <Card variant="elevated" className="rounded-xl p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900">
            {run.month} Payroll — ₹{(run.gross / 100000).toFixed(2)}L gross · {run.employees} employees
          </p>
          <p className="mt-1 text-sm text-orange-600">Status: {run.status}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {run.steps.map((step, index) => (
              <span
                key={step}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  index <= run.currentStep
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {step}
              </span>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {onRecalculate ? (
            <Button variant="outline" size="sm" onClick={onRecalculate} disabled={!canRecalculate}>
              Recalculate
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={onReview} disabled={!canReview}>
            Review
          </Button>
          <Button variant="outline" size="sm" onClick={onLock} disabled={!canLock}>
            Lock
          </Button>
          <Button variant="primary" size="sm" onClick={onDisburse} disabled={!canDisburse}>
            Disburse
          </Button>
        </div>
      </div>
    </Card>
  )
}
