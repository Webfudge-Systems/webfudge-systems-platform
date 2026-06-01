'use client'

import type { ReactNode } from 'react'
import { clsx } from 'clsx'

export type BooksDataColumn = {
  key: string
  title?: string
  label?: string
  width?: string
  className?: string
  headerClassName?: string
  render?: (value: unknown, row: Record<string, unknown>, rowIndex: number) => ReactNode
}

type BooksDataTableProps = {
  columns: BooksDataColumn[]
  data: Record<string, unknown>[]
  className?: string
  headerClassName?: string
  bodyClassName?: string
  rowClassName?: string
  getRowClassName?: (row: Record<string, unknown>, rowIndex: number) => string | undefined
  onRowClick?: (row: Record<string, unknown>, rowIndex: number) => void
  keyField?: string
  /** `embedded` = inside rounded Card (no outer border). `list` = full-width rows inside list Card. */
  layout?: 'embedded' | 'list'
}

const styles = {
  embedded: {
    container: 'overflow-x-auto bg-[var(--books-bg-card,#ffffff)]',
    table: 'min-w-full',
    header: 'bg-[var(--books-surface-muted,#f5f5f5)] border-b border-[color:var(--books-border,rgba(0,0,0,0.08))]',
    headerCell:
      'px-6 py-4 text-left text-xs font-bold text-[var(--books-text-secondary,#4b5563)] uppercase tracking-wide',
    body: 'divide-y divide-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-card,#ffffff)]',
    row: 'hover:bg-[var(--books-bg-elevated,#f9fafb)] transition-all duration-200 group',
    cell: 'px-6 py-4 text-sm text-[var(--books-text-primary,#111827)] group-hover:text-[var(--books-text-primary,#111827)]',
  },
  list: {
    container: 'overflow-x-auto min-w-full bg-[var(--books-bg-card,#ffffff)]',
    table: 'min-w-full',
    header: 'bg-[var(--books-surface-muted,#f5f5f5)] border-b border-[color:var(--books-border,rgba(0,0,0,0.08))]',
    headerCell:
      'px-6 py-4 text-left text-xs font-bold text-[var(--books-text-secondary,#4b5563)] uppercase tracking-wide',
    body: 'divide-y divide-[color:var(--books-border,rgba(0,0,0,0.08))] bg-[var(--books-bg-card,#ffffff)]',
    row: 'hover:bg-[var(--books-bg-elevated,#f9fafb)] transition-all duration-200 group',
    cell: 'px-6 py-4 text-sm text-[var(--books-text-primary,#111827)] group-hover:text-[var(--books-text-primary,#111827)]',
  },
} as const

export function BooksDataTable({
  columns,
  data,
  className,
  headerClassName,
  bodyClassName,
  rowClassName,
  getRowClassName,
  onRowClick,
  keyField = 'id',
  layout = 'list',
}: BooksDataTableProps) {
  const s = styles[layout]

  return (
    <div className={clsx(s.container, 'transition-shadow duration-300', className)}>
      <table className={s.table}>
        <thead className={clsx(s.header, headerClassName)}>
          <tr>
            {columns.map((column, index) => (
              <th
                key={column.key || String(index)}
                className={clsx(s.headerCell, column.headerClassName)}
                style={
                  column.width
                    ? {
                        width: column.width,
                        minWidth: column.width,
                        maxWidth: column.width,
                      }
                    : undefined
                }
              >
                {column.title || column.label || ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={clsx(s.body, bodyClassName)}>
          {data.map((row, rowIndex) => (
            <tr
              key={String(row[keyField] ?? row.id ?? rowIndex)}
              className={clsx(s.row, onRowClick && 'cursor-pointer', rowClassName, getRowClassName?.(row, rowIndex))}
              onClick={() => onRowClick?.(row, rowIndex)}
            >
              {columns.map((column, colIndex) => (
                <td
                  key={column.key || String(colIndex)}
                  className={clsx(s.cell, column.className)}
                  style={
                    column.width
                      ? {
                          width: column.width,
                          minWidth: column.width,
                          maxWidth: column.width,
                        }
                      : undefined
                  }
                >
                  {column.render
                    ? column.render(row[column.key], row, rowIndex)
                    : (row[column.key] as ReactNode)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
