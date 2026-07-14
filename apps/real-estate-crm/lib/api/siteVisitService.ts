// Site visit service — org-scoped `site-visit` endpoints.

import strapiClient from '../strapiClient'
import type { SiteVisit } from '../types'

export interface SiteVisitListResult {
  data: SiteVisit[]
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } }
}

const EMPTY_RESULT: SiteVisitListResult = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 50, pageCount: 1, total: 0 } },
}

const ENDPOINT = '/site-visits'

export async function listSiteVisits(
  options: { page?: number; pageSize?: number; lead?: string | number; project?: string | number } = {}
): Promise<SiteVisitListResult> {
  const { page = 1, pageSize = 50, lead, project } = options
  const query: Record<string, unknown> = {
    pagination: { page, pageSize },
    sort: 'scheduledAt:desc',
    populate: ['lead', 'project'],
  }
  const f: Record<string, unknown> = {}
  if (lead) f.lead = lead
  if (project) f.project = project
  if (Object.keys(f).length) query.filters = f
  try {
    return await strapiClient.get<SiteVisitListResult>(ENDPOINT, query)
  } catch {
    return EMPTY_RESULT
  }
}

export async function createSiteVisit(data: {
  lead?: string | number
  project?: string | number
  scheduledAt: string
  notes?: string
}) {
  return strapiClient.post(ENDPOINT, { data })
}

export async function updateSiteVisit(
  id: string | number,
  data: { scheduledAt?: string; completedAt?: string | null; outcome?: string; notes?: string }
) {
  return strapiClient.put(`${ENDPOINT}/${id}`, { data })
}

export async function deleteSiteVisit(id: string | number) {
  return strapiClient.delete(`${ENDPOINT}/${id}`)
}
