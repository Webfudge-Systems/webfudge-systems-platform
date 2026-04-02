'use client'

import { Card } from '@webfudge/ui'
import { ClipboardList, FileText, Target, Users } from 'lucide-react'
import BooksAccountantListShell from '../_components/BooksAccountantListShell'

export default function BulkUpdatePage() {
  return (
    <BooksAccountantListShell
      kpis={[
        { title: 'All Jobs', value: 0, subtitle: 'No jobs', icon: ClipboardList, colorScheme: 'orange' },
        { title: 'Queued', value: 0, subtitle: 'No queued', icon: Target, colorScheme: 'orange' },
        { title: 'Completed', value: 0, subtitle: 'No completed', icon: FileText, colorScheme: 'orange' },
        { title: 'Users', value: 0, subtitle: 'No activity', icon: Users, colorScheme: 'orange' },
      ]}
      tabs={[
        { key: 'all', label: 'All', count: 0 },
        { key: 'queued', label: 'Queued', count: 0 },
        { key: 'completed', label: 'Completed', count: 0 },
      ]}
      activeTab="all"
      onTabChange={() => {}}
      topBlocks={
        <>
          <Card variant="elevated" padding={false} className="p-5">
            <h3 className="text-base font-semibold text-gray-900">Bulk Update Activity</h3>
            <p className="text-sm text-gray-600 mt-1">Chart will appear here when connected to backend</p>
            <div className="mt-4 h-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
              0 data
            </div>
          </Card>
          <Card variant="elevated" padding={false} className="p-5">
            <h3 className="text-base font-semibold text-gray-900">Most Updated Fields</h3>
            <p className="text-sm text-gray-600 mt-1">Chart will appear here when connected to backend</p>
            <div className="mt-4 h-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
              0 data
            </div>
          </Card>
        </>
      }
      columns={[
        { key: 'jobId', label: 'JOB ID' },
        { key: 'module', label: 'MODULE' },
        { key: 'status', label: 'STATUS' },
        { key: 'createdAt', label: 'CREATED' },
        { key: 'updatedAt', label: 'UPDATED' },
      ]}
      data={[]}
      emptyIcon={ClipboardList}
      emptyTitle="No bulk updates found"
      emptyDescription="Bulk update jobs will appear here when created"
      addHref="/accountant/bulk-update/new"
      addLabel="Add Bulk Update"
    />
  )
}
