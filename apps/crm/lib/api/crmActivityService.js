/**
 * CRM activity timeline (Strapi /api/crm-activities/timeline).
 */
import strapiClient from '../strapiClient';

/**
 * @param {{ contactId?: string|number, leadCompanyId?: string|number, limit?: number }} opts
 * @returns {Promise<{ data: object[], total: number }>}
 */
export async function fetchActivityTimeline({ contactId, leadCompanyId, limit = 80 } = {}) {
  const params = { limit };
  if (contactId != null && String(contactId).trim() !== '') {
    params.contactId = contactId;
  }
  if (leadCompanyId != null && String(leadCompanyId).trim() !== '') {
    params.leadCompanyId = leadCompanyId;
  }
  const res = await strapiClient.get('/crm-activities/timeline', params);
  const data = Array.isArray(res?.data) ? res.data : [];
  const total = typeof res?.meta?.total === 'number' ? res.meta.total : data.length;
  return { data, total };
}

/**
 * @param {{ leadCompanyId: string|number, limit?: number }} opts
 * @returns {Promise<{ data: object[], total: number }>}
 */
export async function fetchLeadCompanyComments({ leadCompanyId, limit = 30 } = {}) {
  if (leadCompanyId == null || String(leadCompanyId).trim() === '') {
    return { data: [], total: 0 };
  }
  const res = await strapiClient.get('/crm-activities/timeline', {
    leadCompanyId,
    limit,
    type: 'comment',
  });
  const data = Array.isArray(res?.data) ? res.data : [];
  const total = typeof res?.meta?.total === 'number' ? res.meta.total : data.length;
  return { data, total };
}

/**
 * @param {{ leadCompanyId: string|number, comment: string }} opts
 * @returns {Promise<{ data: object }>}
 */
export async function addLeadCompanyComment({ leadCompanyId, comment } = {}) {
  return strapiClient.post('/crm-activities/comments', {
    leadCompanyId,
    comment,
  });
}

/**
 * @param {{ leadCompanyIds: (string|number)[] }} opts
 * @returns {Promise<Record<string, number>>}
 */
export async function fetchLeadCompanyCommentCounts({ leadCompanyIds } = {}) {
  const ids = Array.isArray(leadCompanyIds)
    ? leadCompanyIds.map((v) => String(v).trim()).filter(Boolean)
    : [];
  if (!ids.length) return {};
  const res = await strapiClient.get('/crm-activities/comment-counts', {
    leadCompanyIds: ids.join(','),
  });
  return res?.data && typeof res.data === 'object' ? res.data : {};
}

export default {
  fetchActivityTimeline,
  fetchLeadCompanyComments,
  addLeadCompanyComment,
  fetchLeadCompanyCommentCounts,
};
