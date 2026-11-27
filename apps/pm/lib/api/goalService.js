import strapiClient from '../strapiClient';

/** Goals / OKRs (W12): objectives → key results → check-ins. Backend: /api/goals/*. */
const goalService = {
  listObjectives: (params = {}) => strapiClient.get('/goals/objectives', params),
  getObjective: (id) => strapiClient.get(`/goals/objectives/${id}`),
  createObjective: (data) => strapiClient.post('/goals/objectives', { data }),
  updateObjective: (id, data) => strapiClient.put(`/goals/objectives/${id}`, { data }),
  deleteObjective: (id) => strapiClient.delete(`/goals/objectives/${id}`),
  createKeyResult: (objectiveId, data) => strapiClient.post(`/goals/objectives/${objectiveId}/key-results`, { data }),
  updateKeyResult: (id, data) => strapiClient.put(`/goals/key-results/${id}`, { data }),
  deleteKeyResult: (id) => strapiClient.delete(`/goals/key-results/${id}`),
  listCheckIns: (keyResultId) => strapiClient.get(`/goals/key-results/${keyResultId}/check-ins`),
  checkIn: (keyResultId, data) => strapiClient.post(`/goals/key-results/${keyResultId}/check-ins`, { data }),
  linkedToProject: (projectId) => strapiClient.get('/goals/linked', { projectId }),
};

export default goalService;
