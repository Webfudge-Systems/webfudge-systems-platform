// @ts-nocheck
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, KPICard, Table } from '@webfudge/ui'
import { booksApi } from '@/lib/api'
import type { Customer } from '@/lib/types'
import { Users, Wallet, Receipt } from 'lucide-react'
import { formatCurrency } from '@webfudge/utils'

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])

  useEffect(() => {
    booksApi.fetchCustomers().then((res) => setCustomers(res.data ?? [])).catch(() => setCustomers([]))
  }, [])

  const summary = useMemo(() => {
    const totalBilled = customers.reduce((sum, item) => sum + (item.lifetimeBilled ?? 0), 0)
    const outstanding = customers.reduce((sum, item) => sum + (item.receivables ?? 0), 0)
    return { totalBilled, outstanding }
  }, [customers])

  return (
    <div className="space-y-4 bg-white min-h-full">
      <h1 className="text-2xl font-semibold">All Customers</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard
          title="Total Customers"
          value={String(customers.length)}
          subtitle="Active customer records"
          icon={Users}
          colorScheme="orange"
          iconColorScheme="orange"
        />
        <KPICard
          title="Lifetime Billed"
          value={formatCurrency(summary.totalBilled)}
          subtitle="Total billed across customers"
          icon={Wallet}
          colorScheme="orange"
          iconColorScheme="orange"
        />
        <KPICard
          title="Outstanding"
          value={formatCurrency(summary.outstanding)}
          subtitle="Open receivables"
          icon={Receipt}
          colorScheme="orange"
          iconColorScheme="orange"
        />
      </div>
      <Card className="p-0 overflow-hidden">
        <Table
          variant="modernEmbedded"
          columns={[
            { key: 'name', title: 'Name' },
            { key: 'company', title: 'Company Name' },
            { key: 'email', title: 'Email' },
            { key: 'phone', title: 'Work Phone' },
            { key: 'receivables', title: 'Receivables', render: (v: number) => formatCurrency(v ?? 0) },
            { key: 'unusedCredits', title: 'Unused Credits', render: (v: number) => formatCurrency(v ?? 0) },
          ]}
          data={customers}
        />
      </Card>
    </div>
  )
}
