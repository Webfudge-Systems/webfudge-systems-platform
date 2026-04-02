'use client'

import { Card } from '@webfudge/ui'
import { BarChart3, FileText, Receipt, Wallet } from 'lucide-react'
import BooksAccountantListShell from '../_components/BooksAccountantListShell'

export default function ChartOfAccountsPage() {
  return (
    <BooksAccountantListShell
      kpis={[
        { title: 'All Accounts', value: 0, subtitle: 'No accounts', icon: BarChart3, colorScheme: 'orange' },
        { title: 'Assets', value: 0, subtitle: '₹0', icon: Wallet, colorScheme: 'orange' },
        { title: 'Liabilities', value: 0, subtitle: '₹0', icon: Receipt, colorScheme: 'orange' },
        { title: 'Income', value: 0, subtitle: '₹0', icon: FileText, colorScheme: 'orange' },
      ]}
      tabs={[
        { key: 'all', label: 'All', count: 0 },
        { key: 'assets', label: 'Assets', count: 0 },
        { key: 'liabilities', label: 'Liabilities', count: 0 },
        { key: 'income', label: 'Income', count: 0 },
        { key: 'expense', label: 'Expense', count: 0 },
      ]}
      activeTab="all"
      onTabChange={() => {}}
      topBlocks={
        <>
          <Card variant="elevated" padding={false} className="p-5">
            <h3 className="text-base font-semibold text-gray-900">Balances by Type</h3>
            <p className="text-sm text-gray-600 mt-1">Chart will appear here when connected to backend</p>
            <div className="mt-4 h-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
              0 data
            </div>
          </Card>
          <Card variant="elevated" padding={false} className="p-5">
            <h3 className="text-base font-semibold text-gray-900">Top Accounts</h3>
            <p className="text-sm text-gray-600 mt-1">Chart will appear here when connected to backend</p>
            <div className="mt-4 h-44 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-sm text-gray-500">
              0 data
            </div>
          </Card>
        </>
      }
      columns={[
        { key: 'code', label: 'CODE' },
        { key: 'name', label: 'ACCOUNT NAME' },
        { key: 'type', label: 'TYPE' },
        { key: 'balance', label: 'BALANCE' },
        { key: 'updatedAt', label: 'UPDATED' },
      ]}
      data={[]}
      emptyIcon={BarChart3}
      emptyTitle="No accounts found"
      emptyDescription="Accounts will appear here when connected to backend"
      addHref="/accountant/chart-of-accounts/new"
      addLabel="Add Account"
    />
  )
}
