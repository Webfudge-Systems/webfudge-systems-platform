'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Square } from 'lucide-react'
import timeTrackingService, { TIMER_CHANGED_EVENT, formatElapsed } from '../lib/api/timeTrackingService'

/** Header pill showing the signed-in user's running task timer (one per user), with a stop button. */
export default function RunningTimerPill() {
  const [active, setActive] = useState(null)
  const [now, setNow] = useState(Date.now())
  const [stopping, setStopping] = useState(false)

  const load = useCallback(async () => {
    try {
      setActive(await timeTrackingService.getActiveTimer())
    } catch {
      setActive(null)
    }
  }, [])

  useEffect(() => {
    load()
    window.addEventListener(TIMER_CHANGED_EVENT, load)
    window.addEventListener('focus', load)
    return () => {
      window.removeEventListener(TIMER_CHANGED_EVENT, load)
      window.removeEventListener('focus', load)
    }
  }, [load])

  useEffect(() => {
    if (!active) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])

  if (!active?.timerStartedAt) return null

  const stop = async () => {
    setStopping(true)
    try {
      await timeTrackingService.stopTimer(active.id)
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className="flex max-w-[16rem] items-center gap-2 rounded-full border border-orange-200 bg-orange-50 py-1 pl-3 pr-1 text-sm shadow-sm">
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-orange-500" aria-hidden />
      <Link
        href={`/tasks/${active.id}`}
        className="min-w-0 truncate font-medium text-orange-800 hover:underline"
        title={active.name}
      >
        {active.name || 'Task'}
      </Link>
      <span className="shrink-0 font-mono text-xs text-orange-700">{formatElapsed(active.timerStartedAt, now)}</span>
      <button
        type="button"
        onClick={stop}
        disabled={stopping}
        title="Stop timer"
        aria-label="Stop timer"
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-60"
      >
        <Square className="h-3 w-3" aria-hidden />
      </button>
    </div>
  )
}
