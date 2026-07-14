// Project service — org-scoped `real-estate-project` endpoints.

import strapiClient from '../strapiClient'
import type { RealEstateProject } from '../types'

export interface ProjectListResult {
  data: RealEstateProject[]
  meta: { pagination: { page: number; pageSize: number; pageCount: number; total: number } }
}

const EMPTY_RESULT: ProjectListResult = {
  data: [],
  meta: { pagination: { page: 1, pageSize: 100, pageCount: 1, total: 0 } },
}

const ENDPOINT = '/real-estate-projects'

export async function listProjects(
  options: { page?: number; pageSize?: number; status?: string } = {}
): Promise<ProjectListResult> {
  const { page = 1, pageSize = 100, status } = options
  const query: Record<string, unknown> = { pagination: { page, pageSize }, sort: 'createdAt:desc' }
  if (status) query.filters = { status }
  try {
    return await strapiClient.get<ProjectListResult>(ENDPOINT, query)
  } catch {
    return EMPTY_RESULT
  }
}

export interface ProjectActivity {
  id: number | string
  action: 'create' | 'update' | 'delete' | 'comment'
  subjectType: string
  subjectId: number
  summary: string
  meta?: { changes?: { key: string; label: string; before: string; after: string }[] } | null
  actor?: { id: number; username?: string; email?: string } | null
  createdAt: string
}

export async function listProjectActivities(
  id: string | number,
  limit = 50
): Promise<ProjectActivity[]> {
  try {
    const res = await strapiClient.get<{ data: ProjectActivity[] }>(
      `${ENDPOINT}/${id}/activities`,
      { limit }
    )
    return res?.data ?? []
  } catch {
    return []
  }
}

export async function getProject(id: string | number): Promise<RealEstateProject | null> {
  try {
    const res = await strapiClient.get<{ data: RealEstateProject }>(`${ENDPOINT}/${id}`)
    return res?.data ?? null
  } catch {
    return null
  }
}

export async function createProject(data: Partial<RealEstateProject>) {
  return strapiClient.post(ENDPOINT, { data })
}

export async function updateProject(id: string | number, data: Partial<RealEstateProject>) {
  return strapiClient.put(`${ENDPOINT}/${id}`, { data })
}

export async function deleteProject(id: string | number) {
  return strapiClient.delete(`${ENDPOINT}/${id}`)
}
