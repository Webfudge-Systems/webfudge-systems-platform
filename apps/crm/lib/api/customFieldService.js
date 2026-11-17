/**
 * No-code custom fields (ticket G1) — Strapi /crm-custom-fields.
 * Field: { id, key, label, entity: 'lead'|'contact'|'account'|'deal', type, options[], required, showInTable, sortOrder }.
 * Values live on each record as `customFields: { [key]: value }`.
 */
import strapiClient from '../strapiClient';

const ENDPOINT = '/crm-custom-fields';

export const CUSTOM_FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency (₹)' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
  { value: 'user', label: 'Team member' },
  { value: 'phone', label: 'Phone' },
  { value: 'url', label: 'Website / URL' },
  { value: 'checkbox', label: 'Checkbox' },
];

export const CUSTOM_FIELD_ENTITIES = [
  { value: 'lead', label: 'Lead companies' },
  { value: 'contact', label: 'Contacts' },
  { value: 'account', label: 'Client accounts' },
  { value: 'deal', label: 'Deals' },
];

const customFieldService = {
  /** @param {'lead'|'contact'|'account'|'deal'} [entity] omit for all */
  async list(entity) {
    const res = await strapiClient.get(ENDPOINT, entity ? { entity } : {});
    return Array.isArray(res?.data) ? res.data : [];
  },
  async create(payload) {
    const res = await strapiClient.post(ENDPOINT, { data: payload });
    return res?.data;
  },
  async update(id, payload) {
    const res = await strapiClient.put(`${ENDPOINT}/${id}`, { data: payload });
    return res?.data;
  },
  async remove(id) {
    return strapiClient.delete(`${ENDPOINT}/${id}`);
  },
};

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });

/** Display string for a stored value. `users` resolves team-member ids to names. */
export function formatCustomFieldValue(field, value, users = []) {
  if (value == null || value === '' || (Array.isArray(value) && !value.length)) return '';
  switch (field.type) {
    case 'currency':
      return inr.format(Number(value));
    case 'number':
      return Number(value).toLocaleString('en-IN');
    case 'date':
      return new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    case 'checkbox':
      return value ? 'Yes' : 'No';
    case 'multiselect':
      return (Array.isArray(value) ? value : [value]).join(', ');
    case 'user': {
      const u = users.find((x) => String(x.id) === String(value));
      if (!u) return `User #${value}`;
      return [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || `User #${value}`;
    }
    default:
      return String(value);
  }
}

export default customFieldService;
