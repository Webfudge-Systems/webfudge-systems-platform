import strapiClient from '../strapiClient';

/** Task lists / sections inside a project (W1). */
const taskListService = {
  /** Lists in order, each with `taskIds`. The default list is created by the API if missing. */
  async listForProject(projectId) {
    const res = await strapiClient.get('/task-lists', { project: projectId, _: Date.now() });
    return Array.isArray(res?.data) ? res.data : [];
  },
  async create(projectId, name) {
    const res = await strapiClient.post('/task-lists', { data: { project: projectId, name } });
    return res?.data;
  },
  async rename(id, name) {
    const res = await strapiClient.put(`/task-lists/${id}`, { data: { name } });
    return res?.data;
  },
  async remove(id) {
    const res = await strapiClient.delete(`/task-lists/${id}`);
    return res?.data;
  },
  async reorder(projectId, order) {
    const res = await strapiClient.post('/task-lists/reorder', { data: { project: projectId, order } });
    return Array.isArray(res?.data) ? res.data : [];
  },
  async moveTasks(listId, taskIds) {
    const res = await strapiClient.post(`/task-lists/${listId}/tasks`, { data: { taskIds } });
    return res?.data;
  },
};

export default taskListService;
