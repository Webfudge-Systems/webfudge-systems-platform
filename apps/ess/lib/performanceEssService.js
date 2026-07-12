import {

  PERFORMANCE_WORKSPACE_FIELDS,

  PERFORMANCE_WORKSPACE_UPDATED_EVENT,

  recordMatchesEmployee,

} from '@webfudge/utils/hrPerformance'



export const PERFORMANCE_ESS_UPDATED_EVENT = PERFORMANCE_WORKSPACE_UPDATED_EVENT



const GOALS_KEY = PERFORMANCE_WORKSPACE_FIELDS.goals

const APPRAISALS_KEY = PERFORMANCE_WORKSPACE_FIELDS.appraisals

const REVIEWS_KEY = PERFORMANCE_WORKSPACE_FIELDS.reviewCycles

const FEEDBACK_PENDING_KEY = PERFORMANCE_WORKSPACE_FIELDS.feedbackPending

const FEEDBACK_RECEIVED_KEY = PERFORMANCE_WORKSPACE_FIELDS.feedbackReceived

const PIPS_KEY = PERFORMANCE_WORKSPACE_FIELDS.pips



function readJson(key, fallback = []) {

  if (typeof window === 'undefined') return fallback

  try {

    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))

  } catch {

    return fallback

  }

}



function goalAvgProgress(goal) {

  const krs = goal.keyResults || []

  if (!krs.length) return 0

  return krs.reduce((sum, kr) => sum + Number(kr.progress || 0), 0) / krs.length

}



function resolveMembershipId(employee, membershipId) {

  return membershipId || employee?.membershipId || employee?.id || null

}



function normalizeDepartment(value = '') {

  return String(value || '').trim().toLowerCase()

}



export function listEmployeeGoals(employee, membershipId) {

  const custom = readJson(GOALS_KEY, [])

  const department = normalizeDepartment(employee?.department)

  const resolvedMembershipId = resolveMembershipId(employee, membershipId)



  return custom.filter((goal) => {

    const scope = String(goal.scope || 'company').toLowerCase()

    if (scope === 'company' || !scope) return true

    if (scope === 'department' && department) {

      return !goal.department || normalizeDepartment(goal.department) === department

    }

    if (scope === 'individual') {

      if (!employee && !resolvedMembershipId) return false

      return recordMatchesEmployee(goal, employee, resolvedMembershipId, {

        idFields: ['assigneeId', 'assigneeMembershipId'],

        nameFields: ['assigneeName'],

      })

    }

    return false

  })

}



export function listEmployeeReviewCycles() {

  return readJson(REVIEWS_KEY, [])

}



export function listEmployeeAppraisals(employee, membershipId) {

  const custom = readJson(APPRAISALS_KEY, [])

  const resolvedMembershipId = resolveMembershipId(employee, membershipId)

  return custom.filter((row) =>

    recordMatchesEmployee(row, employee, resolvedMembershipId, {

      idFields: ['employeeId', 'employeeMembershipId'],

      nameFields: ['employee'],

    }),

  )

}



export function listEmployeePips(employee, membershipId) {

  const custom = readJson(PIPS_KEY, [])

  const resolvedMembershipId = resolveMembershipId(employee, membershipId)

  return custom.filter((row) =>

    recordMatchesEmployee(row, employee, resolvedMembershipId, {

      idFields: ['employeeId', 'employeeMembershipId'],

      nameFields: ['employee'],

    }),

  )

}



export function listEmployeeReceivedFeedback(employee, membershipId) {

  const custom = readJson(FEEDBACK_RECEIVED_KEY, [])

  const resolvedMembershipId = resolveMembershipId(employee, membershipId)

  return custom.filter((row) =>

    recordMatchesEmployee(row, employee, resolvedMembershipId, {

      idFields: ['employeeId', 'employeeMembershipId'],

      nameFields: ['employeeName', 'employee'],

    }),

  )

}



export function listEmployeePendingFeedback(employee, membershipId) {

  const custom = readJson(FEEDBACK_PENDING_KEY, [])

  const resolvedMembershipId = resolveMembershipId(employee, membershipId)

  return custom.filter((row) =>

    recordMatchesEmployee(row, employee, resolvedMembershipId, {

      idFields: ['employeeId', 'employeeMembershipId'],

      nameFields: ['employeeName', 'employee'],

    }),

  )

}



export function computeEmployeePerformanceStats(employee, membershipId) {

  const goals = listEmployeeGoals(employee, membershipId)

  const cycles = listEmployeeReviewCycles()

  const appraisals = listEmployeeAppraisals(employee, membershipId)

  const pips = listEmployeePips(employee, membershipId)

  const pendingFeedback = listEmployeePendingFeedback(employee, membershipId)

  const activeCycle = cycles.find((c) => c.status === 'Active')

  const avgGoalProgress =

    goals.length > 0

      ? Math.round(goals.reduce((sum, g) => sum + goalAvgProgress(g), 0) / goals.length)

      : 0

  const myAppraisal = appraisals[0]



  return {

    activeCycleName: activeCycle?.name || '—',

    cycleCompletion: activeCycle?.completion ?? 0,

    goalCount: goals.length,

    avgGoalProgress,

    pendingFeedback: pendingFeedback.length,

    appraisalStatus: myAppraisal?.status || 'Not started',

    appraisalRating: myAppraisal?.rating ?? null,

    activePips: pips.filter((p) => p.status !== 'Terminated' && p.status !== 'Closed').length,

  }

}



export { goalAvgProgress }

