/**
 * Client Account API — backed by the real Strapi /client-accounts endpoint.
 */
import strapiClient from '../strapiClient';

const ENDPOINT = '/client-accounts';

function normalizeEntry(entry) {
  if (!entry) return null;
  if (entry.attributes) {
    const { id, attributes } = entry;
    const flat = { id, documentId: id };
    for (const [key, value] of Object.entries(attributes)) {
      if (value && typeof value === 'object' && value.data !== undefined) {
        flat[key] = Array.isArray(value.data)
          ? value.data.map(normalizeEntry).filter(Boolean)
          : normalizeEntry(value.data);
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
      if (Array.isArray(params.populate)) {
        params.populate.forEach((p, i) => {
          query[`populate[${i}]`] = p;
        });
      } else {
        query.populate = params.populate;
      }
    }
    const response = await strapiClient.get(ENDPOINT, query);
    return normalizeListResponse(response);
  },

  async getOne(id, options = {}) {
    const populate =
      options.populate ?? ['assignedTo', 'organization', 'convertedFromLead', 'contacts'];
    const response = await strapiClient.get(`${ENDPOINT}/${id}`, {
      populate,
    });
    return normalizeOneResponse(response);
  },

  async create(payload) {
    const data = { ...payload };
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
    const response = await strapiClient.put(`${ENDPOINT}/${id}`, { data });
    return normalizeOneResponse(response);
  },

  async delete(id) {
    await strapiClient.delete(`${ENDPOINT}/${id}`);
    return {};
  },
};
