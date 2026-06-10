'use client'

import { Briefcase, User, Hash, Calendar } from 'lucide-react'
import HRStatusBadge from '../shared/HRStatusBadge'

function MetaDivider() {
  return <span className="hidden h-5 w-px shrink-0 bg-gray-200 sm:block" aria-hidden />
}

function MetaSegment({ children, className = '' }) {
  return (
    <div className={`flex min-w-0 items-center gap-2 px-3 py-2.5 sm:px-4 ${className}`}>
      {children}
    </div>
  )
}

export default function EmployeeDetailMetaBar({ employee, className = '' }) {
  if (!employee) return null

  return (
    <div
      className={`flex flex-wrap items-center rounded-xl border border-gray-200/90 bg-white shadow-sm ${className}`}
      role="group"
      aria-label="Employee summary"
    >
      <MetaSegment>
        <Briefcase className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
        <span className="text-sm text-gray-500">Department:</span>
        <span className="truncate text-sm font-semibold text-gray-900">{employee.department}</span>
      </MetaSegment>

      <MetaDivider />

      <MetaSegment>
        <HRStatusBadge status={employee.status} />
      </MetaSegment>

      <MetaDivider />

      <MetaSegment>
        <User className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
        <span className="text-sm text-gray-500">Manager:</span>
        <span className="truncate text-sm font-medium text-gray-900">{employee.manager || '—'}</span>
      </MetaSegment>

      <MetaDivider />

      <MetaSegment>
        <Hash className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
        <span className="truncate text-sm text-gray-600">{employee.employeeId}</span>
      </MetaSegment>

      <MetaDivider />

      <MetaSegment className="ml-auto sm:ml-0">
        <Calendar className="h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
        <span className="whitespace-nowrap text-sm text-gray-600">Joined {employee.joinDate}</span>
      </MetaSegment>
    </div>
  )
}
