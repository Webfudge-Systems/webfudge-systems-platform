'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, TimerOff } from 'lucide-react'
import { Card } from '@webfudge/ui'
import assignmentService from '../../lib/api/assignmentService'

function overdueLabel(due) {
  if (!due) return ''
  const mins = Math.max(0, Math.round((Date.now() - new Date(due).getTime()) / 60000))
  if (mins < 60) return `${mins} min over`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours} h over`
  return `${Math.round(hours / 24)} days over`
}

/**
 * First-contact SLA breaches (G5). Managers see the whole team, others their own leads.
 * Renders nothing when the org hasn't turned the SLA on.
 */
export default function LeadSlaWidget({ className = '' }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    assignmentService
      .slaSummary()
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e?.message || 'Could not load SLA'))
    return () => {
      cancelled = true
    }
  }, [])

  if (error || !data?.enabled) return null

  return (
    <Card className={`flex flex-col p-6 shadow-lg ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-gray-900">First-contact SLA</h2>
          <p className="mt-0.5 text-sm text-gray-600">New leads should be contacted within {data.firstContactMinutes} min</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 shadow-sm">
          <TimerOff className="h-[22px] w-[22px] text-orange-600" aria-hidden />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className={`rounded-lg border p-3 ${data.breached ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
          <p className={`text-2xl font-semibold ${data.breached ? 'text-red-700' : 'text-gray-900'}`}>{data.breached}</p>
          <p className="text-xs text-gray-600">Breached, not contacted</p>
        </div>
        <div className="rounded-lg border border-gray-200 p-3">
          <p className="text-2xl font-semibold text-gray-900">{data.dueSoon}</p>
          <p className="text-xs text-gray-600">Due in the next hour</p>
        </div>
      </div>

      {data.items?.length ? (
        <ul className="divide-y divide-gray-100">
          {data.items.map((lead) => (
            <li key={lead.id}>
              <Link
                href={`/sales/lead-companies/${lead.id}`}
                className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">{lead.companyName || 'Lead'}</p>
                  <p className="truncate text-xs text-gray-500">{lead.owner?.name || 'Unassigned'}</p>
                </div>
                <span className="shrink-0 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  {overdueLabel(lead.firstContactDueAt)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-2 text-sm text-gray-500">No breaches. Every new lead was contacted on time.</p>
      )}

      <Link
        href="/sales/lead-companies"
        className="mt-4 inline-flex items-center gap-1 self-end text-sm font-semibold text-orange-600 hover:text-orange-700"
      >
        All leads
        <ChevronRight className="h-4 w-4" aria-hidden />
      </Link>
    </Card>
  )
}
