/**
 * Lead company API - uses Strapi backend at NEXT_PUBLIC_API_URL
 */
import strapiClient from '../strapiClient';

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

  async getOne(id) {
    const response = await strapiClient.get(`${ENDPOINT}/${id}`, {
      populate: ['contacts', 'assignedTo', 'deals'],
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
    return { data: normalizeEntry(result), id: result?.id };
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
