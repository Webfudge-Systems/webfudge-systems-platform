'use client'

import { clsx } from 'clsx'
import { MapPin } from 'lucide-react'
import {
  Avatar,
  Badge,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'

const ATTENDANCE_STATUS_PILL = {
  PRESENT: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'ON LEAVE': 'border-amber-200 bg-amber-50 text-amber-900',
  WFH: 'border-sky-200 bg-sky-50 text-sky-900',
  ABSENT: 'border-red-200 bg-red-50 text-red-900',
  'NOT MARKED': 'border-gray-200 bg-gray-50 text-gray-600',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'PENDING APPROVAL': 'border-orange-200 bg-orange-50 text-orange-900',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  UNASSIGNED: 'border-gray-200 bg-gray-50 text-gray-600',
}

export function AttendanceEmployeeCell({ row }) {
  const name = row.name || row.employee
  const id = row.employeeCode || row.employeeId
  const initial = name?.charAt(0) || '?'

  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar
        alt={name}
        fallback={initial}
        size="sm"
        className="shrink-0 bg-gray-600 text-white"
      />
      <div className="min-w-0">
        <TableCellTitleSubtitle title={name} subtitle={id} />
        {row.late ? (
          <Badge className="mt-1 border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
            Late
          </Badge>
        ) : null}
      </div>
    </div>
  )
}

export function AttendanceTextCell({ value, emphasized = false }) {
  return <TableCellText value={value} emphasized={emphasized} nowrap />
}

export function AttendanceAmountCell({ value, emphasized = true }) {
  const display =
    value == null || value === ''
      ? null
      : typeof value === 'number'
        ? `₹${value.toLocaleString('en-IN')}`
        : String(value)

  return <TableCellText value={display} emphasized={emphasized} nowrap className="tabular-nums" />
}

export function AttendanceStatusPill({ status }) {
  const raw = (status || '—').toString().trim()
  const key = raw.toUpperCase()
  const tone = ATTENDANCE_STATUS_PILL[key] || 'border-gray-300 bg-gray-50 text-gray-700'

  return (
    <span
      className={clsx(
        'inline-flex whitespace-nowrap rounded-lg border px-3 py-1 text-xs font-semibold uppercase tracking-wide',
        tone,
      )}
    >
      {key.replace(/_/g, ' ')}
    </span>
  )
}

export function AttendanceShiftCell({ row }) {
  const name = row.name || 'Shift'
  const initial = name.charAt(0) || '?'
  const subtitle = row.shiftCode || row.id || '—'

  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar
        alt={name}
        fallback={initial}
        size="sm"
        className="shrink-0 bg-gray-600 text-white"
      />
      <TableCellTitleSubtitle title={name} subtitle={subtitle} />
    </div>
  )
}

export function AttendanceLocationCell({ location }) {
  if (!location || location === '—') {
    return <span className="text-sm text-gray-400">—</span>
  }
  return (
    <div className="flex min-w-[120px] max-w-[200px] items-center gap-2 text-sm text-gray-600">
      <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      <span className="truncate">{location}</span>
    </div>
  )
}
