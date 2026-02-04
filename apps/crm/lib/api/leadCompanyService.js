/**
 * Lead company API stub - replace with real backend when ready
 */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  async getAll(params = {}) {
    await delay(400);
    return { data: [], meta: { pagination: { page: 1, pageCount: 1, total: 0 } } };
  },
  async getOne(id) {
    await delay(200);
    return { data: null };
  },
  async create(payload) {
    await delay(300);
    return { data: { id: 1, ...payload } };
  },
  async update(id, payload) {
    await delay(300);
    return { data: { id, ...payload } };
  },
};
