import strapiClient from '../strapiClient';

/** W21 My Day (auto-scheduled day) + Ask Work. SaaS only. */
const tzOffset = () => new Date().getTimezoneOffset();

const myDayService = {
  async getDay(date) {
    const res = await strapiClient.get('/my-day', { date, tzOffset: tzOffset() });
    return res?.data;
  },

  /** overrides: { order, excluded, pinned: [{ taskId, start }] }; pass { reset: true } to start over. */
  async replan(date, { overrides, reset } = {}) {
    const res = await strapiClient.post('/my-day/plan', { date, tzOffset: tzOffset(), overrides, reset: Boolean(reset) });
    return res?.data;
  },

  /** history: [{ q, a }] of the current chat (last few turns are used). */
  async ask(question, history = []) {
    const res = await strapiClient.post('/my-day/ask', { question, history });
    return res?.data;
  },
};

export default myDayService;
