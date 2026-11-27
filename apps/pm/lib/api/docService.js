import strapiClient from '../strapiClient';

/** Project docs (W8): rich-text briefs, SOPs and meeting notes in a project or workspace. */
const docService = {
  async list({ project, workspace, q, docType } = {}) {
    const params = { _: Date.now() };
    if (project) params.project = project;
    if (workspace) params.workspace = workspace;
    if (q) params.q = q;
    if (docType) params.docType = docType;
    const res = await strapiClient.get('/project-docs', params);
    return { items: Array.isArray(res?.data) ? res.data : [], canCreate: Boolean(res?.meta?.canCreate) };
  },
  async get(id) {
    const res = await strapiClient.get(`/project-docs/${id}`, { _: Date.now() });
    return { doc: res?.data || null, meta: res?.meta || {} };
  },
  async create(data) {
    const res = await strapiClient.post('/project-docs', { data });
    return res?.data;
  },
  /** Throws an error with status 409 and details.latest when someone else saved first. */
  async update(id, data) {
    const res = await strapiClient.put(`/project-docs/${id}`, { data });
    return res?.data;
  },
  async remove(id) {
    return strapiClient.delete(`/project-docs/${id}`);
  },
  async versions(id) {
    const res = await strapiClient.get(`/project-docs/${id}/versions`, { _: Date.now() });
    return Array.isArray(res?.data) ? res.data : [];
  },
  async version(id, versionId) {
    const res = await strapiClient.get(`/project-docs/${id}/versions/${versionId}`, { _: Date.now() });
    return res?.data || null;
  },
  async saveVersion(id, note) {
    const res = await strapiClient.post(`/project-docs/${id}/versions`, { data: { note } });
    return res?.data;
  },
  async restore(id, versionId) {
    const res = await strapiClient.post(`/project-docs/${id}/versions/${versionId}/restore`, {});
    return res?.data;
  },
  /** Light task lookup for `#` task links in the editor. */
  async searchTasks({ query, projectId, limit = 8 }) {
    const params = {
      'pagination[page]': 1,
      'pagination[pageSize]': limit,
      sort: 'updatedAt:desc',
      'fields[0]': 'name',
      'fields[1]': 'status',
      _: Date.now(),
    };
    if (query) params['filters[name][$containsi]'] = query;
    if (projectId) params['filters[projects][id][$eq]'] = projectId;
    const res = await strapiClient.get('/tasks', params);
    const rows = Array.isArray(res?.data) ? res.data : [];
    return rows.map((t) => ({ id: t.id, name: t.name ?? t.attributes?.name, status: t.status ?? t.attributes?.status }));
  },
};

export const DOC_TYPES = [
  { value: 'brief', label: 'Project brief' },
  { value: 'sop', label: 'SOP' },
  { value: 'meeting_notes', label: 'Meeting notes' },
  { value: 'wiki', label: 'Wiki page' },
  { value: 'other', label: 'Doc' },
];

export const docTypeLabel = (value) => DOC_TYPES.find((t) => t.value === value)?.label || 'Doc';

/** Starting content for a new doc of each type (TipTap JSON). */
export function templateFor(docType) {
  const h = (level, text) => ({ type: 'heading', attrs: { level }, content: [{ type: 'text', text }] });
  const p = (text) => (text ? { type: 'paragraph', content: [{ type: 'text', text }] } : { type: 'paragraph' });
  const tasks = () => ({ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [p('')] }] });
  const blocks = {
    brief: [h(2, 'Goal'), p(''), h(2, 'Scope'), p(''), h(2, 'Deliverables'), tasks(), h(2, 'Timeline'), p(''), h(2, 'Stakeholders'), p('')],
    sop: [h(2, 'Purpose'), p(''), h(2, 'When to use'), p(''), h(2, 'Steps'), { type: 'orderedList', content: [{ type: 'listItem', content: [p('')] }] }, h(2, 'Owner'), p('')],
    meeting_notes: [h(2, 'Attendees'), p(''), h(2, 'Agenda'), p(''), h(2, 'Notes'), p(''), h(2, 'Action items'), tasks()],
  }[docType];
  return { type: 'doc', content: blocks || [p('')] };
}

export default docService;
