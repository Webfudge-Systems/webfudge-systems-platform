'use client'

import { Calendar } from 'lucide-react'
import { monthDateLabel, todayDateLabel } from '../../lib/attendanceShared'

export default function HRAttendanceHeaderPicker({ mode = 'date', value, onChange, className = '' }) {
  const isMonth = mode === 'month'
  const label = isMonth ? monthDateLabel(value) : todayDateLabel(value)

  return (
    <label
      className={[
        'group relative inline-flex items-center gap-2.5',
        'rounded-lg border border-gray-200 bg-white',
        'px-3.5 py-2 text-sm font-medium text-gray-900',
        'shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50',
        'cursor-pointer select-none',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="whitespace-nowrap">{label}</span>
      <Calendar className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-gray-700" aria-hidden />
      <input
        type={isMonth ? 'month' : 'date'}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        aria-label={isMonth ? 'Select month' : 'Select date'}
      />
    </label>
  )
}
