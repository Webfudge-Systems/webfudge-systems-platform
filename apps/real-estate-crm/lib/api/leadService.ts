// Lead service — org-scoped `real-estate-lead` endpoints (Stage 2 backend).

import strapiClient from '../strapiClient'
import type { RealEstateLead, LeadStatus } from '../types'

export interface LeadListResult {
  data: RealEstateLead[]
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } }
}

export interface LeadFilters {
  tier?: string
  status?: string
  source?: string
  project?: string | number
  assignedTo?: string | number
  /** Free-text search over name/phone/email. */
  q?: string
  /** ISO date strings. */
  createdFrom?: string
  createdTo?: string
}

const EMPTY_RESULT: LeadListResult = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 25, pageCount: 1, total: 0 } },
}

const ENDPOINT = '/real-estate-leads'

export async function listLeads(
  options: {
    page?: number
    pageSize?: number
    sort?: string
    filters?: LeadFilters
  } = {}
): Promise<LeadListResult> {
  const { page = 1, pageSize = 25, sort = 'score:desc', filters = {} } = options
  const query: Record<string, unknown> = {
    sort,
    pagination: { page, pageSize },
  }
  const f: Record<string, unknown> = {}
  if (filters.tier) f.tier = filters.tier
  if (filters.status) f.status = filters.status
  if (filters.source) f.source = filters.source
  if (filters.project) f.project = filters.project
  if (filters.assignedTo) f.assignedTo = filters.assignedTo
  if (filters.q) f.q = filters.q
  if (filters.createdFrom || filters.createdTo) {
    f.createdAt = {
      ...(filters.createdFrom && { $gte: filters.createdFrom }),
      ...(filters.createdTo && { $lte: filters.createdTo }),
    }
  }
  if (Object.keys(f).length) query.filters = f

  try {
    return await strapiClient.get<LeadListResult>(ENDPOINT, query)
  } catch {
    return EMPTY_RESULT
  }
}

export async function getLead(id: string | number): Promise<RealEstateLead | null> {
  try {
    const res = await strapiClient.get<{ data: RealEstateLead }>(`${ENDPOINT}/${id}`, {
      populate: ['assignedTo', 'project'],
    })
    return res?.data ?? null
  } catch {
    return null
  }
}

export async function createLead(
  data: Partial<Omit<RealEstateLead, 'project' | 'assignedTo'>> & { project?: unknown; assignedTo?: unknown }
) {
  return strapiClient.post(`${ENDPOINT}`, { data })
}

export async function updateLead(
  id: string | number,
  data: Partial<Omit<RealEstateLead, 'project' | 'assignedTo'>> & { project?: unknown; assignedTo?: unknown }
) {
  return strapiClient.put(`${ENDPOINT}/${id}`, { data })
}

export async function updateLeadStatus(id: string | number, status: LeadStatus) {
  return updateLead(id, { status })
}

export async function deleteLead(id: string | number) {
  return strapiClient.delete(`${ENDPOINT}/${id}`)
}

/** Bulk helpers for list-page actions. Sequential to respect controller-side checks. */
export async function bulkUpdateStatus(ids: Array<string | number>, status: LeadStatus) {
  const results = await Promise.allSettled(ids.map((id) => updateLeadStatus(id, status)))
  return results.filter((r) => r.status === 'fulfilled').length
}

export async function bulkAssign(ids: Array<string | number>, userId: number) {
  const results = await Promise.allSettled(ids.map((id) => updateLead(id, { assignedTo: userId })))
  return results.filter((r) => r.status === 'fulfilled').length
}
