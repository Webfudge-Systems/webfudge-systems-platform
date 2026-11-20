/**
 * Lead sources / lead capture (ticket G7) — Strapi /crm-lead-capture. SaaS only, CRM settings managers.
 * Source: { key, slug, label, leadSource, kind: 'form'|'webhook', enabled, endpointUrl, emailEndpointUrl,
 *           googleKey?, allowedDomains?, redirectUrl?, successMessage?, pull?: { enabled, hasCrmKey, lastPulledAt, lastError, lastResult },
 *           stats: { created, merged, rejected, spam, … } (last 7 days) }
 */
import strapiClient from '../strapiClient';

const BASE = '/crm-lead-capture';

const leadCaptureService = {
  async overview() {
    const res = await strapiClient.get(BASE);
    return res?.data || { sources: [], events: [] };
  },
  async events(source) {
    const res = await strapiClient.get(`${BASE}/events${source ? `?source=${encodeURIComponent(source)}&limit=100` : '?limit=100'}`);
    return Array.isArray(res?.data) ? res.data : [];
  },
  async update(slug, payload) {
    return (await strapiClient.put(`${BASE}/${slug}`, { data: payload }))?.data;
  },
  async rotate(slug) {
    return (await strapiClient.post(`${BASE}/${slug}/rotate`, {}))?.data;
  },
  async pullIndiaMart() {
    return (await strapiClient.post(`${BASE}/indiamart/pull`, {}))?.data;
  },
};

export default leadCaptureService;
