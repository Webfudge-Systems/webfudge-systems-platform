// @ts-nocheck
'use client'

import { Card, Table } from '@webfudge/ui'

type ModulePageProps = {
  title: string
  subtitle?: string
  columns?: Array<{ key: string; title: string }>
  data?: Array<Record<string, string | number>>
}

export default function ModulePage({ title, subtitle, columns, data }: ModulePageProps) {
  const defaultColumns = columns ?? [
    { key: 'name', title: 'Name' },
    { key: 'status', title: 'Status' },
    { key: 'updatedAt', title: 'Updated' },
  ]

  const defaultData = data ?? [
    { id: 1, name: `${title} Record`, status: 'Active', updatedAt: 'Today' },
    { id: 2, name: `${title} Draft`, status: 'Draft', updatedAt: 'Yesterday' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-brand-foreground">{title}</h1>
        {subtitle ? <p className="text-sm text-brand-text-light mt-1">{subtitle}</p> : null}
      </div>
      <Card className="p-0 overflow-hidden">
        <Table columns={defaultColumns} data={defaultData} variant="modernEmbedded" />
      </Card>
    </div>
  )
}
