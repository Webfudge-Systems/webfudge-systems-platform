import {
  OPEN_JOBS,
  CANDIDATES,
  INTERVIEWS,
  OFFERS,
  PIPELINE_STAGES,
} from './mock-data/recruitment'

export function computeRecruitmentStats(
  jobs = OPEN_JOBS,
  candidates = CANDIDATES,
  interviews = INTERVIEWS,
  offers = OFFERS
) {
  const openJobs = jobs.filter((j) => j.status === 'Open').length
  const totalApplications = jobs.reduce((sum, j) => sum + j.applications, 0)
  const scheduledInterviews = interviews.filter((i) => i.status === 'Scheduled').length
  const activeOffers = offers.filter((o) => o.status === 'Sent' || o.status === 'Pending').length
  const inPipeline = candidates.filter((c) => c.stage !== 'Hired' && c.stage !== 'Rejected').length

  return {
    openJobs,
    totalJobs: jobs.length,
    totalCandidates: candidates.length,
    inPipeline,
    totalApplications,
    scheduledInterviews,
    activeOffers,
    hired: candidates.filter((c) => c.stage === 'Hired').length,
  }
}

export function getRecruitmentTabItems() {
  return [
    { key: 'jobs', label: 'Jobs', count: OPEN_JOBS.length },
    { key: 'pipeline', label: 'Pipeline', count: CANDIDATES.length },
    { key: 'candidates', label: 'Candidates', count: CANDIDATES.length },
    { key: 'interviews', label: 'Interviews', count: INTERVIEWS.length },
    { key: 'offers', label: 'Offers', count: OFFERS.length },
  ]
}

export function filterOpenJobs(jobs, { search = '', statusFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return jobs.filter((j) => {
    if (statusFilter && j.status !== statusFilter) return false
    if (!q) return true
    return (
      j.title.toLowerCase().includes(q) ||
      j.department.toLowerCase().includes(q) ||
      j.location.toLowerCase().includes(q)
    )
  })
}

export function filterCandidates(candidates, { search = '', stageFilter = '' } = {}) {
  const q = search.toLowerCase().trim()
  return candidates.filter((c) => {
    if (stageFilter && c.stage !== stageFilter) return false
    if (!q) return true
    return (
      c.name.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q) ||
      c.source.toLowerCase().includes(q) ||
      c.stage.toLowerCase().includes(q)
    )
  })
}

export function filterInterviews(interviews, search = '') {
  const q = search.toLowerCase().trim()
  const withIds = interviews.map((row, index) => ({ ...row, id: `int-${index}` }))
  if (!q) return withIds
  return withIds.filter(
    (i) =>
      i.candidate.toLowerCase().includes(q) ||
      i.role.toLowerCase().includes(q) ||
      i.interviewer.toLowerCase().includes(q) ||
      i.status.toLowerCase().includes(q)
  )
}

export function filterOffers(offers, search = '') {
  const q = search.toLowerCase().trim()
  const withIds = offers.map((row, index) => ({ ...row, id: `offer-${index}` }))
  if (!q) return withIds
  return withIds.filter(
    (o) =>
      o.candidate.toLowerCase().includes(q) ||
      o.role.toLowerCase().includes(q) ||
      o.status.toLowerCase().includes(q)
  )
}

export function getPipelineCandidates(candidates = CANDIDATES, search = '') {
  return filterCandidates(candidates, { search })
}

export { PIPELINE_STAGES }
