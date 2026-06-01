'use client'

import type { LucideIcon } from 'lucide-react'
import { Loader2, Target } from 'lucide-react'
import { clsx } from 'clsx'
import { Card } from '@webfudge/ui'

export type BooksQuickAccessShortcut = {
  id: string
  title: string
  count: number
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
}

export type BooksQuickAccessCardProps = {
  title?: string
  subtitle?: string
  shortcuts: BooksQuickAccessShortcut[]
  loading?: boolean
  className?: string
}

/** Tile button — matches CRM `QuickActionsWidget` Quick Access grid exactly. */
const shortcutButtonClass =
  'rounded-2xl bg-gradient-to-br from-white/70 to-white/40 backdrop-blur-xl border border-white/30 shadow-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group dark:border-white/10 dark:from-[var(--books-bg-elevated,#252830)]/90 dark:to-[var(--books-bg-card,#1e2128)]/55'

/**
 * CRM Quick Access UI for Books home (`QuickActionsWidget` grid parity).
 * Outer card uses Books surface tokens; inner tiles reuse CRM glass styling.
 */
export function BooksQuickAccessCard({
  title = 'Quick Access',
  subtitle = 'Navigate to key sections',
  shortcuts,
  loading = false,
  className,
}: BooksQuickAccessCardProps) {
  const display = shortcuts.slice(0, 4)

  return (
    <Card
      className={clsx(
        'flex min-h-0 flex-col p-6 shadow-lg !bg-[var(--books-bg-card,#ffffff)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]',
        className
      )}
    >
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-[var(--books-text-primary,#f0f0f0)]">
            {title}
          </h2>
          <p className="text-sm text-gray-600 dark:text-[var(--books-text-secondary,#9ca3af)]">{subtitle}</p>
        </div>
        <Target className="h-6 w-6 text-gray-400 dark:text-[var(--books-text-tertiary,#6b7280)]" aria-hidden />
      </div>

      <div className="min-h-0 flex-1">
        <div className="grid h-full grid-cols-2 gap-4">
          {display.map((shortcut) => {
            const IconComponent = shortcut.icon
            return (
              <button
                key={shortcut.id}
                type="button"
                onClick={() => {
                  if (shortcut.disabled) return
                  shortcut.onClick()
                }}
                disabled={shortcut.disabled}
                className={clsx(
                  shortcutButtonClass,
                  shortcut.disabled && 'cursor-not-allowed opacity-60 hover:scale-100 hover:shadow-xl'
                )}
              >
                <div className="flex flex-col items-center space-y-2 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 shadow-lg backdrop-blur-md dark:border-orange-500/35 dark:bg-[var(--books-orange-bg,rgba(234,88,12,0.15))]">
                    <IconComponent className="h-6 w-6 text-orange-600 dark:text-[var(--books-orange-text,#fb923c)]" aria-hidden />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-[var(--books-text-secondary,#9ca3af)]">
                      {shortcut.title}
                    </p>
                    {loading ? (
                      <div className="mt-1 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin text-orange-500" aria-hidden />
                      </div>
                    ) : (
                      <>
                        <p className="mt-1 text-2xl font-black text-gray-800 dark:text-[var(--books-text-primary,#f0f0f0)]">
                          {shortcut.count.toLocaleString()}
                        </p>
                        <div className="mt-1 flex items-center justify-center text-xs text-gray-500 dark:text-[var(--books-text-secondary,#9ca3af)]">
                          <span className="mr-1 h-2 w-2 rounded-full bg-orange-500" aria-hidden />
                          Total items
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </Card>
  )
}
