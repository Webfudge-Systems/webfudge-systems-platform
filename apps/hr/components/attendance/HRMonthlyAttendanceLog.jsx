'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Clock, Edit, FileSpreadsheet, Plus, Trash2 } from 'lucide-react'
import {
  Avatar,
  Button,
  Card,
  EmptyState,
} from '@webfudge/ui'
import { monthDateLabel, toDateInputValue } from '../../lib/attendanceShared'
import { summarizeMonthlyAttendanceRecords } from '../../lib/attendancePage'
import { AttendanceStatusPill } from './AttendanceTableCells'

const STATUS_LEGEND = [
  { label: 'Present', dotClass: 'bg-emerald-400' },
  { label: 'On leave', dotClass: 'bg-orange-300' },
  { label: 'WFH', dotClass: 'bg-blue-400' },
  { label: 'Absent', dotClass: 'bg-red-400' },
]

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatDayLabel(dateValue) {
  if (!dateValue) return 'Select a day'
  return new Date(`${dateValue}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function buildMonthCells(monthValue) {
  if (!monthValue) return { year: null, month: null, cells: [] }
  const [year, month] = monthValue.split('-').map(Number)
  if (!year || !month) return { year: null, month: null, cells: [] }

  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []

  for (let index = 0; index < firstWeekday; index += 1) {
    cells.push(null)
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateValue = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    cells.push({ day, dateValue })
  }

  return { year, month, cells }
}

function MonthDayGrid({ monthValue, recordsByDate, selectedDate, onSelectDate }) {
  const { cells } = buildMonthCells(monthValue)
  const today = toDateInputValue()

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-1 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-500"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="min-h-[3.25rem]" />
          }

          const dayRecords = recordsByDate.get(cell.dateValue) || []
          const isSelected = selectedDate === cell.dateValue
          const isToday = cell.dateValue === today

          return (
            <button
              key={cell.dateValue}
              type="button"
              onClick={() => onSelectDate(cell.dateValue)}
              className={[
                'flex min-h-[3.25rem] flex-col items-center justify-center rounded-lg border px-1 py-1.5 text-center transition-colors',
                isSelected
                  ? 'border-orange-400 bg-orange-50 text-orange-900 shadow-sm'
                  : dayRecords.length
                    ? 'border-emerald-200 bg-emerald-50/70 text-gray-900 hover:border-emerald-300'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50',
                isToday && !isSelected ? 'ring-1 ring-orange-300' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className={`text-sm font-semibold ${isToday ? 'text-orange-600' : ''}`}>{cell.day}</span>
              {dayRecords.length ? (
                <span className="mt-0.5 rounded-full bg-white/90 px-1.5 text-[10px] font-semibold text-gray-600 ring-1 ring-black/5">
                  {dayRecords.length}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyLogCard({ record, selected, actionId, onSelect, onEdit, onDelete }) {
  const name = record.name || 'Employee'
  const initial = name.charAt(0) || '?'

  return (
    <button
      type="button"
      onClick={() => onSelect?.(record)}
      className={[
        'w-full rounded-xl border p-4 text-left transition-all',
        selected
          ? 'border-orange-300 bg-orange-50/60 shadow-sm ring-1 ring-orange-200'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
      ].join(' ')}
    >
      <div className="flex items-start gap-3">
        <Avatar alt={name} fallback={initial} size="sm" className="shrink-0 bg-gray-600 text-white" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
            {record.late ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
                Late
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{record.employeeCode || record.employeeId || '—'}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <AttendanceStatusPill status={record.status} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-gray-50 px-2.5 py-2">
              <p className="font-medium text-gray-500">In</p>
              <p className="mt-0.5 font-semibold text-gray-900">{record.clockIn || '—'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 px-2.5 py-2">
              <p className="font-medium text-gray-500">Out</p>
              <p className="mt-0.5 font-semibold text-gray-900">{record.clockOut || '—'}</p>
            </div>
            <div className="rounded-lg bg-gray-50 px-2.5 py-2">
              <p className="font-medium text-gray-500">Hours</p>
              <p className="mt-0.5 font-semibold text-gray-900">{record.duration || '—'}</p>
            </div>
          </div>
          {record.location && record.location !== '—' ? (
            <p className="mt-2 text-xs text-gray-500">Location: {record.location}</p>
          ) : null}
        </div>
      </div>

      {selected ? (
        <div className="mt-4 flex justify-end gap-1 border-t border-orange-100 pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-gray-700"
            onClick={(event) => {
              event.stopPropagation()
              onEdit?.(record)
            }}
          >
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-red-600 hover:bg-red-50"
            disabled={actionId === record.id}
            onClick={(event) => {
              event.stopPropagation()
              onDelete?.(record)
            }}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      ) : null}
    </button>
  )
}

export default function HRMonthlyAttendanceLog({
  records = [],
  monthValue,
  loading = false,
  actionId,
  onMarkAttendance,
  onEditRecord,
  onDeleteRecord,
}) {
  const [selectedRecordId, setSelectedRecordId] = useState(null)
  const [selectedDate, setSelectedDate] = useState(null)

  useEffect(() => {
    setSelectedRecordId(null)
    setSelectedDate(null)
  }, [monthValue])

  const summary = useMemo(() => summarizeMonthlyAttendanceRecords(records), [records])

  const recordsByDate = useMemo(() => {
    const grouped = new Map()
    for (const record of records) {
      const date = record.attendanceDate
      if (!date) continue
      const bucket = grouped.get(date) || []
      bucket.push(record)
      grouped.set(date, bucket)
    }
    return grouped
  }, [records])

  const defaultDate = useMemo(() => {
    if (!records.length) return null
    const today = toDateInputValue()
    if (recordsByDate.has(today)) return today
    const sortedDates = [...recordsByDate.keys()].sort((a, b) => b.localeCompare(a))
    return sortedDates[0] || null
  }, [records, recordsByDate])

  const activeDate = selectedDate || defaultDate

  const selectedRecord = useMemo(() => {
    if (!records.length) return null
    if (selectedRecordId) {
      const match = records.find((record) => record.id === selectedRecordId)
      if (match) return match
    }
    if (!activeDate) return records[0]
    const dayRecords = recordsByDate.get(activeDate) || []
    return dayRecords[0] || records[0]
  }, [records, selectedRecordId, activeDate, recordsByDate])

  const visibleDayRecords = useMemo(() => {
    if (!activeDate) return []
    return recordsByDate.get(activeDate) || []
  }, [recordsByDate, activeDate])

  const datedTimeline = useMemo(
    () =>
      [...recordsByDate.entries()]
        .sort(([left], [right]) => right.localeCompare(left))
        .map(([date, dayRecords]) => ({ date, dayRecords })),
    [recordsByDate],
  )

  const summaryLine = [
    `${records.length} saved log${records.length === 1 ? '' : 's'}`,
    `${summary.present} present`,
    `${summary.onLeave} on leave`,
    `${summary.wfh} WFH`,
    `${summary.absent} absent`,
  ].join(' · ')

  if (!loading && records.length === 0) {
    return (
      <Card variant="elevated" className="rounded-xl p-8">
        <EmptyState
          icon={FileSpreadsheet}
          title="No monthly records yet"
          description="Saved attendance for this month will appear on the calendar once employees clock in or HR marks attendance."
          action={
            <Button className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={onMarkAttendance}>
              <Plus className="h-4 w-4" />
              Mark attendance
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-900">{monthDateLabel(monthValue)}</p>
          <p className="mt-0.5 text-xs text-gray-500">{summaryLine}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {STATUS_LEGEND.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} aria-hidden />
              {item.label}
            </span>
          ))}
          <Button className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={onMarkAttendance}>
            <Plus className="h-4 w-4" />
            Mark attendance
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card variant="elevated" className="space-y-5 rounded-xl p-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Month overview</h3>
            <p className="mt-1 text-sm text-gray-500">
              Days with saved logs are highlighted. Select a day to review entries.
            </p>
          </div>

          <MonthDayGrid
            monthValue={monthValue}
            recordsByDate={recordsByDate}
            selectedDate={activeDate}
            onSelectDate={(dateValue) => {
              setSelectedDate(dateValue)
              const dayRecords = recordsByDate.get(dateValue) || []
              setSelectedRecordId(dayRecords[0]?.id ?? null)
            }}
          />

          <div className="space-y-2 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Logged days</p>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {datedTimeline.map(({ date, dayRecords }) => {
                const isActive = activeDate === date
                return (
                  <button
                    key={date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(date)
                      setSelectedRecordId(dayRecords[0]?.id ?? null)
                    }}
                    className={[
                      'flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                      isActive
                        ? 'border-orange-300 bg-orange-50 text-orange-900'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50',
                    ].join(' ')}
                  >
                    <span className="font-medium">{formatDayLabel(date)}</span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                      {dayRecords.length}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="overflow-hidden rounded-xl">
          <div className="border-b border-gray-100 px-5 py-4">
            <div className="flex items-center gap-2 text-gray-900">
              <Clock className="h-4 w-4 text-orange-500" />
              <h3 className="text-sm font-semibold">Day log</h3>
            </div>
            <p className="mt-1 text-base font-semibold text-gray-900">{formatDayLabel(activeDate)}</p>
            <p className="mt-1 text-xs text-gray-500">
              {visibleDayRecords.length} record{visibleDayRecords.length === 1 ? '' : 's'} on this day
            </p>
          </div>

          <div className="max-h-[640px] space-y-3 overflow-y-auto p-4">
            {visibleDayRecords.length ? (
              visibleDayRecords.map((record) => (
                <MonthlyLogCard
                  key={record.id}
                  record={record}
                  selected={selectedRecord?.id === record.id}
                  actionId={actionId}
                  onSelect={(item) => setSelectedRecordId(item.id)}
                  onEdit={onEditRecord}
                  onDelete={onDeleteRecord}
                />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-10 text-center">
                <CalendarDays className="mx-auto h-8 w-8 text-gray-300" />
                <p className="mt-3 text-sm font-medium text-gray-700">No logs for this day</p>
                <p className="mt-1 text-xs text-gray-500">Pick another day on the month grid.</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
