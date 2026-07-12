import { DEFAULT_LEAVE_POLICIES } from './leaveShared'

export function computeLeaveStats(requests = []) {
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

export function getLeaveTabItems({
  requests = [],
  balances = [],
  policies = DEFAULT_LEAVE_POLICIES,
  calendarCount = 0,
} = {}) {
  const policyRows = policies.filter((policy) => policy.type !== 'WFH')
  const approvedTabCount = requests.filter(
    (request) => request.status === 'Approved' || request.status === 'Rejected',
  ).length
  return [
    { key: 'requests', label: 'Requests', count: requests.length },
    { key: 'approved', label: 'Approved', count: approvedTabCount },
    { key: 'balances', label: 'Balances', count: balances.length },
    { key: 'calendar', label: 'Calendar', count: calendarCount },
    { key: 'policies', label: 'Policies', count: policyRows.length },
  ]
}

export function filterLeaveRequests(requests, { search = '', statusFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return requests.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    if (!q) return true
    return (
      (r.employeeName || '').toLowerCase().includes(q) ||
      (r.type || '').toLowerCase().includes(q) ||
      (r.reason || '').toLowerCase().includes(q) ||
      (r.employeeCode || '').toLowerCase().includes(q)
    )
  })
}

export function filterApprovedTabLeaveRequests(requests, { search = '' } = {}) {
  return filterLeaveRequests(
    requests.filter((request) => request.status === 'Approved' || request.status === 'Rejected'),
    { search },
  )
}

export function filterLeaveBalances(balances, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return balances
  return balances.filter(
    (b) =>
      (b.employeeName || '').toLowerCase().includes(q) ||
      (b.department || '').toLowerCase().includes(q) ||
      (b.employeeId || '').toLowerCase().includes(q) ||
      (b.employeeCode || '').toLowerCase().includes(q),
  )
}

export function filterLeavePolicies(policies = [], search = '') {
  const q = search.toLowerCase().trim()
  const rows = policies.filter((policy) => policy.type !== 'WFH')
  if (!q) return rows
  return rows.filter(
    (policy) =>
      (policy.name || '').toLowerCase().includes(q) ||
      (policy.type || '').toLowerCase().includes(q),
  )
}

export function leaveRequestSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.employeeName || ''
    case 'type':
      return row.type || ''
    case 'from':
      return row.from || ''
    case 'to':
      return row.to || ''
    case 'days':
      return Number(row.days || 0)
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}

export function leaveBalanceSortValue(row, key) {
  if (key === 'employee') return row.employeeName || ''
  return Number(row.used?.[key] ?? row[key] ?? 0)
}

export function leavePolicySortValue(row, key) {
  switch (key) {
    case 'name':
      return row.name || ''
    case 'type':
      return row.type || ''
    case 'entitlement':
      return Number(row.entitlement || 0)
    case 'carryForward':
      return Number(row.carryForward || 0)
    case 'encashable':
      return row.encashable ? 1 : 0
    default:
      return row[key]
  }
}
