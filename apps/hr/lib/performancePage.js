export function computePerformanceStats(
  cycles = [],
  appraisals = [],
  pips = [],
  okrs = [],
  pending = []
) {
  const activeCycle = cycles.find((c) => c.status === 'Active')
  const pendingAppraisals = appraisals.filter((a) => a.status === 'Pending').length
  const activePips = pips.filter((p) => p.status !== 'Terminated' && p.status !== 'Closed').length
  const krCount = okrs.reduce((sum, o) => sum + o.keyResults.length, 0)

  return {
    activeCycleName: activeCycle?.name ?? '—',
    cycleCompletion: activeCycle?.completion ?? 0,
    okrCount: okrs.length,
    krCount,
    pendingAppraisals,
    totalAppraisals: appraisals.length,
    activePips,
    totalPips: pips.length,
    pendingFeedback: pending.length,
  }
}

function objectiveAvgProgress(okr) {
  if (!okr.keyResults?.length) return 0
  return okr.keyResults.reduce((sum, keyResult) => sum + keyResult.progress, 0) / okr.keyResults.length
}

export function getGoalsTabItems(okrs = []) {
  const onTrack = okrs.filter((okr) => objectiveAvgProgress(okr) >= 50).length
  const atRisk = okrs.filter((okr) => objectiveAvgProgress(okr) < 50).length
  return [
    { key: 'all', label: 'All Goals', count: okrs.length },
    { key: 'on-track', label: 'On Track', count: onTrack },
    { key: 'at-risk', label: 'At Risk', count: atRisk },
  ]
}

export function matchesGoalsTab(okr, tabKey) {
  if (tabKey === 'all') return true
  const avg = objectiveAvgProgress(okr)
  if (tabKey === 'on-track') return avg >= 50
  if (tabKey === 'at-risk') return avg < 50
  return true
}

export function getGoalAverageProgress(okr) {
  return Math.round(objectiveAvgProgress(okr))
}

export function getGoalScopeLabel(okr) {
  if (okr.scope === 'department' && okr.department) return okr.department
  if (okr.scope === 'individual') return okr.assigneeName ? `Individual · ${okr.assigneeName}` : 'Individual'
  return 'Company'
}

export function getKeyResultStatusLabel(progress) {
  const value = Number(progress || 0)
  if (value >= 90) return 'Nearly complete'
  if (value >= 50) return 'On track'
  return 'Needs attention'
}

export function goalSortValue(row, key) {
  switch (key) {
    case 'objective':
      return row.objective || ''
    case 'scope':
      return getGoalScopeLabel(row)
    case 'progress':
      return getGoalAverageProgress(row)
    case 'keyResults':
      return row.keyResults?.length ?? 0
    case 'status':
      return getGoalAverageProgress(row) >= 50 ? 'on-track' : 'at-risk'
    default:
      return row[key]
  }
}

export function computeReviewStats(cycles = []) {
  const activeCycles = cycles.filter((cycle) => cycle.status === 'Active')
  const closedCycles = cycles.filter((cycle) => cycle.status === 'Closed')
  const avgCompletion = cycles.length
    ? Math.round(cycles.reduce((sum, cycle) => sum + (cycle.completion || 0), 0) / cycles.length)
    : 0
  const activeCycle = activeCycles[0]

  return {
    totalCycles: cycles.length,
    activeCount: activeCycles.length,
    closedCount: closedCycles.length,
    avgCompletion,
    activeCycleName: activeCycle?.name ?? '—',
    activeCycleCompletion: activeCycle?.completion ?? 0,
  }
}

export function getReviewTabItems(cycles = []) {
  const active = cycles.filter((cycle) => cycle.status === 'Active').length
  const closed = cycles.filter((cycle) => cycle.status === 'Closed').length
  return [
    { key: 'all', label: 'All Cycles', count: cycles.length },
    { key: 'active', label: 'Active', count: active },
    { key: 'closed', label: 'Closed', count: closed },
  ]
}

export function matchesReviewTab(row, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'active') return row.status === 'Active'
  if (tabKey === 'closed') return row.status === 'Closed'
  return true
}

export function getFeedbackTabItems(
  pending = [],
  received = []
) {
  return [
    { key: 'pending', label: 'Pending', count: pending.length },
    { key: 'received', label: 'Received', count: received.length },
  ]
}

export function computeFeedbackStats(pending = [], received = []) {
  const peerPending = pending.filter((row) => row.type === 'Peer').length
  const managerPending = pending.filter((row) => row.type === 'Manager').length
  const nextDue = [...pending]
    .filter((row) => row.due)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)))[0]

  const formatShortDate = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return {
    pendingCount: pending.length,
    receivedCount: received.length,
    peerPending,
    managerPending,
    nextDueLabel: nextDue?.label ?? '—',
    nextDueDate: formatShortDate(nextDue?.due),
  }
}

export function filterPendingFeedback(rows, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return rows
  return rows.filter(
    (row) =>
      row.label.toLowerCase().includes(q) ||
      (row.reviewCycle || '').toLowerCase().includes(q) ||
      (row.type || '').toLowerCase().includes(q)
  )
}

export function filterReceivedFeedback(rows, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return rows
  return rows.filter(
    (row) =>
      row.quote.toLowerCase().includes(q) ||
      (row.period || '').toLowerCase().includes(q) ||
      (row.type || '').toLowerCase().includes(q)
  )
}

export function pendingFeedbackSortValue(row, key) {
  switch (key) {
    case 'label':
      return row.label || ''
    case 'due':
      return row.due || ''
    case 'type':
      return row.type || ''
    case 'reviewCycle':
      return row.reviewCycle || ''
    default:
      return row[key]
  }
}

export function receivedFeedbackSortValue(row, key) {
  switch (key) {
    case 'quote':
      return row.quote || ''
    case 'period':
      return row.period || ''
    case 'type':
      return row.type || ''
    default:
      return row[key]
  }
}

export function computeAppraisalStats(appraisals = []) {
  const pending = appraisals.filter((row) => row.status === 'Pending')
  const approved = appraisals.filter((row) => row.status === 'Approved')
  const avgRating = appraisals.length
    ? (appraisals.reduce((sum, row) => sum + Number(row.rating || 0), 0) / appraisals.length).toFixed(1)
    : '0'
  const avgRevision = appraisals.length
    ? Math.round(appraisals.reduce((sum, row) => sum + Number(row.revision || 0), 0) / appraisals.length)
    : 0
  const promotions = appraisals.filter((row) => row.promotion === 'Yes').length

  return {
    totalAppraisals: appraisals.length,
    pendingCount: pending.length,
    approvedCount: approved.length,
    avgRating,
    avgRevision,
    promotionCount: promotions,
  }
}

export function getAppraisalTabItems(appraisals = []) {
  const pending = appraisals.filter((row) => row.status === 'Pending').length
  const approved = appraisals.filter((row) => row.status === 'Approved').length
  return [
    { key: 'all', label: 'All Appraisals', count: appraisals.length },
    { key: 'pending', label: 'Pending', count: pending },
    { key: 'approved', label: 'Approved', count: approved },
  ]
}

export function matchesAppraisalTab(row, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'pending') return row.status === 'Pending'
  if (tabKey === 'approved') return row.status === 'Approved'
  return true
}

export function parsePipMilestonePercent(milestones) {
  if (!milestones) return 0
  const match = String(milestones).match(/(\d+)\s*\/\s*(\d+)/)
  if (!match) return 0
  const completed = Number(match[1])
  const total = Number(match[2])
  if (!total) return 0
  return Math.round((completed / total) * 100)
}

export function computePipStats(pips = []) {
  const active = pips.filter((row) => row.status !== 'Terminated' && row.status !== 'Closed')
  const closed = pips.filter((row) => row.status === 'Closed')
  const terminated = pips.filter((row) => row.status === 'Terminated')
  const avgMilestoneCompletion = pips.length
    ? Math.round(
        pips.reduce((sum, row) => sum + parsePipMilestonePercent(row.milestones), 0) / pips.length,
      )
    : 0

  return {
    totalPips: pips.length,
    activeCount: active.length,
    closedCount: closed.length,
    terminatedCount: terminated.length,
    avgMilestoneCompletion,
  }
}

export function getPipTabItems(pips = []) {
  const active = pips.filter((row) => row.status !== 'Terminated' && row.status !== 'Closed').length
  const closed = pips.filter((row) => row.status === 'Terminated' || row.status === 'Closed').length
  return [
    { key: 'all', label: 'All PIPs', count: pips.length },
    { key: 'active', label: 'Active', count: active },
    { key: 'closed', label: 'Closed', count: closed },
  ]
}

export function matchesPipTab(row, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'active') return row.status !== 'Terminated' && row.status !== 'Closed'
  if (tabKey === 'closed') return row.status === 'Terminated' || row.status === 'Closed'
  return true
}

export function filterReviewCycles(cycles, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return cycles
  return cycles.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.period.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
  )
}

export function filterAppraisals(appraisals, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return appraisals
  return appraisals.filter(
    (row) =>
      row.employee.toLowerCase().includes(q) ||
      (row.department || '').toLowerCase().includes(q) ||
      (row.status || '').toLowerCase().includes(q)
  )
}

export function filterPips(pips, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return pips.map((row, index) => ({ ...row, id: `pip-${index}` }))
  return pips
    .map((row, index) => ({ ...row, id: `pip-${index}` }))
    .filter(
      (p) =>
        p.employee.toLowerCase().includes(q) ||
        p.manager.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
    )
}

export function reviewCycleSortValue(row, key) {
  switch (key) {
    case 'name':
      return row.name || ''
    case 'due':
      return row.due || ''
    case 'completion':
      return row.completion ?? 0
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}

export function appraisalSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.employee || ''
    case 'department':
      return row.department || ''
    case 'rating':
      return row.rating ?? 0
    case 'revision':
      return row.revision ?? 0
    case 'promotion':
      return row.promotion || ''
    case 'effective':
      return row.effective || ''
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}

export function pipSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.employee || ''
    case 'manager':
      return row.manager || ''
    case 'start':
      return row.start || ''
    case 'duration':
      return row.duration || ''
    case 'milestones':
      return row.milestones || ''
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}
