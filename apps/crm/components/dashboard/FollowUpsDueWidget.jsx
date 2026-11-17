'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BellRing, ChevronRight } from 'lucide-react'
import { Card } from '@webfudge/ui'
import leadCompanyService from '../../lib/api/leadCompanyService'
import { currentStrapiUserId } from '../../lib/rbac'

const DAYS_AHEAD = 7
const CLOSED_STATUSES = ['LOST', 'CONVERTED']

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function dueLabel(dateStr) {
  if (!dateStr) return ''
  const due = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`)
  const days = Math.round((due - startOfToday()) / 86400000)
  if (days < 0) return `${Math.abs(days)} day${days === -1 ? '' : 's'} overdue`
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return due.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
}

/** Leads assigned to me whose next-connect date is overdue or within the next week. */
export default function FollowUpsDueWidget({ className = '' }) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const uid = currentStrapiUserId()
      if (!uid) {
        setLoading(false)
        return
      }
      const until = startOfToday()
      until.setDate(until.getDate() + DAYS_AHEAD)
      try {
        const res = await leadCompanyService.getAll({
          sort: 'nextConnectDate:asc',
          'pagination[pageSize]': 20,
          filters: {
            assignedTo: { id: { $eq: uid } },
            nextConnectDate: { $notNull: true, $lte: until.toISOString().slice(0, 10) },
            status: { $notIn: CLOSED_STATUSES },
          },
        })
        if (!cancelled) setLeads(Array.isArray(res?.data) ? res.data : [])
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Could not load follow-ups')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <Card className={`flex flex-col p-6 shadow-lg ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-gray-900">Follow-ups due</h2>
          <p className="mt-0.5 text-sm text-gray-600">Your leads to connect with in the next {DAYS_AHEAD} days</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-orange-200 bg-orange-50 shadow-sm">
          <BellRing className="h-[22px] w-[22px] text-orange-600" aria-hidden />
        </div>
      </div>

      {loading ? (
        <p className="py-6 text-sm text-gray-500">Loading follow-ups…</p>
      ) : error ? (
        <p className="py-6 text-sm text-red-600">{error}</p>
      ) : leads.length === 0 ? (
        <p className="py-6 text-sm text-gray-500">No follow-ups due. You&apos;re all caught up.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {leads.map((lead) => {
            const label = dueLabel(lead.nextConnectDate)
            const overdue = label.includes('overdue')
            return (
              <li key={lead.id}>
                <Link
                  href={`/sales/lead-companies/${lead.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:bg-gray-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">{lead.companyName || 'Lead'}</p>
                    <p className="truncate text-xs text-gray-500">{String(lead.status || '').replace(/_/g, ' ')}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      overdue ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
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
