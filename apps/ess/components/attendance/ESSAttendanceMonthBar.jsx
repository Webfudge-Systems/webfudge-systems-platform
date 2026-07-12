'use client'



import { Calendar } from 'lucide-react'

import { Input } from '@webfudge/ui'

import { monthDateLabel } from '../../lib/attendanceShared'



function ESSAttendanceMonthPicker({ monthValue, onMonthChange, className = '' }) {

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

      <span className="whitespace-nowrap">{monthDateLabel(monthValue)}</span>

      <Calendar className="h-4 w-4 shrink-0 text-gray-500 group-hover:text-gray-700" aria-hidden />

      <input

        type="month"

        value={monthValue}

        onChange={(e) => onMonthChange?.(e.target.value)}

        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"

        aria-label="Select month"

      />

    </label>

  )

}



export default function ESSAttendanceMonthBar({

  monthValue,

  onMonthChange,

  summaryText,

  variant = 'default',

  className = '',

}) {

  if (variant === 'header') {

    return (

      <ESSAttendanceMonthPicker

        monthValue={monthValue}

        onMonthChange={onMonthChange}

        className={className}

      />

    )

  }



  return (

    <div

      className={[

        'flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm',

        className,

      ]

        .filter(Boolean)

        .join(' ')}

    >

      <div className="min-w-0">

        <p className="text-sm font-semibold text-gray-900">{monthDateLabel(monthValue)}</p>

        {summaryText ? <p className="text-xs text-gray-500">{summaryText}</p> : null}

      </div>

      <Input

        type="month"

        value={monthValue}

        onChange={(e) => onMonthChange?.(e.target.value)}

        className="max-w-[180px]"

        aria-label="Select month"

      />

    </div>

  )

}


