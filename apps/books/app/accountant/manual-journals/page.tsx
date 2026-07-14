'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, FileText, TrendingUp, Users } from 'lucide-react'
import BooksListPageShell from '@/app/_components/BooksListPageShell'
import BooksDeleteItemModal from '@/app/_components/BooksDeleteItemModal'
import { useBooksAccountantJournalTableColumns } from '@/app/_components/booksAccountantTableColumns'
import BooksChartPlaceholderCard from '@/app/accountant/_components/BooksChartPlaceholderCard'
import type { AccountantJournalRow } from '@/lib/mock-data/accountant/seeds'
import { countStatusTab, matchesStatusTab, statusFilterOptions } from '@/lib/books/listHelpers'
import { deleteManualJournal, listManualJournals } from '@/lib/manualJournalsSync'

const BASE = '/accountant/manual-journals'
const STATUS_GROUPS = { draft: ['draft'], posted: ['published', 'posted'] }

export default function ManualJournalsPage() {
  const [manualJournals, setManualJournals] = useState<AccountantJournalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setLoadError('')
      const rows = await listManualJournals()
      setManualJournals(rows)
    } catch (err) {
      setManualJournals([])
      setLoadError(err instanceof Error ? err.message : 'Failed to load journals')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleRequestDelete = useCallback((row: AccountantJournalRow) => setDeleteId(row.id), [])
  const columns = useBooksAccountantJournalTableColumns({
    onRequestDelete: handleRequestDelete,
    deletingId,
    basePath: BASE,
  })

  const confirmDelete = useCallback(async () => {
    if (deleteId == null || deletingId) return
    try {
      setDeletingId(deleteId)
      await deleteManualJournal(deleteId)
      setDeleteId(null)
      await loadData()
    } finally {
      setDeletingId(null)
    }
  }, [deleteId, deletingId, loadData])

  const tabs = useMemo(
    () => [
      { key: 'all', label: 'All Journals', count: manualJournals.length },
      { key: 'draft', label: 'Draft', count: countStatusTab(manualJournals, 'draft', 'status', STATUS_GROUPS) },
      { key: 'posted', label: 'Posted', count: countStatusTab(manualJournals, 'posted', 'status', STATUS_GROUPS) },
    ],
    [manualJournals]
  )

  const autoJournalCount = useMemo(
    () => manualJournals.filter((row) => /auto:/i.test(row.notes || '')).length,
    [manualJournals],
  )

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-gray-500">
        Loading journals…
      </div>
    )
  }

  return (
    <>
      {loadError ? <p className="mb-4 text-sm text-red-600">{loadError}</p> : null}
      <BooksListPageShell
        title="Manual Journals"
        subtitle="Accounting controls, journals, and chart of accounts."
        kpis={[
          { title: 'All Journals', value: manualJournals.length, subtitle: `${manualJournals.length} entries`, icon: BookOpen },
          { title: 'Draft', value: countStatusTab(manualJournals, 'draft', 'status', STATUS_GROUPS), icon: FileText },
          { title: 'Posted', value: countStatusTab(manualJournals, 'posted', 'status', STATUS_GROUPS), icon: TrendingUp },
          { title: 'Auto-posted', value: autoJournalCount, subtitle: 'From expenses & payments', icon: Users },
        ]}
        tabs={tabs}
        tabFilter={(row, tab) => matchesStatusTab(row, tab, 'status', STATUS_GROUPS)}
        filterFields={[{ key: 'status', label: 'Status', options: statusFilterOptions(['Draft', 'Published']) }]}
        topBlocks={
          <>
            <BooksChartPlaceholderCard title="Posting Trend" />
            <BooksChartPlaceholderCard title="Entries by Type" />
          </>
        }
        columns={columns}
        data={manualJournals}
        onRowClickHref={(row) => `${BASE}/${row.id}`}
        emptyIcon={BookOpen}
        emptyTitle="No manual journals yet"
        emptyDescription="Journals from HR expense approvals and payouts will appear here when posted."
        addHref={`${BASE}/new`}
        addLabel="Add manual journal"
        searchPlaceholder="Search journals..."
        exportFilePrefix="books-manual-journals"
        sortEntity="manualJournal"
      />
      <BooksDeleteItemModal
        isOpen={deleteId != null}
        itemName={manualJournals.find((row) => row.id === deleteId)?.journalNumber}
        entityLabel="Manual Journal"
        deleting={deletingId != null}
        onClose={() => {
          if (deletingId) return
          setDeleteId(null)
        }}
        onConfirm={confirmDelete}
      />
    </>
  )
}
