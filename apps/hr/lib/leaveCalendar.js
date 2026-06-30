import { formatLeaveStatus } from './leaveShared'

function addExclusiveEndDate(dateString) {
  if (!dateString) return dateString
  const [year, month, day] = dateString.split('-').map(Number)
  if (!year || !month || !day) return dateString
  const date = new Date(year, month - 1, day + 1)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function leaveCalendarEventsKey(requests = []) {
  return requests
    .map(
      (row) =>
        `${row.id}|${row.from}|${row.to || ''}|${row.status}|${row.employeeName}|${row.type}`,
    )
    .join('\n')
}

export function filterLeaveCalendarRequests(requests = [], search = '') {
  const q = search.toLowerCase().trim()
  return requests.filter((row) => {
    const status = formatLeaveStatus(row.status)
    if (status === 'Rejected') return false
    if (!q) return true
    return (
      (row.employeeName || '').toLowerCase().includes(q) ||
      (row.type || '').toLowerCase().includes(q) ||
      (row.reason || '').toLowerCase().includes(q) ||
      (row.employeeCode || '').toLowerCase().includes(q) ||
      (row.from || '').includes(q) ||
      (row.to || '').includes(q) ||
      status.toLowerCase().includes(q)
    )
  })
}

/**
 * Maps leave requests to FullCalendar events for `UnifiedWorkspaceCalendar`.
 * Uses attendance-style cards: approved = orange leave, pending = neutral.
 */
export function mapLeaveRequestsToCalendarEvents(requests = []) {
  return requests
    .filter((row) => {
      const status = formatLeaveStatus(row.status)
      return status === 'Approved' || status === 'Pending'
    })
    .map((row) => {
      const status = formatLeaveStatus(row.status)
      const isApproved = status === 'Approved'
      const shortType = (row.type || 'Leave').replace(/ Leave$/i, '')

      const fromDate = row.from
      const toDate = row.to || row.from
      const event = {
        id: String(row.id),
        title: `${row.employeeName || 'Employee'} · ${shortType}`,
        start: fromDate,
        allDay: true,
        extendedProps: {
          kind: 'attendance',
          entity: {
            status: isApproved ? 'leave' : 'default',
            label: status,
            summary: row.type,
            hours: row.days ? `${row.days}d` : null,
            note: row.reason || null,
            leaveRequestId: row.id,
          },
        },
      }

      if (toDate && toDate !== fromDate) {
        event.end = addExclusiveEndDate(toDate)
      }

      return event
    })
}
