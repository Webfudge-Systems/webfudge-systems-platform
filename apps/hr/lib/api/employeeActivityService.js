'use client'

import strapiClient from '../strapiClient'

export async function fetchEmployeeActivityTimeline({ organizationUserId, limit = 80 } = {}) {
  if (organizationUserId == null || String(organizationUserId).trim() === '') {
    return { data: [], total: 0 }
  }
  const res = await strapiClient.get('/crm-activities/timeline', {
    organizationUserId,
    limit,
  })
  const data = Array.isArray(res?.data) ? res.data : []
  const total = typeof res?.meta?.total === 'number' ? res.meta.total : data.length
  return { data, total }
}

export async function fetchEmployeeCrossAppActivity({ userId, limit = 80 } = {}) {
  if (userId == null || String(userId).trim() === '') {
    return { data: [], total: 0 }
  }
  const res = await strapiClient.get('/crm-activities/feed', {
    actorUserId: userId,
    limit,
    start: 0,
  })
  const data = Array.isArray(res?.data) ? res.data : []
  const total = typeof res?.meta?.total === 'number' ? res.meta.total : data.length
  return { data, total }
}
