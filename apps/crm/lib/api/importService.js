/**
 * Imports, duplicate checks and lead merge (ticket G4).
 */
import strapiClient from '../strapiClient';

export const IMPORT_FIELDS = {
  lead: [
    { key: 'companyName', label: 'Company name', required: true, aliases: ['company', 'company name', 'business', 'organisation', 'organization', 'name'] },
    { key: 'email', label: 'Email', aliases: ['email', 'e-mail', 'mail'] },
    { key: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'contact number', 'phone number', 'whatsapp'] },
    { key: 'website', label: 'Website', aliases: ['website', 'url', 'site'] },
    { key: 'industry', label: 'Industry', aliases: ['industry', 'sector'] },
    { key: 'city', label: 'City', aliases: ['city', 'town'] },
    { key: 'state', label: 'State', aliases: ['state', 'region'] },
    { key: 'country', label: 'Country', aliases: ['country'] },
    { key: 'address', label: 'Address', aliases: ['address', 'street'] },
    { key: 'zipCode', label: 'PIN / ZIP code', aliases: ['pin', 'pincode', 'zip', 'zip code', 'postal code'] },
    { key: 'source', label: 'Source', aliases: ['source', 'lead source'] },
    { key: 'status', label: 'Status', aliases: ['status', 'stage'] },
    { key: 'dealValue', label: 'Deal value (₹)', aliases: ['deal value', 'value', 'amount', 'budget'] },
    { key: 'nextConnectDate', label: 'Next connect date', aliases: ['next connect', 'follow up', 'follow-up date', 'next follow up'] },
    { key: 'employees', label: 'Employees', aliases: ['employees', 'company size', 'size'] },
    { key: 'linkedIn', label: 'LinkedIn', aliases: ['linkedin'] },
    { key: 'notes', label: 'Notes', aliases: ['notes', 'remarks', 'comments'] },
    { key: 'description', label: 'Description', aliases: ['description', 'about'] },
  ],
  contact: [
    { key: 'firstName', label: 'First name', required: true, aliases: ['first name', 'firstname', 'name', 'full name'] },
    { key: 'lastName', label: 'Last name', aliases: ['last name', 'lastname', 'surname'], hint: 'Required, or put the full name in First name' },
    { key: 'email', label: 'Email', aliases: ['email', 'e-mail', 'mail'] },
    { key: 'phone', label: 'Phone', aliases: ['phone', 'mobile', 'contact number', 'phone number', 'whatsapp'] },
    { key: 'companyName', label: 'Company', aliases: ['company', 'company name', 'organisation', 'organization'] },
    { key: 'jobTitle', label: 'Job title', aliases: ['title', 'job title', 'designation', 'role'] },
    { key: 'department', label: 'Department', aliases: ['department'] },
    { key: 'city', label: 'City', aliases: ['city'] },
    { key: 'state', label: 'State', aliases: ['state'] },
    { key: 'country', label: 'Country', aliases: ['country'] },
    { key: 'linkedIn', label: 'LinkedIn', aliases: ['linkedin'] },
    { key: 'source', label: 'Source', aliases: ['source'] },
    { key: 'notes', label: 'Notes', aliases: ['notes', 'remarks'] },
  ],
};

const importService = {
  async start({ entity, fileName, duplicateMode, rows }) {
    const res = await strapiClient.post('/crm-imports', { data: { entity, fileName, duplicateMode, rows } });
    return res?.data;
  },
  async get(id) {
    const res = await strapiClient.get(`/crm-imports/${id}`);
    return res?.data;
  },
  async recent() {
    const res = await strapiClient.get('/crm-imports');
    return Array.isArray(res?.data) ? res.data : [];
  },
  /** Possible duplicates for create forms. */
  async duplicates(entity, { email, phone, companyName, excludeId } = {}) {
    const params = { entity };
    if (email) params.email = email;
    if (phone) params.phone = phone;
    if (companyName) params.companyName = companyName;
    if (excludeId) params.excludeId = excludeId;
    const res = await strapiClient.get('/crm-duplicates', params);
    return Array.isArray(res?.data) ? res.data : [];
  },
  async mergeLeads({ keepId, mergeId, take, takeCustom }) {
    const res = await strapiClient.post('/crm-merge/lead', { data: { keepId, mergeId, take, takeCustom } });
    return res?.data;
  },
};

/** Guess the field for a column header. */
export function guessField(entity, header, customFields = []) {
  const h = String(header || '').trim().toLowerCase();
  const std = IMPORT_FIELDS[entity].find((f) => f.key.toLowerCase() === h || f.label.toLowerCase() === h || f.aliases.includes(h));
  if (std) return std.key;
  const cf = customFields.find((f) => f.label.toLowerCase() === h || f.key === h);
  return cf ? `cf:${cf.key}` : '';
}

export default importService;
