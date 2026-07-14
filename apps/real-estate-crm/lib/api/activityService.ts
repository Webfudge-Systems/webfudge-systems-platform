// Lead activity service — immutable timeline (`lead-activity` endpoints).

import strapiClient from '../strapiClient'
import type { LeadActivity } from '../types'

const ENDPOINT = '/lead-activities'

export async function listLeadActivities(leadId: string | number): Promise<LeadActivity[]> {
  try {
    const res = await strapiClient.get<{ data: LeadActivity[] }>(ENDPOINT, {
      filters: { lead: leadId },
      sort: 'createdAt:desc',
      pagination: { page: 1, pageSize: 100 },
    })
    return res?.data ?? []
  } catch {
    return []
  }
}

export async function logActivity(
  leadId: string | number,
  type: string,
  payload: Record<string, unknown> = {}
) {
  return strapiClient.post(ENDPOINT, { data: { lead: leadId, type, payload } })
}
