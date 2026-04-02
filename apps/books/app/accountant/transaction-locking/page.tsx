'use client'

import { Card } from '@webfudge/ui'
import { Calendar, Lock, Shield, Users } from 'lucide-react'
import BooksAccountantListShell from '../_components/BooksAccountantListShell'

export default function TransactionLockingPage() {
  return (
    <BooksAccountantListShell
      kpis={[
        { title: 'Lock Rules', value: 0, subtitle: 'No rules', icon: Lock, colorScheme: 'orange' },
        { title: 'Locked Periods', value: 0, subtitle: 'None', icon: Calendar, colorScheme: 'orange' },
        { title: 'Overrides', value: 0, subtitle: 'None', icon: Shield, colorScheme: 'orange' },
        { title: 'Users', value: 0, subtitle: 'No activity', icon: Users, colorScheme: 'orange' },
      ]}
      tabs={[
        { key: 'all', label: 'All', count: 0 },
        { key: 'active', label: 'Active', count: 0 },
        { key: 'archived', label: 'Archived', count: 0 },
      ]}
      activeTab="all"
      onTabChange={() => {}}
      topBlocks={
        <>
          <Card variant="elevated" padding={false} className="p-5">
            <h3 className="text-base font-semibold text-gray-900">Locks Over Time</h3>
            <p className="text-sm text-gray-600 mt-1">Chart will appear here when connected to backend</p>
            <div className="mt-4 h-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
              0 data
            </div>
          </Card>
          <Card variant="elevated" padding={false} className="p-5">
            <h3 className="text-base font-semibold text-gray-900">Recent Changes</h3>
            <p className="text-sm text-gray-600 mt-1">Chart will appear here when connected to backend</p>
            <div className="mt-4 h-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
              0 data
            </div>
          </Card>
        </>
      }
      columns={[
        { key: 'name', label: 'RULE' },
        { key: 'period', label: 'PERIOD' },
        { key: 'status', label: 'STATUS' },
        { key: 'createdAt', label: 'CREATED' },
        { key: 'updatedAt', label: 'UPDATED' },
      ]}
      data={[]}
      emptyIcon={Lock}
      emptyTitle="No transaction locks found"
      emptyDescription="Lock rules will appear here when configured"
      addHref="/accountant/transaction-locking/new"
      addLabel="Add Transaction Lock"
    />
  )
}
