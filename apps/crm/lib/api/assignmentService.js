/**
 * Lead assignment rules + first-contact SLA (ticket G5).
 * Rule: { id, name, enabled, sortOrder, strategy: 'round_robin'|'load_based', match: { cities, states, pincodes, sources, industries }, assigneeIds, maxOpenLeads }
 */
import strapiClient from '../strapiClient';

const RULES = '/crm-assignment-rules';
const SLA = '/crm-lead-sla';

export const ASSIGNMENT_STRATEGIES = [
  { value: 'round_robin', label: 'Round robin', hint: 'Each new lead goes to the next person in turn.' },
  { value: 'load_based', label: 'Fewest open leads', hint: 'Each new lead goes to whoever has the fewest open leads.' },
];

export const MATCH_FIELDS = [
  { key: 'cities', label: 'Cities', placeholder: 'Pune, Mumbai' },
  { key: 'states', label: 'States', placeholder: 'Maharashtra, Karnataka' },
  { key: 'pincodes', label: 'Pincodes (prefix)', placeholder: '411, 560001' },
  { key: 'sources', label: 'Lead sources', placeholder: 'WEBSITE, REFERRAL' },
  { key: 'industries', label: 'Industries / products', placeholder: 'Manufacturing, Retail' },
];

const assignmentService = {
  async listRules() {
    const res = await strapiClient.get(RULES);
    return Array.isArray(res?.data) ? res.data : [];
  },
  async createRule(payload) {
    return (await strapiClient.post(RULES, { data: payload }))?.data;
  },
  async updateRule(id, payload) {
    return (await strapiClient.put(`${RULES}/${id}`, { data: payload }))?.data;
  },
  async removeRule(id) {
    return strapiClient.delete(`${RULES}/${id}`);
  },
  /** Dry run: who would get a lead with these details. */
  async testRules(lead) {
    return (await strapiClient.post(`${RULES}/test`, { data: lead }))?.data || null;
  },
  async getSla() {
    return (await strapiClient.get(SLA))?.data || {};
  },
  async saveSla(payload) {
    return (await strapiClient.put(SLA, { data: payload }))?.data || {};
  },
  async slaSummary() {
    return (await strapiClient.get(`${SLA}/summary`))?.data || null;
  },
  /** True when at least one enabled rule exists (new-lead form then defaults to auto-assign). */
  async hasActiveRules() {
    try {
      return (await this.listRules()).some((r) => r.enabled !== false);
    } catch {
      return false;
    }
  },
};

export default assignmentService;
