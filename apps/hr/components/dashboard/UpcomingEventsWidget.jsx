'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Button,
  EmptyState,
} from '@webfudge/ui'
import HRDashboardInsightShell, { HRInsightCountBadge } from './HRDashboardInsightShell'
import { Calendar, ChevronLeft, ChevronRight, PartyPopper } from 'lucide-react'
import { calendarDayDiff, parseDisplayDate, startOfLocalDay } from '@webfudge/utils'
import { UPCOMING_EVENTS } from '../../lib/mock-data/dashboard'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const EVENT_LIMIT = 3
const EVENT_ROW_MIN_H = '3rem'

const EVENT_DOT_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-violet-500']

function eventTypeLabel(type) {
  if (type === 'holiday') return 'Holiday'
  if (type === 'birthday') return 'Birthday'
  if (type === 'anniversary') return 'Work anniversary'
  return 'Event'
}

function daysUntil(dateString) {
  const due = parseDisplayDate(dateString)
  if (!due) return NaN
  return calendarDayDiff(due)
}

function formatDaysLeft(days) {
  if (Number.isNaN(days)) return ''
  if (days < 0) return `${Math.abs(days)}d ago`
  if (days === 0) return 'Today'
  if (days === 1) return '1d left'
  return `${days}d left`
}

function dateKey(d) {
  const x = parseDisplayDate(d)
  if (!x) return ''
  const local = startOfLocalDay(x)
  return `${local.getFullYear()}-${local.getMonth()}-${local.getDate()}`
}

function monthMatrix(viewYear, viewMonth) {
  const first = new Date(viewYear, viewMonth, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export default function UpcomingEventsWidget({ events = UPCOMING_EVENTS, className = '' }) {
  const router = useRouter()
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  const upcoming = useMemo(() => {
    return (events || [])
      .filter((e) => e?.date)
      .map((e) => ({ ...e, daysLeft: daysUntil(e.date) }))
      .sort((a, b) => {
        const aT = parseDisplayDate(a.date)?.getTime() ?? 0
        const bT = parseDisplayDate(b.date)?.getTime() ?? 0
        return aT - bT
      })
      .slice(0, EVENT_LIMIT)
  }, [events])

  const eventDays = useMemo(() => {
    const map = new Map()
    upcoming.forEach((e, i) => {
      const key = dateKey(e.date)
      if (!key) return
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(i % EVENT_DOT_COLORS.length)
    })
    return map
  }, [upcoming])

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })

  const cells = monthMatrix(viewYear, viewMonth)
  const calendarRowCount = Math.max(1, Math.ceil(cells.length / 7))

  const eventSlots = useMemo(() => {
    const slots = upcoming.map((event) => ({ type: 'event', event }))
    while (slots.length < EVENT_LIMIT) {
      slots.push({ type: 'empty' })
    }
    return slots
  }, [upcoming])

  const shiftMonth = (delta) => {
    const d = new Date(viewYear, viewMonth + delta, 1)
    setViewYear(d.getFullYear())
    setViewMonth(d.getMonth())
  }

  return (
    <HRDashboardInsightShell
      fillHeight
      className={className}
      title="Current good"
      badge={
        upcoming.length > 0 ? (
          <HRInsightCountBadge tone="orange">{upcoming.length}</HRInsightCountBadge>
        ) : null
      }
      subtitle="Holidays, birthdays & milestones"
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/leave')}
          className="!h-7 !px-2 text-[11px] font-semibold text-orange-600 hover:text-orange-700"
        >
          View calendar
        </Button>
      }
      panelClassName="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="flex min-h-0 flex-1 flex-col divide-y divide-gray-100">
        {upcoming.length === 0 ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <EmptyState
              icon={PartyPopper}
              title="No upcoming events"
              description="Holidays, birthdays, and milestones will appear here."
              className="py-4"
            />
          </div>
        ) : (
          eventSlots.map((slot, index) => {
            if (slot.type === 'empty') {
              return (
                <div
                  key={`event-empty-${index}`}
                  className="flex items-center justify-center bg-gray-50/40 px-3"
                  style={{ minHeight: EVENT_ROW_MIN_H }}
                  aria-hidden
                />
              )
            }

            const event = slot.event
            const due = parseDisplayDate(event.date)
            const month = due
              ? due.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
              : '—'
            const day = due ? due.getDate() : '—'
            const urgent = event.daysLeft >= 0 && event.daysLeft <= 2

            return (
              <button
                key={`${event.title}-${event.date}`}
                type="button"
                onClick={() => router.push('/leave')}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-orange-50/40"
                style={{ minHeight: EVENT_ROW_MIN_H }}
              >
                <div className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-red-600">
                    {month}
                  </span>
                  <span className="text-sm font-bold leading-none text-gray-900">{day}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-gray-900">
                    {event.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {eventTypeLabel(event.type)}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-xs font-semibold tabular-nums ${
                    urgent ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {formatDaysLeft(event.daysLeft)}
                </span>
              </button>
            )
          })
        )}

        <div className="mt-auto flex min-h-0 flex-1 flex-col border-t border-gray-100 bg-gradient-to-b from-orange-50/50 to-white px-3 pb-3 pt-2.5">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => router.push('/leave')}
              className="group flex min-w-0 items-center gap-1.5 text-left"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-100 text-orange-600 ring-1 ring-orange-200/80">
                <Calendar className="h-3.5 w-3.5" aria-hidden />
              </span>
              <span className="truncate text-sm font-semibold text-gray-900 group-hover:text-orange-700">
                {monthLabel}
              </span>
            </button>
            <div className="flex shrink-0 items-center rounded-lg border border-gray-200/80 bg-white p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="mb-1 grid shrink-0 grid-cols-7 gap-px text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            {WEEKDAYS.map((w, i) => (
              <div key={`${w}-${i}`} className="py-0.5">
                {w}
              </div>
            ))}
          </div>

          <div
            className="grid min-h-0 flex-1 grid-cols-7 gap-1 rounded-lg bg-gray-100/80 p-1"
            style={{ gridTemplateRows: `repeat(${calendarRowCount}, minmax(1.5rem, 1fr))` }}
          >
            {cells.map((cell, idx) => {
              if (!cell) {
                return <div key={`e-${idx}`} className="min-h-[1.5rem] rounded-md" />
              }
              const key = dateKey(cell)
              const dots = eventDays.get(key) || []
              const isToday = dateKey(today) === key
              const hasEvent = dots.length > 0

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => router.push('/leave')}
                  className={`relative flex min-h-[1.5rem] items-center justify-center rounded-md text-[11px] font-medium transition ${
                    isToday
                      ? 'bg-orange-500 text-white shadow-sm ring-2 ring-orange-200'
                      : hasEvent
                        ? 'bg-white text-gray-900 hover:bg-orange-50'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                  title={hasEvent ? `${cell.getDate()} — event` : String(cell.getDate())}
                >
                  {cell.getDate()}
                  {hasEvent && !isToday ? (
                    <span className="absolute bottom-0.5 left-1/2 flex -translate-x-1/2 gap-0.5">
                      {dots.slice(0, 3).map((colorIdx, i) => (
                        <span
                          key={i}
                          className={`h-1 w-1 rounded-full ${EVENT_DOT_COLORS[colorIdx]}`}
                        />
                      ))}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </HRDashboardInsightShell>
  )
}
