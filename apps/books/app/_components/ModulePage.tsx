// @ts-nocheck
'use client'

import { Card } from '@webfudge/ui'
import { BooksDataTable } from '@webfudge/ui/book-components'

type ModulePageProps = {
  /** Shown only when you need an in-page title (layout Topbar usually covers this). */
  showTitle?: boolean
  title: string
  subtitle?: string
  columns?: Array<{ key: string; title: string }>
  data?: Array<Record<string, string | number>>
}

export default function ModulePage({
  showTitle = false,
  title,
  subtitle,
  columns,
  data,
}: ModulePageProps) {
  const defaultColumns = columns ?? [
    { key: 'name', title: 'Name' },
    { key: 'status', title: 'Status' },
    { key: 'updatedAt', title: 'Updated' },
  ]

  const defaultData = data ?? [
    { id: 1, name: `${title} Record`, status: 'Active', updatedAt: 'Today' },
    { id: 2, name: `${title} Draft`, status: 'Draft', updatedAt: 'Yesterday' },
  ]

  return (
    <div className="min-h-full space-y-6">
      {showTitle ? (
        <div>
          <h1 className="text-2xl font-semibold text-[var(--books-text-on-page,var(--books-text-primary))]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-[var(--books-text-on-page-muted,var(--books-text-secondary))] opacity-90">
              {subtitle}
            </p>
          ) : null}
        </div>
      ) : null}

      {/*
        Avoid a full-bleed bg-white wrapper: it reads as a sharp rectangle on dark page bg.
        Rounding + surface come from Card; `modernEmbedded` Table is borderless inside the shell.
      */}
      <Card variant="elevated" padding={false} className="overflow-hidden rounded-xl !bg-[var(--books-bg-card,#ffffff)]">
        <BooksDataTable
          layout="embedded"
          columns={defaultColumns}
          data={defaultData as Record<string, unknown>[]}
        />
      </Card>
    </div>
  )
}
