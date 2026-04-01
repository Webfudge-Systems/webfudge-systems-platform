/**
 * Lead company API - uses Strapi backend at NEXT_PUBLIC_API_URL
 */
import strapiClient from '../strapiClient';
import contactService from './contactService';

const ENDPOINT = '/lead-companies';

/**
 * Normalize Strapi response: flatten { id, attributes } into { id, ...attributes }
 */
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
          ([_, v]) => v === null || v === undefined || (typeof v !== 'object') || (v && !('data' in v) && !Array.isArray(v))
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
  // Flat API payloads: contacts may be Strapi-style { data: [...] }
  if (
    entry.contacts &&
    typeof entry.contacts === 'object' &&
    !Array.isArray(entry.contacts) &&
    entry.contacts.data !== undefined
  ) {
    const d = entry.contacts.data;
    return {
      ...entry,
      contacts: Array.isArray(d)
        ? d.map(normalizeEntry).filter(Boolean)
        : d
          ? [normalizeEntry(d)]
          : [],
    };
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

/** Same source as lead company detail Contacts tab: GET /contacts scoped by org, grouped by leadCompany.id */
async function mergeContactsOntoLeadCompanies(companies) {
  if (!companies?.length) return companies;
  const { data: allContacts = [] } = await contactService.getAll({
    'pagination[pageSize]': 2000,
    sort: 'createdAt:desc',
    populate: ['leadCompany'],
  });
  const byLead = new Map();
  for (const c of allContacts) {
    const lc = c.leadCompany;
    const lid = lc && typeof lc === 'object' ? lc.id ?? lc.documentId : lc;
    if (lid == null) continue;
    const key = String(lid);
    if (!byLead.has(key)) byLead.set(key, []);
    byLead.get(key).push(c);
  }
  for (const list of byLead.values()) {
    list.sort((a, b) => Number(!!b.isPrimaryContact) - Number(!!a.isPrimaryContact));
  }
  return companies.map((co) => {
    const cid = co.id ?? co.documentId;
    if (cid == null) return co;
    const merged = byLead.get(String(cid));
    if (!merged?.length) return co;
    return { ...co, contacts: merged };
  });
}

export default {
  async getAll(params = {}) {
    const { mergeContactsFromContactsApi, ...rest } = params;
    const query = {};
    if (rest.sort) query.sort = rest.sort;
    if (rest['pagination[page]'] != null) query['pagination[page]'] = rest['pagination[page]'];
    if (rest['pagination[pageSize]'] != null) query['pagination[pageSize]'] = rest['pagination[pageSize]'];
    if (rest.pagination) {
      query['pagination[page]'] = rest.pagination.page ?? 1;
      query['pagination[pageSize]'] = rest.pagination.pageSize ?? 25;
    }
    if (rest.populate) {
      query.populate = Array.isArray(rest.populate) ? rest.populate.join(',') : rest.populate;
    }
    if (rest.filters) query.filters = rest.filters;

    const response = await strapiClient.get(ENDPOINT, query);
    const normalized = normalizeListResponse(response);
    if (mergeContactsFromContactsApi && normalized.data?.length) {
      normalized.data = await mergeContactsOntoLeadCompanies(normalized.data);
    }
    return normalized;
  },

  async getOne(id, options = {}) {
    const populate = options.populate ?? ['assignedTo', 'organization', 'contacts', 'convertedAccount'];
    const response = await strapiClient.get(`${ENDPOINT}/${id}`, {
      populate,
    });
    return normalizeOneResponse(response);
  },

  async create(payload) {
    const data = { ...payload };
    if (data.assignedTo != null && typeof data.assignedTo === 'number') {
      data.assignedTo = { id: data.assignedTo };
    }
    const response = await strapiClient.post(ENDPOINT, { data });
    const result = response?.data ?? response;
    const normalized = normalizeEntry(result);
    return { data: normalized, id: normalized?.id ?? result?.id };
  },

  async update(id, payload) {
    const data = { ...payload };
    if (data.assignedTo != null && typeof data.assignedTo === 'number') {
      data.assignedTo = { id: data.assignedTo };
    }
    const body = { data };
    const response = await strapiClient.put(`${ENDPOINT}/${id}`, body);
    return normalizeOneResponse(response);
  },

  async delete(id) {
    await strapiClient.delete(`${ENDPOINT}/${id}`);
    return {};
  },

  /**
   * Convert a lead company to a client account.
   * POST /lead-companies/:id/convert
   * Returns { data: { leadCompany, clientAccount } }
   */
  async convertToClient(id) {
    const response = await strapiClient.post(`${ENDPOINT}/${id}/convert`, {});
    const raw = response?.data ?? response;
    return {
      data: {
        leadCompany: normalizeEntry(raw?.leadCompany ?? null),
        clientAccount: normalizeEntry(raw?.clientAccount ?? null),
      },
    };
  },

  async getStatuses() {
    const response = await strapiClient.get(`${ENDPOINT}/statuses`);
    const data = response?.data ?? response ?? [];
    return Array.isArray(data) ? data : [];
  },

  /**
   * Stats by status. Derives from getAll when backend has no dedicated stats endpoint.
   */
  async getStats() {
    try {
      const { data } = await this.getAll({
        'pagination[pageSize]': 1000,
        sort: 'createdAt:desc',
      });
      const byStatus = (data || []).reduce((acc, company) => {
        const s = (company.status || 'NEW').toUpperCase();
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});
      return { byStatus };
    } catch (err) {
      console.error('Lead company getStats error:', err);
      return { byStatus: {} };
    }
  },
};
