/**
 * Dashboard API stub - replace with real backend when ready
 */
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default {
  async getStats() {
    await delay(300);
    return {
      data: {
        totalLeads: 24,
        pipelineValue: 1250000,
        conversionRate: 12,
        activeDeals: 8,
        changes: { leadsChange: 5, pipelineValueChange: 10, conversionRateChange: 2, dealsChange: -1 },
      },
    };
  },
  async getWeeklyLeadsData() {
    await delay(200);
    return [];
  },
  async getPipelineStages() {
    await delay(200);
    return { leads: [], qualified: [], proposal: [], negotiation: [] };
  },
  async getUpcomingTasks() {
    await delay(200);
    return [];
  },
};
