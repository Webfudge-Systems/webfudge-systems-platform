'use client'

import { clsx } from 'clsx'
import { MapPin } from 'lucide-react'
import {
  Avatar,
  Badge,
  TableCellText,
  TableCellTitleSubtitle,
} from '@webfudge/ui'

const STATUS_PILL = {
  PRESENT: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'ON LEAVE': 'border-amber-200 bg-amber-50 text-amber-900',
  WFH: 'border-sky-200 bg-sky-50 text-sky-900',
  ABSENT: 'border-red-200 bg-red-50 text-red-900',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  'PENDING APPROVAL': 'border-orange-200 bg-orange-50 text-orange-900',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-800',
}

export function AttendanceEmployeeCell({ row }) {
  const initial = row.name?.charAt(0) || '?'
  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <Avatar
        alt={row.name}
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-gray-600 text-white"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TableCellTitleSubtitle title={row.name} subtitle={row.employeeId} />
          {row.late ? (
            <Badge className="border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              Late
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function AttendanceTextCell({ value, emphasized = false }) {
  return <TableCellText value={value} emphasized={emphasized} nowrap />
}

export function AttendanceStatusPill({ status }) {
  const raw = (status || '—').toString().trim()
  const key = raw.toUpperCase()
  const tone = STATUS_PILL[key] || 'border-gray-300 bg-gray-50 text-gray-700'
  return (
    <Badge
      className={clsx('whitespace-nowrap border px-3 py-1 text-xs font-semibold uppercase tracking-wide', tone)}
    >
      {key.replace(/_/g, ' ')}
    </Badge>
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

export function AttendancePersonCell({ name }) {
  if (!name) return <span className="text-sm text-gray-400">—</span>
  const initial = name.charAt(0) || '?'
  return (
    <div className="flex min-w-[160px] items-center gap-2.5">
      <Avatar
        alt={name}
        fallback={initial}
        size="sm"
        className="flex-shrink-0 bg-gray-600 text-white"
      />
      <span className="truncate text-sm font-semibold text-gray-900">{name}</span>
    </div>
  )
}
