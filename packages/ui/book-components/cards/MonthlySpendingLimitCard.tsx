'use client'

import { useId } from 'react'
import { clsx } from 'clsx'
import { Card } from '@webfudge/ui'
import { Gauge } from 'lucide-react'

export type MonthlySpendingLimitCardProps = {
  title?: string
  /** Amount spent (same currency unit as labels) */
  spent: number
  /** Monthly limit */
  limit: number
  spentLabel: string
  limitLabel: string
  className?: string
}

/** Semicircle opens upward; geometry tuned for a smooth “speedometer” arc. */
const CX = 120
const CY = 112
const R = 86
const STROKE = 14

const SCALE_MARKS = [
  { pct: 0, label: '0' },
  { pct: 25, label: '25' },
  { pct: 50, label: '50' },
  { pct: 75, label: '75' },
  { pct: 100, label: '100' },
] as const

/** Upper semicircle from left to right (bulge upward). */
const ARC_D = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

function labelPosition(markPct: number) {
  const t = markPct / 100
  const theta = Math.PI * (1 - t)
  const lr = R + 16
  return {
    x: CX + lr * Math.cos(theta),
    y: CY - lr * Math.sin(theta),
    anchor: (markPct <= 8 ? 'end' : markPct >= 92 ? 'start' : 'middle') as 'start' | 'middle' | 'end',
  }
}

export function MonthlySpendingLimitCard({
  title = 'Monthly Spending Limit',
  spent,
  limit,
  spentLabel,
  limitLabel,
  className,
}: MonthlySpendingLimitCardProps) {
  const uid = useId().replace(/:/g, '')
  const pctRaw = limit > 0 ? (spent / limit) * 100 : 0
  const pct = Math.min(100, Math.max(0, pctRaw))
  const overBudget = limit > 0 && spent > limit
  const arcLength = Math.PI * R
  const dashOffset = arcLength * (1 - pct / 100)

  return (
    <Card
      variant="elevated"
      padding={false}
      className={clsx(
        'relative flex min-h-0 flex-col overflow-hidden rounded-2xl !bg-[var(--books-bg-card,#ffffff)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]',
        className
      )}
    >
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-6 pb-6 pt-6 md:px-7 md:pb-7 md:pt-7">
        <div className="shrink-0">
          <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--books-orange-bg,rgba(234,88,12,0.1))] text-[var(--books-orange-text,#ea580c)]">
            <Gauge className="h-4 w-4" aria-hidden />
          </div>
          <h2 className="text-base font-semibold tracking-tight text-[var(--books-text-primary,#1a1a1a)]">{title}</h2>
          <p className="mt-1 text-[13px] font-medium text-[var(--books-text-secondary,#6b7280)]">
            Track spend against your monthly cap
          </p>
        </div>

        <div className="relative mt-2 flex min-h-0 flex-1 flex-col items-center">
        <svg
          viewBox="0 0 240 138"
          className="mx-auto w-full max-w-[304px] overflow-visible"
          aria-hidden
          role="presentation"
        >
          <defs>
            <linearGradient id={`msl-grad-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="52%" stopColor="#f97316" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* Track */}
          <path
            d={ARC_D}
            fill="none"
            stroke="var(--books-border,rgba(148,163,184,0.35))"
            strokeWidth={STROKE}
            strokeLinecap="round"
          />

          {/* Progress */}
          <path
            d={ARC_D}
            fill="none"
            stroke={overBudget ? '#ef4444' : `url(#msl-grad-${uid})`}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={dashOffset}
            className="drop-shadow-[0_2px_6px_rgba(249,115,22,0.35)] transition-[stroke-dashoffset] duration-700 ease-out"
          />

          {SCALE_MARKS.map(({ pct: markPct, label }) => {
            const p = labelPosition(markPct)
            return (
              <text
                key={markPct}
                x={p.x}
                y={p.y}
                textAnchor={p.anchor}
                dominantBaseline="middle"
                fill="var(--books-text-tertiary, #9ca3af)"
                style={{ fontSize: '11px', fontWeight: 600 }}
              >
                {label}
              </text>
            )
          })}
        </svg>

        <div
          className="pointer-events-none absolute inset-x-0 bottom-3 flex flex-col items-center justify-end text-center"
          style={{ top: '46%' }}
        >
          <p className="text-[2.1rem] leading-none font-bold tracking-tight text-[var(--books-text-primary,#1a1a1a)] sm:text-[2.35rem]">
            {spentLabel}
          </p>
          <p className="mt-1 text-sm text-[var(--books-text-secondary,#6b7280)]">
            spent out of{' '}
            <span className="font-bold text-[var(--books-text-primary,#374151)]">{limitLabel}</span>
          </p>
          {overBudget ? (
            <p className="mt-2 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
              Over monthly limit
            </p>
          ) : limit > 0 ? (
            <p className="mt-2 rounded-full bg-[color:var(--books-orange-bg,rgba(234,88,12,0.1))] px-2.5 py-1 text-xs font-semibold text-[var(--books-text-secondary,#6b7280)]">
              {Math.round(pct)}% used
            </p>
          ) : (
            <p className="mt-2 text-xs font-medium text-[var(--books-text-secondary,#6b7280)]">
              Set a limit to track usage
            </p>
          )}
        </div>
        </div>

        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-[var(--books-bg-elevated,#f8fafc)] px-3 py-2 text-xs">
          <span className="text-[var(--books-text-secondary,#6b7280)]">
            Spent: <span className="font-semibold text-[var(--books-text-primary,#111827)]">{spentLabel}</span>
          </span>
          <span className="text-[var(--books-text-secondary,#6b7280)]">
            Limit: <span className="font-semibold text-[var(--books-text-primary,#111827)]">{limitLabel}</span>
          </span>
        </div>
      </div>
    </Card>
  )
}
