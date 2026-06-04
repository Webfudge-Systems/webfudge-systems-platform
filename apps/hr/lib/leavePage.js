import { LEAVE_BALANCES, LEAVE_POLICIES, LEAVE_REQUESTS } from './mock-data/leave'

export function computeLeaveStats(requests = LEAVE_REQUESTS) {
  let pending = 0
  let approved = 0
  let rejected = 0
  for (const r of requests) {
    if (r.status === 'Pending') pending += 1
    else if (r.status === 'Approved') approved += 1
    else if (r.status === 'Rejected') rejected += 1
  }
  return {
    pending,
    approved,
    rejected,
    total: requests.length,
  }
}

export function getLeaveTabItems() {
  return [
    { key: 'requests', label: 'Requests', count: LEAVE_REQUESTS.length },
    { key: 'balances', label: 'Balances', count: LEAVE_BALANCES.length },
    { key: 'calendar', label: 'Calendar', count: 0 },
    { key: 'policies', label: 'Policies', count: LEAVE_POLICIES.length },
  ]
}

export function filterLeaveRequests(requests, { search = '', statusFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    if (!q) return true
    return (
      r.employeeName.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      (r.reason || '').toLowerCase().includes(q)
    )
  })
}

export function filterLeaveBalances(balances, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return balances
  return balances.filter(
    (b) =>
      b.employeeName.toLowerCase().includes(q) ||
      b.department.toLowerCase().includes(q) ||
      b.employeeId.toLowerCase().includes(q)
  )
}
