import strapiClient from '../strapiClient';

/** G14: cadences, enrolments and the rep's public booking page. */
const cadenceService = {
  list: () => strapiClient.get('/crm-cadences'),
  get: (id) => strapiClient.get(`/crm-cadences/${id}`),
  create: (data) => strapiClient.post('/crm-cadences', data),
  update: (id, data) => strapiClient.put(`/crm-cadences/${id}`, data),
  archive: (id) => strapiClient.delete(`/crm-cadences/${id}`),
  enroll: (id, leadCompanyIds) => strapiClient.post(`/crm-cadences/${id}/enroll`, { leadCompanyIds }),
  enrollments: (params = {}) => strapiClient.get('/crm-cadences/enrollments', params),
  stopEnrollment: (id) => strapiClient.post(`/crm-cadences/enrollments/${id}/stop`, {}),
  markReplied: (leadId, note = '') => strapiClient.post(`/crm-cadences/leads/${leadId}/replied`, { note }),
  getMyBookingPage: () => strapiClient.get('/crm-booking-pages/me'),
  saveMyBookingPage: (data) => strapiClient.put('/crm-booking-pages/me', data),
};

/** Public booking endpoints (no login). */
export async function publicBooking(slug, { method = 'GET', body } = {}) {
  const res = await fetch(`${strapiClient.baseURL}/api/booking/${encodeURIComponent(slug)}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

export const STEP_TYPE_LABELS = { call: 'Call', task: 'Task', email: 'Email', whatsapp: 'WhatsApp' };

export const STOP_REASON_LABELS = {
  replied: 'Lead replied',
  stopped_by_user: 'Stopped by a teammate',
  cadence_archived: 'Cadence archived',
  lead_or_cadence_deleted: 'Lead or cadence deleted',
};

export default cadenceService;
