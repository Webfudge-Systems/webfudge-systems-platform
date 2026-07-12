import { formatExpenseAmountK, getExpenseCategoryLabel, getExpenseCategoryOptions } from './expensesShared'

export function computeExpenseStats(claims = []) {
  let pending = 0
  let approved = 0
  let rejected = 0
  let paid = 0
  let pendingAmount = 0
  let approvedAmount = 0
  let rejectedAmount = 0
  let paidAmount = 0
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
      paidAmount += c.amount
    }
  }

  return {
    pending,
    approved,
    rejected,
    paid,
    total: claims.length,
    pendingAmount,
    approvedAmount,
    rejectedAmount,
    paidAmount,
    claimedAmount,
    claimedLabel: formatExpenseAmountK(claimedAmount),
    approvedLabel: formatExpenseAmountK(approvedAmount),
    pendingLabel: formatExpenseAmountK(pendingAmount),
    rejectedLabel: formatExpenseAmountK(rejectedAmount),
  }
}

export function computePayoutStats(payouts = []) {
  let scheduled = 0
  let completed = 0
  let scheduledAmount = 0
  let completedAmount = 0

  for (const p of payouts) {
    if (p.status === 'Scheduled') {
      scheduled += 1
      scheduledAmount += p.amount
    } else if (p.status === 'Completed') {
      completed += 1
      completedAmount += p.amount
    }
  }

  return {
    total: payouts.length,
    scheduled,
    completed,
    scheduledAmount,
    completedAmount,
    totalValueAmount: scheduledAmount + completedAmount,
    scheduledLabel: formatExpenseAmountK(scheduledAmount),
    completedLabel: formatExpenseAmountK(completedAmount),
    totalValueLabel: formatExpenseAmountK(scheduledAmount + completedAmount),
  }
}

export function getExpenseClaimsTabItems(claims = []) {
  const stats = computeExpenseStats(claims)
  return [
    { key: 'all', label: 'All Claims', count: stats.total },
    { key: 'pending', label: 'Pending', count: stats.pending },
    { key: 'approved', label: 'Approved', count: stats.approved },
    { key: 'rejected', label: 'Rejected', count: stats.rejected },
    { key: 'paid', label: 'Paid', count: stats.paid },
  ]
}

export function getExpenseApprovalsTabItems(claims = []) {
  const pending = claims.filter((c) => c.status === 'Pending')
  const travel = pending.filter((c) => c.category === 'travel')
  const food = pending.filter((c) => ['meals', 'office'].includes(c.category))
  const other = pending.length - travel.length - food.length
  return [
    { key: 'all', label: 'All Pending', count: pending.length },
    { key: 'travel', label: 'Travel', count: travel.length },
    { key: 'food', label: 'Food', count: food.length },
    { key: 'other', label: 'Other', count: Math.max(0, other) },
  ]
}

export function getExpenseReportsTabItems(claims = []) {
  const categories = new Set(claims.map((claim) => claim.category).filter(Boolean))
  const employees = new Set(claims.map((claim) => claim.employee).filter(Boolean))
  return [
    { key: 'overview', label: 'Overview', count: claims.length },
    { key: 'category', label: 'By Category', count: categories.size },
    { key: 'employee', label: 'By Employee', count: employees.size },
  ]
}

export function getClaimPeriodDate(claim) {
  if (claim?.submitted) return String(claim.submitted).slice(0, 10)
  if (claim?.createdAt) return String(claim.createdAt).slice(0, 10)
  return ''
}

export function filterClaimsByMonth(claims, monthValue) {
  if (!monthValue) return claims
  return claims.filter((claim) => getClaimPeriodDate(claim).startsWith(monthValue))
}

export function buildStatusChart(claims = []) {
  const totals = { Pending: 0, Approved: 0, Rejected: 0, Paid: 0 }
  for (const claim of claims) {
    if (totals[claim.status] !== undefined) {
      totals[claim.status] += claim.amount || 0
    }
  }
  return Object.entries(totals).map(([name, value]) => ({ name, value }))
}

export function buildExpenseClaimsCsv(claims = []) {
  const escape = (value) => {
    const s = String(value ?? '')
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const header = ['Claim #', 'Employee', 'Category', 'Amount', 'Date', 'Status', 'Receipt', 'Description']
  const lines = claims.map((claim) =>
    [
      claim.expenseNumber || claim.id,
      claim.employee,
      claim.categoryLabel || claim.category,
      claim.amount,
      getClaimPeriodDate(claim),
      claim.status,
      claim.receipt ? 'Yes' : 'No',
      claim.description || '',
    ]
      .map(escape)
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

export function downloadExpenseReportCsv(claims, filename = 'expense-report.csv') {
  if (typeof window === 'undefined') return
  const content = buildExpenseClaimsCsv(claims)
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function getExpensePayoutsTabItems(payouts = []) {
  const stats = computePayoutStats(payouts)
  return [
    { key: 'all', label: 'All Payouts', count: stats.total },
    { key: 'scheduled', label: 'Scheduled', count: stats.scheduled },
    { key: 'completed', label: 'Completed', count: stats.completed },
  ]
}

export function matchesExpenseClaimsTab(claim, tab) {
  if (tab === 'all') return true
  if (tab === 'pending') return claim.status === 'Pending'
  if (tab === 'approved') return claim.status === 'Approved'
  if (tab === 'rejected') return claim.status === 'Rejected'
  if (tab === 'paid') return claim.status === 'Paid'
  return true
}

export function matchesExpenseApprovalsTab(claim, tab) {
  if (claim.status !== 'Pending') return false
  if (tab === 'all') return true
  if (tab === 'travel') return claim.category === 'travel'
  if (tab === 'food') return ['meals', 'office'].includes(claim.category)
  if (tab === 'other') return claim.category !== 'travel' && !['meals', 'office'].includes(claim.category)
  return true
}

export function matchesExpensePayoutsTab(payout, tab) {
  if (tab === 'all') return true
  if (tab === 'scheduled') return payout.status === 'Scheduled'
  if (tab === 'completed') return payout.status === 'Completed'
  return true
}

export function filterExpenseClaims(claims, { search = '', statusFilter = '', categoryFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return claims.filter((c) => {
    if (statusFilter && c.status !== statusFilter) return false
    if (categoryFilter && c.category !== categoryFilter) return false
    if (!q) return true
    const categoryLabel = c.categoryLabel || getExpenseCategoryLabel(c.category)
    return (
      c.employee.toLowerCase().includes(q) ||
      categoryLabel.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.expenseNumber || '').toLowerCase().includes(q)
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
      p.status.toLowerCase().includes(q) ||
      (p.reference || '').toLowerCase().includes(q) ||
      (p.expenseNumber || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q),
  )
}

export function getExpenseCategories() {
  return getExpenseCategoryOptions().map((item) => item.value)
}

export function buildEmployeeSpendRows(claims = []) {
  const byEmployee = {}
  for (const claim of claims) {
    const name = claim.employee || 'Unknown'
    if (!byEmployee[name]) {
      byEmployee[name] = { employee: name, total: 0, claims: 0, pending: 0 }
    }
    byEmployee[name].total += claim.amount || 0
    byEmployee[name].claims += 1
    if (claim.status === 'Pending') byEmployee[name].pending += 1
  }
  return Object.values(byEmployee).sort((a, b) => b.total - a.total)
}

export function expenseClaimSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.employee || ''
    case 'category':
      return row.categoryLabel || row.category || ''
    case 'amount':
      return row.amount || 0
    case 'submitted':
      return row.submitted || ''
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}

export function expensePayoutSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.employee || ''
    case 'amount':
      return row.amount || 0
    case 'method':
      return row.method || ''
    case 'scheduled':
      return row.scheduled || ''
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}
