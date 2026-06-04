import { EXPENSE_CLAIMS, EXPENSE_PAYOUTS } from './mock-data/expenses'

export const EXPENSE_CATEGORY_CHART = [
  { cat: 'Travel', amount: 39800 },
  { cat: 'Food', amount: 1270 },
  { cat: 'Client', amount: 5600 },
  { cat: 'Supplies', amount: 4300 },
]

export function computeExpenseStats(claims = EXPENSE_CLAIMS) {
  let pending = 0
  let approved = 0
  let rejected = 0
  let paid = 0
  let pendingAmount = 0
  let approvedAmount = 0
  let rejectedAmount = 0
  let claimedAmount = 0

  for (const c of claims) {
    claimedAmount += c.amount
    if (c.status === 'Pending') {
      pending += 1
      pendingAmount += c.amount
    } else if (c.status === 'Approved') {
      approved += 1
      approvedAmount += c.amount
    } else if (c.status === 'Rejected') {
      rejected += 1
      rejectedAmount += c.amount
    } else if (c.status === 'Paid') {
      paid += 1
    }
  }

  const formatK = (n) =>
    n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n.toLocaleString('en-IN')}`

  return {
    pending,
    approved,
    rejected,
    paid,
    total: claims.length,
    pendingAmount,
    approvedAmount,
    rejectedAmount,
    claimedAmount,
    claimedLabel: formatK(claimedAmount),
    approvedLabel: formatK(approvedAmount),
    pendingLabel: formatK(pendingAmount),
    rejectedLabel: formatK(rejectedAmount),
  }
}

export function getExpenseTabItems() {
  const pendingApprovals = EXPENSE_CLAIMS.filter((c) => c.status === 'Pending').length
  return [
    { key: 'claims', label: 'Claims', count: EXPENSE_CLAIMS.length },
    { key: 'approvals', label: 'Approvals', count: pendingApprovals },
    { key: 'reports', label: 'Reports', count: 0 },
    { key: 'payouts', label: 'Payouts', count: EXPENSE_PAYOUTS.length },
  ]
}

export function filterExpenseClaims(claims, { search = '', statusFilter = '', categoryFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return claims.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false
    if (categoryFilter && c.category !== categoryFilter) return false
    if (!q) return true
    return (
      c.employee.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q)
    )
  })
}

export function filterExpensePayouts(payouts, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return payouts
  return payouts.filter(
    (p) =>
      p.employee.toLowerCase().includes(q) ||
      p.method.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
  )
}

export function getExpenseCategories(claims = EXPENSE_CLAIMS) {
  return [...new Set(claims.map((c) => c.category))].sort()
}
