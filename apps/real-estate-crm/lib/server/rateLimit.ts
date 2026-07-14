/**
 * Minimal in-memory sliding-window rate limiter for public-facing routes.
 * Per-process only — good enough for a single Node instance; swap for a
 * Redis-backed limiter when this runs on serverless/multi-instance.
 */

interface Window {
  count: number
  resetAt: number
}

const windows = new Map<string, Window>()
const MAX_KEYS = 10_000

export function rateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterSeconds: number } {
  const now = Date.now()
  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    if (windows.size >= MAX_KEYS) {
      // Cheap eviction: drop expired windows; if none, reset entirely.
      windows.forEach((w, k) => {
        if (w.resetAt <= now) windows.delete(k)
      })
      if (windows.size >= MAX_KEYS) windows.clear()
    }
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfterSeconds: 0 }
  }

  existing.count += 1
  if (existing.count > limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) }
  }
  return { allowed: true, retryAfterSeconds: 0 }
}

export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return headers.get('x-real-ip') || 'unknown'
}
