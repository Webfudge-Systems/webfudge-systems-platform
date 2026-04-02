'use client'

import { Card } from '@webfudge/ui'
import { BookOpen, FileText, TrendingUp, Users } from 'lucide-react'
import BooksAccountantListShell from '../_components/BooksAccountantListShell'

export default function ManualJournalsPage() {
  return (
    <BooksAccountantListShell
      kpis={[
        { title: 'All Journals', value: 0, subtitle: 'No entries', icon: BookOpen, colorScheme: 'orange' },
        { title: 'Draft', value: 0, subtitle: 'No drafts', icon: FileText, colorScheme: 'orange' },
        { title: 'Posted', value: 0, subtitle: 'No posted', icon: TrendingUp, colorScheme: 'orange' },
        { title: 'Users', value: 0, subtitle: 'No activity', icon: Users, colorScheme: 'orange' },
      ]}
      tabs={[
        { key: 'all', label: 'All Journals', count: 0 },
        { key: 'draft', label: 'Draft', count: 0 },
        { key: 'posted', label: 'Posted', count: 0 },
      ]}
      activeTab="all"
      onTabChange={() => {}}
      topBlocks={
        <>
          <Card variant="elevated" padding={false} className="p-5">
            <h3 className="text-base font-semibold text-gray-900">Posting Trend</h3>
            <p className="text-sm text-gray-600 mt-1">Chart will appear here when connected to backend</p>
            <div className="mt-4 h-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
              0 data
            </div>
          </Card>
          <Card variant="elevated" padding={false} className="p-5">
            <h3 className="text-base font-semibold text-gray-900">Entries by Type</h3>
            <p className="text-sm text-gray-600 mt-1">Chart will appear here when connected to backend</p>
            <div className="mt-4 h-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
              0 data
            </div>
          </Card>
        </>
      }
      columns={[
        { key: 'date', label: 'DATE' },
        { key: 'journalNumber', label: 'JOURNAL#' },
        { key: 'referenceNumber', label: 'REFERENCE' },
        { key: 'status', label: 'STATUS' },
        { key: 'notes', label: 'NOTES' },
      ]}
      data={[]}
      emptyIcon={BookOpen}
      emptyTitle="No manual journals found"
      emptyDescription="Manual journals will appear here when created"
      addHref="/accountant/manual-journals/new"
      addLabel="Add Manual Journal"
    />
  )
}
