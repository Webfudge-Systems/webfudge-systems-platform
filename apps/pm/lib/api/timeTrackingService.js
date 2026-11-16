/**
 * Task time tracking — backend: /tasks/:id/timer/start|stop, /tasks/:id/time, /tasks/timer/active.
 * Fires a `pm-timer-changed` window event after every change so the header pill and task page stay in sync.
 */
import strapiClient from '../strapiClient'

export const TIMER_CHANGED_EVENT = 'pm-timer-changed'

function notifyChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(TIMER_CHANGED_EVENT))
}

const timeTrackingService = {
  /** @returns {Promise<{ id: number, name: string, timerStartedAt: string } | null>} */
  async getActiveTimer() {
    const res = await strapiClient.get('/tasks/timer/active')
    return res?.data || null
  },

  /** Starts the timer on a task (stops the user's other running timer, if any). */
  async startTimer(taskId) {
    const res = await strapiClient.post(`/tasks/${taskId}/timer/start`, {})
    notifyChanged()
    return res
  },

  async stopTimer(taskId) {
    const res = await strapiClient.post(`/tasks/${taskId}/timer/stop`, {})
    notifyChanged()
    return res
  },

  /** Adds manually entered hours (0 < hours <= 24). */
  async logHours(taskId, hours) {
    const res = await strapiClient.post(`/tasks/${taskId}/time`, { hours: Number(hours) })
    notifyChanged()
    return res
  },

  async setBillable(taskId, billable) {
    const res = await strapiClient.post(`/tasks/${taskId}/time`, { billable: Boolean(billable) })
    notifyChanged()
    return res
  },
}

/** 1.5 → "1h 30m"; 0 → "0h". */
export function formatHours(hours) {
  const total = Math.round((Number(hours) || 0) * 60)
  const h = Math.floor(total / 60)
  const m = total % 60
  if (!h && !m) return '0h'
  return m ? `${h}h ${m}m` : `${h}h`
}

/** Elapsed time since an ISO date as "HH:MM:SS". */
export function formatElapsed(sinceIso, now = Date.now()) {
  const secs = Math.max(0, Math.floor((now - new Date(sinceIso).getTime()) / 1000))
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`
}

export default timeTrackingService
