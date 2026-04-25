'use client'

import type { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@webfudge/ui'

export type BooksKPICardProps = {
  title: string
  value: number | string
  subtitle?: string
  icon?: LucideIcon
  className?: string
  onClick?: () => void
}

/**
 * KPI tile aligned with Books dashboard metrics: `--books-bg-card` surface, light text in dark mode.
 */
export function BooksKPICard({ title, value, subtitle, icon: Icon, className, onClick }: BooksKPICardProps) {
  return (
    <Card
      variant="elevated"
      className={clsx(
        'relative overflow-hidden p-6 pb-0 pr-0 !bg-[var(--books-bg-card,#ffffff)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]',
        onClick &&
          'cursor-pointer hover:shadow-[0_6px_26px_rgba(15,23,42,0.13),0_3px_8px_rgba(15,23,42,0.07)] transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1 pr-2">
          <p className="mb-2 text-sm font-medium text-[var(--books-text-secondary,#6b7280)]">{title}</p>
          <p className="text-4xl font-bold tracking-tight text-[var(--books-text-primary,#111827)]">{value}</p>
          {subtitle ? (
            <div className="mt-2 flex items-center gap-1.5 text-sm text-[var(--books-text-secondary,#6b7280)]">
              <span className="h-2 w-2 rounded-full bg-[var(--books-orange-text,#ea580c)]" aria-hidden />
              <span>{subtitle}</span>
            </div>
          ) : null}
        </div>
        {Icon ? (
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-2xl rounded-bl-none rounded-tr-none bg-[var(--books-orange-bg,rgba(234,88,12,0.1))]">
            <Icon className="absolute -bottom-7 -right-7 h-full w-full text-[var(--books-orange-text,#ea580c)]" aria-hidden />
          </div>
        ) : null}
      </div>
    </Card>
  )
}
