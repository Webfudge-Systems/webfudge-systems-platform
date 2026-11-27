import strapiClient from '../strapiClient'

/**
 * W16 AI project planner (SaaS). Generating returns a plan only; nothing is saved until create.
 * Errors carry `.status` and `.details` (e.g. details.code === 'AI_CREDITS_EXHAUSTED' → planErrorDetails).
 */

function apiError(status, body) {
  const err = new Error(body?.error?.message || `Request failed (${status})`)
  err.status = status
  err.details = body?.error?.details
  return err
}

/**
 * @param {{ brief?: string, file?: File, dealId?: string|number, startDate?: string, language?: string }} input
 * @returns {Promise<{ plan, source, language, model, creditsUsed, credits }>}
 */
async function generatePlan({ brief, file, dealId, startDate, language } = {}) {
  if (!file) {
    const res = await strapiClient.post('/projects/ai-plan', { brief, dealId, startDate, language })
    return res?.data
  }
  // Multipart upload: the shared client always sends JSON, so post the form directly.
  const form = new FormData()
  form.append('document', file, file.name)
  if (brief) form.append('brief', brief)
  if (dealId) form.append('dealId', String(dealId))
  if (startDate) form.append('startDate', startDate)
  if (language) form.append('language', language)
  const token = strapiClient.getToken()
  const orgId = strapiClient.getCurrentOrgId()
  const res = await fetch(`${strapiClient.baseURL}/api/projects/ai-plan`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(orgId ? { 'X-Organization-Id': orgId } : {}),
    },
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw apiError(res.status, body)
  return body?.data
}

/** Create a project from the edited plan. */
async function createProject({ plan, project, roleAssignments }) {
  return strapiClient.post('/projects/ai-plan/create', { data: { plan, project, roleAssignments } })
}

/** Deal handoff: create the won deal's delivery project from the edited plan (links the deal, drafts invoices). */
async function createDealProject(dealId, { plan, projectName, startDate, roleAssignments, invoicePlan }) {
  return strapiClient.post(`/deals/${encodeURIComponent(dealId)}/delivery-project`, {
    data: { aiPlan: plan, projectName, startDate, roleAssignments, invoicePlan },
  })
}

const aiPlannerService = { generatePlan, createProject, createDealProject }
export default aiPlannerService
