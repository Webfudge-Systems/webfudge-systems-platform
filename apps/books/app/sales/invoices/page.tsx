'use client'

import { useEffect, useState } from 'react'
import { Badge, Button, Card, Select, Table } from '@webfudge/ui'
import { booksApi } from '@/lib/api'
import type { Invoice } from '@/lib/types'

type InvoiceRow = {
  id: number
  date: string
  number: string
  customer: string
  status: string
  dueDate: string
  amount: string
  balance: string
}

const statusVariant: Record<string, 'gray' | 'primary' | 'info' | 'warning' | 'success' | 'danger'> = {
  Draft: 'gray',
  Sent: 'primary',
  Viewed: 'info',
  Partial: 'warning',
  Paid: 'success',
  Overdue: 'danger',
  Void: 'gray',
}

const fallbackRows: InvoiceRow[] = [
  { id: 1, date: '2026-03-01', number: 'INV-1001', customer: 'Acme Studio', status: 'Sent', dueDate: '2026-03-14', amount: '$8,500', balance: '$8,500' },
  { id: 2, date: '2026-03-07', number: 'INV-1002', customer: 'Northline', status: 'Partial', dueDate: '2026-03-20', amount: '$12,200', balance: '$2,200' },
  { id: 3, date: '2026-02-22', number: 'INV-0999', customer: 'Orbit Labs', status: 'Overdue', dueDate: '2026-03-01', amount: '$6,000', balance: '$6,000' },
]

export default function InvoicesPage() {
  const [rows, setRows] = useState<Invoice[]>([])

  useEffect(() => {
    booksApi.fetchInvoices().then((res) => setRows(res.data ?? [])).catch(() => setRows([]))
  }, [])

  const tableData: InvoiceRow[] = rows.length
    ? rows.map((item) => ({
        id: item.id,
        date: item.date,
        number: item.number,
        customer: String(item.customerId),
        status: item.status,
        dueDate: item.dueDate,
        amount: `$${item.total.toFixed(2)}`,
        balance: `$${(item.balanceDue ?? item.total).toFixed(2)}`,
      }))
    : fallbackRows

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoices</h1>
        <div className="flex gap-2">
          <Button>+ New</Button>
          <Button variant="secondary">Import</Button>
          <Button variant="secondary">Export</Button>
          <Button variant="secondary">Print</Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Select options={[{ value: '', label: 'Status' }, { value: 'draft', label: 'Draft' }, { value: 'paid', label: 'Paid' }]} />
        <Select options={[{ value: '', label: 'Date Range' }, { value: '30', label: 'Last 30 Days' }, { value: '90', label: 'Last 90 Days' }]} />
        <Select options={[{ value: '', label: 'Customer' }, { value: 'acme', label: 'Acme Studio' }]} />
      </div>
      <Card className="p-0 overflow-hidden">
        <Table
          variant="modernEmbedded"
          columns={[
            { key: 'date', title: 'Date' },
            { key: 'number', title: 'Invoice#' },
            { key: 'customer', title: 'Customer Name' },
            { key: 'status', title: 'Status', render: (value: string) => <Badge variant={statusVariant[value]}>{value}</Badge> },
            { key: 'dueDate', title: 'Due Date' },
            { key: 'amount', title: 'Amount' },
            { key: 'balance', title: 'Balance Due' },
          ]}
          data={tableData}
        />
      </Card>
    </div>
  )
}
