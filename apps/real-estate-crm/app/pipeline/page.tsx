'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { LoadingSpinner } from '@webfudge/ui'
import { listLeads } from '../../lib/api/leadService'
import TierPill from '../../components/TierPill'
import EstatePageHeader from '../../components/EstatePageHeader'
import { LEAD_STATUSES, LEAD_STATUS_LABELS, type RealEstateLead, type LeadStatus } from '../../lib/types'

export default function PipelinePage() {
  const [leads, setLeads] = useState<RealEstateLead[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    listLeads({ pageSize: 200 }).then((res) => {
      if (cancelled) return
      setLeads(res.data)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const byStatus = (status: LeadStatus) => leads.filter((l) => l.status === status)

  return (
    <div className="p-6 lg:p-8 space-y-6 h-full flex flex-col">
      <EstatePageHeader
        title="Pipeline"
        subtitle="Leads by sales stage. Drag-and-drop arrives with live data in Stage 5."
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Pipeline', href: '/pipeline' },
        ]}
      />

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner />
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 min-h-0">
          {LEAD_STATUSES.map((status) => {
            const column = byStatus(status)
            return (
              <div key={status} className="w-64 shrink-0 flex flex-col rounded-xl bg-gray-50 border border-gray-200">
                <div className="px-3 py-2.5 border-b border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-600">
                    {LEAD_STATUS_LABELS[status]}
                  </span>
                  <span className="text-xs font-semibold text-gray-400">{column.length}</span>
                </div>
                <div className="p-2 space-y-2 overflow-y-auto flex-1 min-h-[8rem]">
                  {column.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-gray-300">
                      <GitBranch className="w-6 h-6" />
                    </div>
                  ) : (
                    column.map((lead) => (
                      <Link
                        key={lead.id}
                        href={`/leads/${lead.id}`}
                        className="block rounded-lg bg-white border border-gray-200 p-3 hover:border-orange-300 hover:shadow-sm transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                          <span className="text-xs font-bold text-gray-700 shrink-0">{lead.score}</span>
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <p className="text-xs text-gray-500 truncate">{lead.project?.name || 'No project'}</p>
                          <TierPill tier={lead.tier} />
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
