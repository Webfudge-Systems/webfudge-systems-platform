import { buildAttendanceSnapshot } from './attendanceSnapshot'

function startOfDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Last N days of attendance activity for the dashboard area chart. */
export function buildAttendanceActivitySeries(activeEmployeeCount, days = 7) {
  const today = startOfDay(new Date())
  const snap = buildAttendanceSnapshot(activeEmployeeCount)
  const points = []

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(today)
    day.setDate(day.getDate() - i)

    const wave = 0.88 + ((i + day.getDay()) % 4) * 0.04
    const checkedIn = Math.max(0, Math.round(snap.present * wave))
    const onLeave = Math.max(0, Math.round(snap.onLeave * (0.92 + (i % 2) * 0.06)))

    points.push({
      day,
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      shortLabel: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      checkedIn,
      onLeave,
      total: checkedIn + onLeave,
    })
  }

  const max = Math.max(1, ...points.map((p) => p.total))
  return { points, max, days }
}
