'use client'

import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Filter, MoreHorizontal, Search } from 'lucide-react'
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { Button, Card, Input, TableRowActionMenuPortal, workspaceSearchInputClassName } from '@webfudge/ui'

export type ActivityStatus = 'completed' | 'pending' | 'in_progress'

export type ActivityTableRow = {
  id: string
  orderId: string
  activityLabel: string
  Icon: LucideIcon
  priceLabel: string
  status: ActivityStatus
  dateLabel: string
  /** Customer / account name for the activity */
  customerLabel: string
  /** Invoice or document due date */
  dueDateLabel: string
  /** Outstanding balance or settled label */
  balanceLabel: string
}

export type RecentActivitiesTableProps = {
  title?: string
  rows: ActivityTableRow[]
  searchPlaceholder?: string
  onFilterClick?: () => void
  onViewActivity?: (row: ActivityTableRow) => void
  onEditActivity?: (row: ActivityTableRow) => void
  onDeleteActivity?: (row: ActivityTableRow) => void
  className?: string
}

type RowMenuAnchor = {
  rowId: string
  top: number
  left: number
  triggerEl: HTMLElement
}

const STATUS_STYLES: Record<
  ActivityStatus,
  { dot: string; text: string; label: string }
> = {
  completed: { dot: 'bg-emerald-500', text: 'text-emerald-700', label: 'Completed' },
  pending: { dot: 'bg-red-500', text: 'text-red-600', label: 'Pending' },
  in_progress: { dot: 'bg-amber-400', text: 'text-amber-700', label: 'In Progress' },
}

export function RecentActivitiesTable({
  title = 'Recent Activities',
  rows,
  searchPlaceholder = 'Search...',
  onFilterClick,
  onViewActivity,
  onEditActivity,
  onDeleteActivity,
  className,
}: RecentActivitiesTableProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [rowMenuAnchor, setRowMenuAnchor] = useState<RowMenuAnchor | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((r) => {
      const hay = [
        r.orderId,
        r.activityLabel,
        r.customerLabel,
        r.dueDateLabel,
        r.balanceLabel,
        r.priceLabel,
        r.dateLabel,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [query, rows])

  const toggle = (id: string) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const closeRowMenu = () => setRowMenuAnchor(null)

  const booksSearchInputClassName =
    'border border-[color:var(--books-input-border,rgba(0,0,0,0.1))] bg-[var(--books-input-bg,#ffffff)] text-[var(--books-input-text,#111827)] placeholder:text-[var(--books-input-placeholder,#6b7280)]'

  return (
    <Card
      variant="elevated"
      padding={false}
      className={clsx(
        'flex min-h-0 flex-col overflow-hidden !bg-[var(--books-bg-card,#ffffff)] dark:shadow-[0_4px_28px_rgba(0,0,0,0.55),0_2px_10px_rgba(0,0,0,0.38)]',
        className
      )}
    >
      <div className="flex shrink-0 flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:px-7 md:pt-7">
        <h2 className="text-base font-semibold tracking-tight text-[var(--books-text-primary,#1a1a1a)]">{title}</h2>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Input
            icon={Search}
            type="search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
            containerClassName="w-full min-w-0 sm:min-w-[16rem] sm:w-64"
            className={twMerge(
              workspaceSearchInputClassName,
              booksSearchInputClassName,
              'w-full min-w-0 sm:min-w-[16rem] sm:w-64'
            )}
          />
          <Button
            type="button"
            variant="muted"
            size="sm"
            rounded="pill"
            className="shrink-0 border border-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-elevated,#f9fafb)] px-4 font-semibold text-[var(--books-text-secondary,#374151)] hover:border-[#FF6B35]/35 hover:bg-[var(--books-orange-bg,rgba(234,88,12,0.1))]"
            onClick={onFilterClick}
          >
            <Filter className="mr-2 h-4 w-4 text-[var(--books-text-secondary,#6b7280)]" aria-hidden />
            Filter
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 md:px-7 md:pb-7">
        {filtered.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-10">
            <p className="text-center text-sm text-[var(--books-text-secondary,#6b7280)]">
              No activities match your search.
            </p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] divide-y divide-[color:var(--books-border,rgba(0,0,0,0.08))]">
                <thead>
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--books-text-secondary,#6b7280)]">
                    <th className="w-12 px-4 py-3.5" scope="col" />
                    <th className="px-4 py-3.5" scope="col">
                      Order ID
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Customer
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Activity
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Total
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Balance
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Due
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Status
                    </th>
                    <th className="px-4 py-3.5" scope="col">
                      Date
                    </th>
                    <th className="w-12 px-2 py-3.5" scope="col" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-card,#ffffff)]">
                  {filtered.map((row) => {
                    const st = STATUS_STYLES[row.status]
                    const RowIcon = row.Icon
                    const isSel = !!selected[row.id]
                    return (
                      <tr
                        key={row.id}
                        className={clsx(
                          'transition-colors duration-200 hover:bg-[var(--books-bg-elevated,#f9fafb)]',
                          isSel && 'bg-[var(--books-orange-bg,rgba(234,88,12,0.1))]'
                        )}
                      >
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggle(row.id)}
                            className="h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                            aria-label={`Select ${row.orderId}`}
                          />
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-[var(--books-text-primary,#111827)]">
                          {row.orderId}
                        </td>
                        <td className="max-w-[140px] px-4 py-4 text-sm text-[var(--books-text-primary,#1f2937)]">
                          <span className="line-clamp-2 font-medium">{row.customerLabel}</span>
                        </td>
                        <td className="max-w-[200px] px-4 py-4">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--books-bg-elevated,#f3f4f6)] text-[var(--books-text-secondary,#4b5563)]">
                              <RowIcon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="truncate text-sm font-medium text-[var(--books-text-primary,#1f2937)]">
                              {row.activityLabel}
                            </span>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-bold text-[var(--books-text-primary,#111827)]">
                          {row.priceLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-[var(--books-text-primary,#1f2937)]">
                          {row.balanceLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-[var(--books-text-secondary,#4b5563)]">
                          {row.dueDateLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4">
                          <span className={clsx('inline-flex items-center gap-1.5 text-xs font-semibold', st.text)}>
                            <span className={clsx('h-2 w-2 rounded-full', st.dot)} aria-hidden />
                            {st.label}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm text-[var(--books-text-secondary,#4b5563)]">
                          {row.dateLabel}
                        </td>
                        <td className="px-2 py-4 text-center">
                          <button
                            type="button"
                            className="rounded-lg p-2 text-[var(--books-text-tertiary,#9ca3af)] transition-colors hover:bg-[var(--books-bg-elevated,#f3f4f6)] hover:text-[var(--books-text-primary,#374151)]"
                            aria-label="Row actions"
                            aria-haspopup="menu"
                            aria-expanded={rowMenuAnchor?.rowId === row.id}
                            onClick={(e) => {
                              const el = e.currentTarget
                              const r = el.getBoundingClientRect()
                              setRowMenuAnchor((prev) =>
                                prev?.rowId === row.id
                                  ? null
                                  : { rowId: row.id, top: r.bottom + 4, left: r.left, triggerEl: el }
                              )
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {rowMenuAnchor ? (
        <TableRowActionMenuPortal
          open
          anchor={{
            top: rowMenuAnchor.top,
            left: rowMenuAnchor.left,
            triggerEl: rowMenuAnchor.triggerEl,
          }}
          onClose={closeRowMenu}
          menuClassName="w-44 py-1"
          menuWidthPx={176}
        >
          {(() => {
            const target = filtered.find((r) => r.id === rowMenuAnchor.rowId)
            if (!target) return null
            return (
              <>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-orange-50/90 hover:text-gray-900"
                  onClick={() => {
                    onViewActivity?.(target)
                    closeRowMenu()
                  }}
                >
                  View details
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-orange-50/90 hover:text-gray-900"
                  onClick={() => {
                    onEditActivity?.(target)
                    closeRowMenu()
                  }}
                >
                  Edit activity
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50/90"
                  onClick={() => {
                    onDeleteActivity?.(target)
                    closeRowMenu()
                  }}
                >
                  Delete
                </button>
              </>
            )
          })()}
        </TableRowActionMenuPortal>
      ) : null}
    </Card>
  )
}
