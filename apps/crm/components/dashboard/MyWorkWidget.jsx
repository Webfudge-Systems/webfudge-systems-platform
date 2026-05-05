'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, LoadingSpinner } from '@webfudge/ui'
import { CheckSquare, ChevronRight, Calendar, AlertTriangle, CalendarDays } from 'lucide-react'
import { fetchMyWorkSummary } from '../../lib/api/taskService'

/** Overdue first, then today, then upcoming — single-column list UX */
const BUCKETS = [
  {
    key: 'overdue',
    label: 'Overdue',
    dataKey: 'overdue',
    icon: AlertTriangle,
    iconClass: 'text-red-600',
    rowAccent: 'border-l-red-500',
    headerBg: 'bg-red-50/80',
    headerBorder: 'border-red-200/70',
  },
  {
    key: 'today',
    label: 'Due today',
    dataKey: 'today',
    icon: Calendar,
    iconClass: 'text-orange-600',
    rowAccent: 'border-l-orange-500',
    headerBg: 'bg-orange-50/90',
    headerBorder: 'border-orange-200/80',
  },
  {
    key: 'upcoming',
    label: 'Upcoming',
    dataKey: 'upcoming',
    icon: CalendarDays,
    iconClass: 'text-amber-600',
    rowAccent: 'border-l-amber-500',
    headerBg: 'bg-amber-50/80',
    headerBorder: 'border-amber-200/80',
  },
]

function taskHref(t) {
  const lc = t.leadCompany
  if (lc && lc.id != null) return `/sales/lead-companies/${lc.id}`
  return '/clients/tasks'
}

export default function MyWorkWidget({ className = '' }) {
  const [myWork, setMyWork] = useState({
    overdue: { count: 0, items: [] },
    today: { count: 0, items: [] },
    upcoming: { count: 0, items: [] },
  })
  const [loading, setLoading] = useState(true)

  const loadMyWork = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchMyWorkSummary()
      setMyWork(data)
    } catch (e) {
      console.error('Dashboard my work:', e)
      setMyWork({
        overdue: { count: 0, items: [] },
        today: { count: 0, items: [] },
        upcoming: { count: 0, items: [] },
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadMyWork()
    const interval = setInterval(loadMyWork, 60000)
    return () => clearInterval(interval)
  }, [loadMyWork])

  return (
    <Card className={`p-6 shadow-lg flex min-h-0 flex-col ${className}`}>
      <div className="mb-6 flex shrink-0 items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">My work</h2>
          <p className="text-sm text-gray-600 mt-0.5">
            Tasks assigned to you — overdue first, then today and what&apos;s next
          </p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-orange-50 border border-orange-200 shadow-md flex items-center justify-center shrink-0">
          <CheckSquare className="w-5 h-5 text-orange-600" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 min-h-0 space-y-8 overflow-y-auto pr-1">
            {BUCKETS.map(
              ({
                key,
                label,
                dataKey,
                icon: Icon,
                iconClass,
                rowAccent,
                headerBg,
                headerBorder,
              }) => {
                const data = myWork[dataKey] || { count: 0, items: [] }
                const items = Array.isArray(data.items) ? data.items : []
                const count = data.count ?? items.length

                return (
                  <section key={key} aria-labelledby={`my-work-${key}`}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-lg ${headerBg} border ${headerBorder} flex items-center justify-center shadow-sm shrink-0`}
                        >
                          <Icon className={`w-[18px] h-[18px] ${iconClass}`} />
                        </div>
                        <h3
                          id={`my-work-${key}`}
                          className="text-sm font-semibold text-gray-900 truncate"
                        >
                          {label}
                        </h3>
                      </div>
                      <span className="text-xs font-semibold tabular-nums text-gray-500 bg-gray-100/90 px-2.5 py-1 rounded-full shrink-0">
                        {count}
                      </span>
                    </div>

                    {items.length ? (
                      <ul className="space-y-2">
                        {items.map((t) => (
                          <li key={t.id}>
                            <Link
                              href={taskHref(t)}
                              className={`group flex items-center gap-3 w-full text-left rounded-xl border border-gray-200/90 bg-gradient-to-br from-white to-gray-50/80 shadow-sm px-3 py-3 pl-3.5 border-l-[3px] ${rowAccent} hover:border-gray-300 hover:shadow-md transition-all duration-200`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 leading-snug line-clamp-2 group-hover:text-gray-950">
                                  {t.name || `Task #${t.id}`}
                                </p>
                              </div>
                              <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 group-hover:text-orange-500 transition-colors" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500 pl-[2.75rem] py-1">No tasks in this group</p>
                    )}
                  </section>
                )
              }
            )}
          </div>

          <div className="mt-4 shrink-0 border-t border-gray-100 pt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              <span className="inline-block w-2 h-2 rounded-full bg-orange-500 mr-1.5 align-middle" />
              Synced from your task list
            </p>
            <Link
              href="/clients/tasks"
              className="inline-flex items-center gap-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
            >
              View all tasks
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </Card>
  )
}
