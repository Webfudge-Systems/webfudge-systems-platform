/**
 * SIP schedule helpers. Mirrors apps/backend/src/utils/invest/schedule.js (the backend uses it
 * to auto-record instalments); keep the two in step.
 */

function iso(d) {
  return d.toISOString().slice(0, 10)
}

function addDays(isoDate, days) {
  return iso(new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + days * 86400000))
}

/** Due dates from start until `untilIso` (inclusive), capped by endDate. */
export function sipDueDates(sip, untilIso = iso(new Date())) {
  const start = String(sip.startDate || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return []
  const end = sip.endDate ? String(sip.endDate).slice(0, 10) : null
  const cap = end && end < untilIso ? end : untilIso
  const out = []
  if (sip.frequency === 'weekly') {
    let d = start
    while (d <= cap && out.length < 1200) {
      out.push(d)
      d = addDays(d, 7)
    }
    return out
  }
  const step = sip.frequency === 'quarterly' ? 3 : 1
  const day = Math.min(Math.max(parseInt(sip.dayOfMonth, 10) || Number(start.slice(8, 10)) || 1, 1), 28)
  const y = Number(start.slice(0, 4))
  let m = Number(start.slice(5, 7)) - 1
  if (day < Number(start.slice(8, 10))) m += 1
  while (out.length < 1200) {
    const d = iso(new Date(Date.UTC(y, m, day)))
    if (d > cap) break
    out.push(d)
    m += step
  }
  return out
}

/** Next due date strictly after today, or null when the plan has ended / is stopped. */
export function nextDueDate(sip, todayIso = iso(new Date())) {
  if (sip.status === 'stopped') return null
  const horizon = addDays(todayIso, 120)
  return sipDueDates(sip, horizon).find((d) => d > todayIso) || null
}

/** Due dates up to today that have no instalment recorded within 10 days after them. */
export function missingInstalments(sip, instalmentDates, todayIso = iso(new Date())) {
  if (sip.status !== 'active') return []
  const dates = instalmentDates.map((d) => String(d).slice(0, 10))
  return sipDueDates(sip, todayIso).filter((due) => {
    const until = addDays(due, 10)
    return !dates.some((d) => d >= due && d <= until)
  })
}
