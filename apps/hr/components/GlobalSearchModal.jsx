'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Briefcase, Wallet, CalendarCheck, BarChart3 } from 'lucide-react'
import { LoadingSpinner, WorkspaceSearchModal } from '@webfudge/ui'
import { EMPLOYEES } from '../lib/mock-data/employees'

const QUICK_LINKS = [
  { label: 'Employees', href: '/employees', icon: Users },
  { label: 'Recruitment', href: '/recruitment', icon: Briefcase },
  { label: 'Payroll', href: '/payroll', icon: Wallet },
  { label: 'Attendance', href: '/attendance', icon: CalendarCheck },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
]

function matchQuery(text, query) {
  return String(text || '')
    .toLowerCase()
    .includes(query.trim().toLowerCase())
}

export default function HRGlobalSearchModal({ isOpen, onClose, initialQuery = '' }) {
  const router = useRouter()
  const [query, setQuery] = useState(initialQuery)

  const results = useMemo(() => {
    const q = query.trim()
    if (!q) return { employees: [], links: QUICK_LINKS }
    return {
      employees: EMPLOYEES.filter(
        (e) =>
          matchQuery(e.name, q) ||
          matchQuery(e.employeeId, q) ||
          matchQuery(e.department, q) ||
          matchQuery(e.email, q)
      ).slice(0, 8),
      links: QUICK_LINKS.filter((l) => matchQuery(l.label, q)),
    }
  }, [query])

  const navigate = (href) => {
    onClose()
    router.push(href)
  }

  return (
    <WorkspaceSearchModal
      isOpen={isOpen}
      onClose={onClose}
      query={query}
      onQueryChange={setQuery}
      placeholder="Search employees, modules…"
      aria-label="Search HR workspace"
    >
      {!query.trim() ? (
        <div className="px-4 py-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Quick links
          </p>
          <div className="space-y-1">
            {QUICK_LINKS.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => navigate(item.href)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
                >
                  <Icon className="h-4 w-4 text-orange-500" />
                  {item.label}
                </button>
              )
            })}
          </div>
        </div>
      ) : results.employees.length === 0 && results.links.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-gray-500">No results for &ldquo;{query}&rdquo;</div>
      ) : (
        <div className="max-h-[min(60vh,24rem)] overflow-y-auto py-2">
          {results.employees.length > 0 ? (
            <section className="px-2 pb-2">
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Employees
              </p>
              {results.employees.map((emp) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className="flex w-full flex-col rounded-lg px-3 py-2.5 text-left hover:bg-gray-50"
                >
                  <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                  <span className="text-xs text-gray-500">
                    {emp.employeeId} · {emp.department}
                  </span>
                </button>
              ))}
            </section>
          ) : null}
          {results.links.length > 0 ? (
            <section className={`px-2 ${results.employees.length ? 'border-t border-gray-100 pt-2' : ''}`}>
              <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                Modules
              </p>
              {results.links.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => navigate(item.href)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
                  >
                    <Icon className="h-4 w-4 text-orange-500" />
                    {item.label}
                  </button>
                )
              })}
            </section>
          ) : null}
        </div>
      )}
      {false ? <LoadingSpinner size="sm" /> : null}
    </WorkspaceSearchModal>
  )
}
