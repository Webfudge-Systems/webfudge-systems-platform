/**
 * Meta Lead Ads capture (ticket G6, SaaS only) — Strapi /crm-meta/*.
 * The server keeps every Meta token; these calls only ever return names, ids and settings.
 */
import strapiClient from '../strapiClient';

const BASE = '/crm-meta';

/** Where each Meta form question can go. `custom:<key>` targets are added from the org's custom fields. */
export const META_FIELD_TARGETS = [
  { value: 'fullName', label: 'Full name (contact)' },
  { value: 'firstName', label: 'First name (contact)' },
  { value: 'lastName', label: 'Last name (contact)' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'jobTitle', label: 'Job title (contact)' },
  { value: 'companyName', label: 'Company name' },
  { value: 'website', label: 'Website' },
  { value: 'industry', label: 'Industry' },
  { value: 'address', label: 'Address' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'country', label: 'Country' },
  { value: 'zipCode', label: 'PIN / ZIP code' },
  { value: 'notes', label: 'Add to lead description' },
  { value: 'ignore', label: "Don't import" },
];

const metaLeadAdsService = {
  async getConnection() {
    return (await strapiClient.get(`${BASE}/connection`))?.data || null;
  },
  /** Facebook Login URL; the browser goes there and Meta sends it back to Grow Settings. */
  async getConnectUrl() {
    return (await strapiClient.post(`${BASE}/connect`, {}))?.data?.url || null;
  },
  async listPages() {
    const res = await strapiClient.get(`${BASE}/pages`);
    return Array.isArray(res?.data) ? res.data : [];
  },
  async selectPage(pageId) {
    return (await strapiClient.post(`${BASE}/page`, { data: { pageId } }))?.data || null;
  },
  /** { forms: [{ id, name, status, questions, enabled, mapping }], customFields: [{ key, label }] } */
  async listForms() {
    const res = await strapiClient.get(`${BASE}/forms`);
    return { forms: Array.isArray(res?.data) ? res.data : [], customFields: res?.meta?.customFields || [] };
  },
  async saveForms(forms) {
    return (await strapiClient.put(`${BASE}/forms`, { data: { forms } }))?.data || null;
  },
  async backfill({ days, formId } = {}) {
    return (await strapiClient.post(`${BASE}/backfill`, { data: { days, formId } }))?.data || null;
  },
  async disconnect() {
    return strapiClient.delete(`${BASE}/connection`);
  },
};

export default metaLeadAdsService;
