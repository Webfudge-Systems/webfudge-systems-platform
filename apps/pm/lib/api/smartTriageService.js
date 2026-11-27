/**
 * Smart triage + meeting → tasks (W20). Backend: /api/smart-triage/* (SaaS + Fudge AI only).
 */
import strapiClient from '../strapiClient'

const smartTriageService = {
  inbox: (params = {}) => strapiClient.get('/smart-triage/tasks', params),
  suggest: (taskIds, language) => strapiClient.post('/smart-triage/suggest', { taskIds, language }),
  apply: (items) => strapiClient.post('/smart-triage/apply', { items }),
  meetings: () => strapiClient.get('/smart-triage/meetings'),
  extract: (meetingId, notes, language) => strapiClient.post(`/smart-triage/meetings/${meetingId}/extract`, { notes, language }),
  createTasks: (meetingId, { projectId, taskListId, items }) =>
    strapiClient.post(`/smart-triage/meetings/${meetingId}/tasks`, { projectId, taskListId, items }),
}

/** Human message for AI errors (AI off / not configured) that are not plan limits. */
export function aiErrorMessage(e) {
  const code = e?.details?.code
  if (code === 'AI_DISABLED') return 'Fudge AI is not switched on for this workspace yet.'
  if (code === 'AI_NOT_CONFIGURED') return 'Fudge AI is not configured on this server (no AI provider key). Ask your admin to add one.'
  return e?.message || 'Fudge AI could not finish this request.'
}

export default smartTriageService
