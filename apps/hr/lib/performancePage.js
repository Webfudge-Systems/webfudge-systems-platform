import { COMPANY_OKRS, REVIEW_CYCLES, APPRAISALS, PIPS } from './mock-data/performance'

export const PENDING_FEEDBACK = [
  { id: 'fb-1', label: 'Peer review for Ankit Sharma', due: '2026-06-10' },
  { id: 'fb-2', label: 'Manager review for Priya Nair', due: '2026-06-12' },
]

export const RECEIVED_FEEDBACK = [
  { id: 'rf-1', quote: 'Strong technical leadership on the payments project.', period: 'Q1 2026' },
  { id: 'rf-2', quote: 'Excellent collaboration with cross-functional teams.', period: 'Q1 2026' },
]

export function computePerformanceStats(
  cycles = REVIEW_CYCLES,
  appraisals = APPRAISALS,
  pips = PIPS,
  okrs = COMPANY_OKRS
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
    pendingFeedback: PENDING_FEEDBACK.length,
  }
}

export function getPerformanceTabItems() {
  return [
    { key: 'goals', label: 'Goals', count: COMPANY_OKRS.length },
    { key: 'reviews', label: 'Reviews', count: REVIEW_CYCLES.length },
    { key: 'feedback', label: 'Feedback', count: PENDING_FEEDBACK.length },
    { key: 'appraisals', label: 'Appraisals', count: APPRAISALS.length },
    { key: 'pips', label: 'PIPs', count: PIPS.length },
  ]
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

export function filterAppraisals(appraisals, { search = '', statusFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return appraisals.map((row, index) => ({ ...row, id: `apr-${index}` })).filter((a) => {
    if (statusFilter && a.status !== statusFilter) return false
    if (!q) return true
    return (
      a.employee.toLowerCase().includes(q) ||
      a.department.toLowerCase().includes(q) ||
      a.status.toLowerCase().includes(q)
    )
  })
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
