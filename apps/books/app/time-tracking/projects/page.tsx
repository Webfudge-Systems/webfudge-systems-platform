'use client'

import { useEffect, useState } from 'react'
import { Card, Table } from '@webfudge/ui'
import { booksApi } from '@/lib/api'
import type { Project } from '@/lib/types'
import { formatCurrency } from '@webfudge/utils'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])

  useEffect(() => {
    booksApi.fetchProjects().then((res) => setProjects(res.data ?? [])).catch(() => setProjects([]))
  }, [])

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Projects</h1>
      <Card className="p-0 overflow-hidden">
        <Table
          variant="modernEmbedded"
          columns={[
            { key: 'name', title: 'Project Name' },
            { key: 'customerId', title: 'Customer' },
            { key: 'billingMethod', title: 'Billing Method' },
            { key: 'totalLoggedHours', title: 'Total Logged Hours' },
            { key: 'billableHours', title: 'Billable Hours' },
            { key: 'unbilledAmount', title: 'Unbilled Amount', render: (v: number) => formatCurrency(v ?? 0) },
            { key: 'budget', title: 'Budget', render: (v: number) => formatCurrency(v ?? 0) },
          ]}
          data={projects}
        />
      </Card>
    </div>
  )
}
