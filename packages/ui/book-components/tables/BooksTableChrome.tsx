'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@webfudge/ui'

/** Rounded elevated shell for list tables (matches dashboard card surface). */
export function BooksListTableCard({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card
      variant="elevated"
      padding={false}
      className={clsx(
        'overflow-hidden rounded-xl border border-[color:var(--books-border,rgba(0,0,0,0.08))] !bg-[var(--books-bg-card,#ffffff)] p-0 shadow-[0_3px_16px_rgba(15,23,42,0.10),0_2px_5px_rgba(15,23,42,0.06)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]',
        className
      )}
    >
      {children}
    </Card>
  )
}

export function BooksTableResultsCount({ count, className }: { count: number; className?: string }) {
  return (
    <div className={clsx('text-sm text-[var(--books-text-secondary,#6b7280)]', className)}>
      Showing <span className="font-semibold text-[var(--books-text-primary,#111827)]">{count}</span> result
      {count !== 1 ? 's' : ''}
    </div>
  )
}

type BooksTableEmptyBelowProps = {
  icon?: LucideIcon
  title?: string
  description?: string
  action?: ReactNode
  className?: string
}

export function BooksTableEmptyBelow({ icon: Icon, title, description, action, className }: BooksTableEmptyBelowProps) {
  return (
    <div className={clsx('bg-transparent p-12 text-center', className)}>
      {Icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center text-[var(--books-text-tertiary,#9ca3af)]">
          <Icon className="h-10 w-10 opacity-90" strokeWidth={1.25} aria-hidden />
        </div>
      ) : null}
      {title ? (
        <h3 className="text-base font-semibold text-[var(--books-text-primary,#111827)]">{title}</h3>
      ) : null}
      {description ? (
        <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-[var(--books-text-secondary,#6b7280)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
