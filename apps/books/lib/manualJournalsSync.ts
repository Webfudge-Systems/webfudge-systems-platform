import { journalsApi } from '@/lib/api'
import type { AccountantJournalRow } from '@/lib/mock-data/accountant/seeds'

type ApiJournal = {
  id: number
  journalNumber?: string
  journalDate?: string
  referenceNumber?: string
  status?: string
  notes?: string
  sourceType?: string
  sourceId?: string
  createdAt?: string
  updatedAt?: string
}

function normalizeStatus(status = '') {
  const raw = String(status).toLowerCase()
  if (raw === 'published') return 'Published'
  if (raw === 'draft') return 'Draft'
  return status || 'Draft'
}

export function mapManualJournalFromApi(row: ApiJournal): AccountantJournalRow {
  const notes = row.notes || ''
  const autoNote =
    row.sourceType && row.sourceType !== 'manual'
      ? `${notes}${notes ? ' · ' : ''}Auto: ${row.sourceType}${row.sourceId ? ` #${row.sourceId}` : ''}`
      : notes

  return {
    id: row.id,
    date: row.journalDate || '',
    journalNumber: row.journalNumber || `JRN-${row.id}`,
    referenceNumber: row.referenceNumber || '—',
    status: normalizeStatus(row.status),
    notes: autoNote || '—',
    createdAt: row.createdAt || row.journalDate || '',
    updatedAt: row.updatedAt,
  }
}

export async function listManualJournals(params: Record<string, string | number | boolean | undefined> = {}) {
  const response = await journalsApi.list({ limit: 200, sort: 'createdAt:desc', ...params })
  const rows = Array.isArray((response as { data?: ApiJournal[] })?.data)
    ? (response as { data: ApiJournal[] }).data
    : Array.isArray(response)
      ? (response as ApiJournal[])
      : []
  return rows.map(mapManualJournalFromApi)
}

export async function deleteManualJournal(id: number | string) {
  await journalsApi.delete(id)
}
