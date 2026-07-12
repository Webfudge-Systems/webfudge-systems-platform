'use client'

import { RefreshCcw } from 'lucide-react'
import { Button } from '@webfudge/ui'

function formatEmployeeCount(count) {
  const n = Number(count || 0)
  return n === 1 ? '1 employee' : `${n} employees`
}

function formatGrossLakhs(gross) {
  return `₹${(Number(gross || 0) / 100000).toFixed(2)}L`
}

function getStepState(index, currentStep) {
  if (currentStep >= 3) return 'completed'
  if (index < currentStep) return 'completed'
  if (index === currentStep) return 'active'
  return 'upcoming'
}

const stepStyles = {
  completed: 'border border-orange-200 bg-orange-50 text-orange-700',
  active: 'border border-orange-300 bg-orange-100 text-orange-800 shadow-sm',
  upcoming: 'border border-gray-200 bg-gray-50 text-gray-500',
}

export default function PayrollRunBanner({ run, onReview, onLock, onDisburse, onRecalculate }) {
  if (!run) return null

  const status = String(run.status || 'draft').toLowerCase()
  const canReview = status === 'draft'
  const canLock = status === 'review'
  const canDisburse = status === 'locked'
  const canRecalculate = status === 'draft'
  const currentStep = Number(run.currentStep ?? 0)

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900 sm:text-lg">
              {run.month} Payroll — {formatGrossLakhs(run.gross)} gross · {formatEmployeeCount(run.employees)}
            </h2>
            <p className="mt-1 text-sm font-medium capitalize text-orange-600">Status: {run.status}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2" aria-label="Payroll workflow steps">
            {run.steps.map((step, index) => {
              const state = getStepState(index, currentStep)
              return (
                <span
                  key={step}
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${stepStyles[state]}`}
                >
                  {step}
                </span>
              )
            })}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
          {onRecalculate ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 bg-white"
              onClick={onRecalculate}
              disabled={!canRecalculate}
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
              Recalculate
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={onReview} disabled={!canReview}>
            Review
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white disabled:border-orange-200 disabled:text-orange-300"
            onClick={onLock}
            disabled={!canLock}
          >
            Lock
          </Button>
          <Button variant="primary" size="sm" onClick={onDisburse} disabled={!canDisburse}>
            Disburse
          </Button>
        </div>
      </div>
    </section>
  )
}
