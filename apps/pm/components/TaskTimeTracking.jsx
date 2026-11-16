'use client'

import { useEffect, useState } from 'react'
import { Play, Square, Plus, Timer } from 'lucide-react'
import timeTrackingService, { TIMER_CHANGED_EVENT, formatElapsed, formatHours } from '../lib/api/timeTrackingService'

/**
 * Time tracking cell on the task page: logged hours, start/stop timer, manual entry, billable toggle.
 * @param {{ task: object, canEdit?: boolean, onChanged?: () => void }} props
 */
export default function TaskTimeTracking({ task, canEdit = false, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [manualOpen, setManualOpen] = useState(false)
  const [manualHours, setManualHours] = useState('')
  const [now, setNow] = useState(Date.now())

  const running = Boolean(task?.timerRunning && task?.timerStartedAt)

  // Reload the task after any timer change (here or from the header pill).
  useEffect(() => {
    if (!onChanged) return undefined
    window.addEventListener(TIMER_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(TIMER_CHANGED_EVENT, onChanged)
  }, [onChanged])

  useEffect(() => {
    if (!running) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
    } catch (e) {
      setError(e?.message || 'Could not update time')
    } finally {
      setBusy(false)
    }
  }

  const submitManual = (e) => {
    e.preventDefault()
    const h = Number(manualHours)
    if (!Number.isFinite(h) || h <= 0 || h > 24) {
      setError('Enter hours between 0 and 24 (e.g. 1.5)')
      return
    }
    run(async () => {
      await timeTrackingService.logHours(task.id, h)
      setManualHours('')
      setManualOpen(false)
    })
  }

  const logged = Number(task?.hoursLogged) || 0

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2.5">
        <Timer className={`h-5 w-5 shrink-0 ${running ? 'text-orange-500' : 'text-gray-400'}`} aria-hidden />
        <div className="min-w-0">
          <p className="text-base font-semibold leading-snug text-gray-900">
            {logged > 0 ? formatHours(logged) : '—'}
            {running ? (
              <span className="ml-2 font-mono text-sm font-medium text-orange-600">
                +{formatElapsed(task.timerStartedAt, now)}
              </span>
            ) : null}
          </p>
          <p className="text-sm text-gray-500">
            {running ? 'Timer running' : logged > 0 ? 'Logged' : 'Not logged yet'}
            {task?.billable ? ' · Billable' : ''}
          </p>
        </div>
      </div>

      {canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              run(() => (running ? timeTrackingService.stopTimer(task.id) : timeTrackingService.startTimer(task.id)))
            }
            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-60 ${
              running ? 'bg-gray-800 hover:bg-gray-900' : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            {running ? <Square className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
            {running ? 'Stop' : 'Start timer'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setManualOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Add time
          </button>
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-700">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-orange-500"
              checked={Boolean(task?.billable)}
              disabled={busy}
              onChange={(e) => run(() => timeTrackingService.setBillable(task.id, e.target.checked))}
            />
            Billable
          </label>
        </div>
      ) : null}

      {manualOpen && canEdit ? (
        <form onSubmit={submitManual} className="flex items-center gap-2">
          <input
            type="number"
            min="0.05"
            max="24"
            step="0.05"
            inputMode="decimal"
            value={manualHours}
            onChange={(e) => setManualHours(e.target.value)}
            placeholder="Hours, e.g. 1.5"
            aria-label="Hours to add"
            className="w-32 rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-orange-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
          >
            Add
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
