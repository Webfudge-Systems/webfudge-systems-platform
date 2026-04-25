'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Button, Modal, TabsWithActions } from '@webfudge/ui'
import {
  BooksDataTable,
  BooksKPICard,
  BooksListTableCard,
  BooksTableEmptyBelow,
  BooksTableResultsCount,
  booksToolbarSearchInputClassName,
} from '@webfudge/ui/book-components'
import { Plus } from 'lucide-react'
import { useBooksTableColumnPicker } from '@/app/_components/BooksTableColumnPicker'

type TabItem = { key: string; label: string; count: number }

type Props<T extends Record<string, any>> = {
  kpis: Array<{
    title: string
    value: number | string
    subtitle?: string
    icon: any
    colorScheme?: string
  }>

  tabs?: TabItem[]
  activeTab?: string
  onTabChange?: (tab: string) => void

  columns: any[]
  data: T[]
  keyField?: string
  onRowClickHref?: (row: T) => string

  emptyIcon: any
  emptyTitle: string
  emptyDescription: string
  addHref?: string
  addLabel?: string

  /** Optional extra blocks (charts/cards) below KPIs, above the bar. */
  topBlocks?: ReactNode
}

export default function BooksAccountantListShell<T extends Record<string, any>>({
  kpis,
  tabs,
  activeTab,
  onTabChange,
  columns,
  data,
  keyField = 'id',
  onRowClickHref,
  emptyIcon: EmptyIcon,
  emptyTitle,
  emptyDescription,
  addHref,
  addLabel = 'Add',
  topBlocks,
}: Props<T>) {
  const router = useRouter()
  const pathname = usePathname()
  const columnStorageKey = `books.table:${pathname}`

  const [searchQuery, setSearchQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)

  const { visibleColumns, toolbarRef, onColumnVisibilityClick, columnPickerDropdown } = useBooksTableColumnPicker({
    columns: columns as { key: string; label?: string; title?: string }[],
    storageKey: columnStorageKey,
  })

  const resolvedTabs = useMemo(() => tabs ?? [{ key: 'all', label: 'All', count: data.length }], [data.length, tabs])
  const resolvedActiveTab = activeTab ?? resolvedTabs[0]?.key ?? 'all'

  const filtered = useMemo(() => {
    if (!searchQuery) return data
    const q = searchQuery.toLowerCase()
    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(q))
  }, [data, searchQuery])

  const exportCsv = () => {
    const colKeys = (visibleColumns || []).map((c: any) => c?.key).filter(Boolean)
    const safeKeys = colKeys.length ? colKeys : Object.keys(filtered[0] || {})

    const esc = (v: any) => {
      if (v == null) return ''
      const s = String(v)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }

    const header = safeKeys.join(',')
    const rows = filtered.map((row) => safeKeys.map((k) => esc((row as any)[k])).join(','))
    const csv = [header, ...rows].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `books-accountant-export.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-full space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi, idx) => (
          <BooksKPICard
            key={idx}
            title={kpi.title}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={kpi.icon}
          />
        ))}
      </div>

      {topBlocks ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">{topBlocks}</div> : null}

      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={resolvedTabs.map((t) => ({ key: t.key, label: t.label, badge: String(t.count) }))}
          activeTab={resolvedActiveTab}
          onTabChange={(t: string) => onTabChange?.(t)}
          showSearch={true}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search..."
          showAdd={true}
          onAddClick={addHref ? () => router.push(addHref) : () => {}}
          addTitle={addLabel}
          showFilter={true}
          onFilterClick={() => setFilterOpen(true)}
          showColumnVisibility={true}
          onColumnVisibilityClick={onColumnVisibilityClick}
          columnVisibilityTitle="Show or hide columns"
          showExport={true}
          onExportClick={exportCsv}
          exportTitle="Export"
          variant="booksModern"
          searchInputClassName={booksToolbarSearchInputClassName}
        />
        {columnPickerDropdown}
      </div>

      <BooksTableResultsCount count={filtered.length} />

      <BooksListTableCard>
        <BooksDataTable
          columns={(visibleColumns.length ? visibleColumns : columns) as any}
          data={filtered as Record<string, unknown>[]}
          keyField={keyField}
          layout="list"
          onRowClick={
            onRowClickHref
              ? (row) => {
                  const href = onRowClickHref(row as T)
                  if (href) router.push(href)
                }
              : undefined
          }
        />

        {filtered.length === 0 ? (
          <BooksTableEmptyBelow
            className="border-t border-[color:var(--books-border,rgba(0,0,0,0.08))]"
            icon={EmptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={
              addHref ? (
                <Button variant="primary" onClick={() => router.push(addHref)}>
                  <Plus className="mr-2 h-4 w-4" />
                  {addLabel}
                </Button>
              ) : null
            }
          />
        ) : null}
      </BooksListTableCard>

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filters" size="lg">
        <div className="space-y-4">
          <p className="text-sm text-[var(--books-text-secondary,#6b7280)]">
            Filter UI is being aligned with CRM. This modal confirms the filter action is working.
          </p>
          <div className="flex justify-end gap-2 border-t border-[color:var(--books-border)] pt-4">
            <Button variant="muted" onClick={() => setFilterOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

