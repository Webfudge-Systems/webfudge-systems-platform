import strapiClient from '../strapiClient';

/** G20 Ask Grow (Cmd+K lead questions) + Draft anything. SaaS only; the backend enforces RBAC. */
const askGrowService = {
  async query(question, { language } = {}) {
    const res = await strapiClient.post('/ask-grow/query', { question, language });
    return res?.data ?? res;
  },
  /** Re-applies a filter without AI (no credits). */
  async run(filter) {
    const res = await strapiClient.post('/ask-grow/run', { filter });
    return res?.data ?? res;
  },
  async draft({ recordType, recordId, kind, instructions, language }) {
    const res = await strapiClient.post('/ask-grow/draft', { recordType, recordId, kind, instructions, language });
    return res?.data ?? res;
  },
  async getBrandTone() {
    const res = await strapiClient.get('/ask-grow/brand-tone');
    return res?.data ?? res;
  },
  async setBrandTone(value) {
    const res = await strapiClient.put('/ask-grow/brand-tone', value);
    return res?.data ?? res;
  },
};

/** Leads-list URL for an Ask Grow filter. */
export function leadsHrefForFilter(filter, question) {
  const p = new URLSearchParams({ ai: JSON.stringify(filter || {}) });
  if (question) p.set('aiq', question.slice(0, 200));
  return `/sales/lead-companies?${p.toString()}`;
}

export default askGrowService;
