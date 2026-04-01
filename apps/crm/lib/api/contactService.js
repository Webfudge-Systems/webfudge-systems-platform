/**
 * Contact API — Strapi at NEXT_PUBLIC_API_URL (same pattern as leadCompanyService).
 */
import strapiClient from '../strapiClient';

const ENDPOINT = '/contacts';

function normalizeEntry(entry) {
  if (!entry) return null;
  if (entry.attributes) {
    const { id, attributes } = entry;
    const relations = {};
    for (const [key, value] of Object.entries(attributes)) {
      if (value && typeof value === 'object' && (value.data !== undefined || Array.isArray(value))) {
        relations[key] = value;
      }
    }
    const flat = {
      id,
      documentId: id,
      ...Object.fromEntries(
        Object.entries(attributes).filter(
          ([_, v]) =>
            v === null ||
            v === undefined ||
            typeof v !== 'object' ||
            (v && !('data' in v) && !Array.isArray(v))
        )
      ),
    };
    for (const [key, value] of Object.entries(relations)) {
      if (value && typeof value === 'object' && value.data !== undefined) {
        flat[key] = Array.isArray(value.data)
          ? value.data.map(normalizeEntry).filter(Boolean)
          : normalizeEntry(value.data);
      } else if (Array.isArray(value)) {
        flat[key] = value.map(normalizeEntry).filter(Boolean);
      } else {
        flat[key] = value;
      }
    }
    return flat;
  }
  return entry;
}

function normalizeListResponse(response) {
  const data = response?.data ?? response;
  const list = Array.isArray(data) ? data : [];
  return {
    data: list.map(normalizeEntry).filter(Boolean),
    meta: response?.meta ?? { pagination: { page: 1, pageCount: 1, total: list.length } },
  };
}

function normalizeOneResponse(response) {
  const data = response?.data ?? response;
  return { data: normalizeEntry(data) };
}

/** Build Strapi `data` object; drop empties; map CRM field names to schema. */
function toStrapiData(payload) {
  const data = {};
  const set = (key, value) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'string' && value.trim() === '') return;
    data[key] = value;
  };

  set('firstName', payload.firstName?.trim());
  set('lastName', payload.lastName?.trim());
  if (payload.email != null && String(payload.email).trim()) {
    data.email = String(payload.email).trim();
  }
  set('phone', payload.phone?.trim());
  set('companyName', payload.companyName?.trim());
  set('companyWebsite', payload.companyWebsite?.trim());
  if (payload.status) set('status', payload.status);
  if (payload.source) set('source', payload.source);
  set('preferredContactMethod', payload.preferredContactMethod);
  set('birthDate', payload.birthDate);
  set('timezone', payload.timezone?.trim());
  set('jobTitle', payload.jobTitle?.trim());
  set('department', payload.department?.trim());
  set('contactRole', payload.contactRole?.trim());
  if (payload.isPrimaryContact === true || payload.isPrimaryContact === false) {
    data.isPrimaryContact = Boolean(payload.isPrimaryContact);
  }
  set('address', payload.address?.trim());
  set('city', payload.city?.trim());
  set('state', payload.state?.trim());
  set('country', payload.country?.trim());
  set('zipCode', payload.zipCode?.trim());
  const linkedIn = payload.linkedIn?.trim() || payload.linkedinUrl?.trim();
  set('linkedIn', linkedIn);
  set('twitter', payload.twitter?.trim());
  set('notes', payload.notes?.trim());

  if (payload.assignedTo != null && payload.assignedTo !== '') {
    const n = parseInt(payload.assignedTo, 10);
    if (!Number.isNaN(n)) data.assignedTo = n;
  }

  if (payload.leadCompany != null && payload.leadCompany !== '') {
    const n = parseInt(payload.leadCompany, 10);
    if (!Number.isNaN(n)) data.leadCompany = n;
  }

  return data;
}

function relationConnectFormat(data) {
  const out = { ...data };
  if (out.assignedTo != null && typeof out.assignedTo === 'number') {
    out.assignedTo = { id: out.assignedTo };
  }
  if (out.leadCompany != null && typeof out.leadCompany === 'number') {
    out.leadCompany = { id: out.leadCompany };
  }
  return out;
}

export default {
  async getAll(params = {}) {
    const query = {};
    if (params.sort) query.sort = params.sort;
    if (params['pagination[page]'] != null) query['pagination[page]'] = params['pagination[page]'];
    if (params['pagination[pageSize]'] != null) query['pagination[pageSize]'] = params['pagination[pageSize]'];
    if (params.pagination) {
      query['pagination[page]'] = params.pagination.page ?? 1;
      query['pagination[pageSize]'] = params.pagination.pageSize ?? 25;
    }
    if (params.populate) {
      query.populate = Array.isArray(params.populate) ? params.populate.join(',') : params.populate;
    }
    if (params.filters) query.filters = params.filters;

    const response = await strapiClient.get(ENDPOINT, query);
    return normalizeListResponse(response);
  },

  async getOne(id, options = {}) {
    const populate = options.populate ?? ['assignedTo', 'organization', 'leadCompany', 'clientAccount'];
    const response = await strapiClient.get(`${ENDPOINT}/${id}`, { populate });
    return normalizeOneResponse(response);
  },

  async create(payload) {
    const data = relationConnectFormat(toStrapiData(payload));
    const response = await strapiClient.post(ENDPOINT, { data });
    const result = response?.data ?? response;
    const normalized = normalizeEntry(result);
    return { data: normalized, id: normalized?.id ?? result?.id };
  },

  async update(id, payload) {
    const data = relationConnectFormat(toStrapiData(payload));
    const response = await strapiClient.put(`${ENDPOINT}/${id}`, { data });
    return normalizeOneResponse(response);
  },

  async delete(id) {
    await strapiClient.delete(`${ENDPOINT}/${id}`);
    return {};
  },
};
