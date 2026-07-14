// Org member lookup for assignment dropdowns — same endpoint the CRM uses.

import strapiClient from '../strapiClient'
import type { OrgUser } from '../types'

export async function listOrgUsers(): Promise<OrgUser[]> {
  const orgId = strapiClient.getCurrentOrgId()
  if (!orgId) return []
  try {
    const res = await strapiClient.get<{ data: OrgUser[] }>(`/organizations/${orgId}/users`)
    return Array.isArray(res?.data) ? res.data : []
  } catch {
    return []
  }
}

export function userLabel(user: OrgUser | null | undefined): string {
  if (!user) return 'Unassigned'
  const name = [user.firstName, user.lastName].filter(Boolean).join(' ')
  return name || user.username || user.email || `User ${user.id}`
}
