import strapiClient from '../strapiClient';

/** Workspaces (W1): team / department / client spaces that group projects. */
const workspaceService = {
  async list() {
    const res = await strapiClient.get('/workspaces', { _: Date.now() });
    return { items: Array.isArray(res?.data) ? res.data : [], canCreate: Boolean(res?.meta?.canCreate) };
  },
  async create(data) {
    const res = await strapiClient.post('/workspaces', { data });
    return res?.data;
  },
  async update(id, data) {
    const res = await strapiClient.put(`/workspaces/${id}`, { data });
    return res?.data;
  },
  async remove(id) {
    const res = await strapiClient.delete(`/workspaces/${id}`);
    return res?.data;
  },
};

export default workspaceService;
