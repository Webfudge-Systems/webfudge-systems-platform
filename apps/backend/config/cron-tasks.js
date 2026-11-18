'use strict';

/** Scheduled jobs (Strapi cron, see config/server.js). */
module.exports = {
  /** G5: flag first-contact SLA breaches every 5 minutes (notifies owners, optional reassignment). */
  leadSlaBreaches: {
    task: async ({ strapi }) => {
      try {
        const { processSlaBreaches } = require('../src/utils/lead-assignment');
        const n = await processSlaBreaches(strapi);
        if (n) strapi.log.info(`[cron] lead SLA: ${n} breach(es) flagged`);
      } catch (e) {
        strapi.log.error(`[cron] lead SLA failed: ${e?.message || e}`);
      }
    },
    options: { rule: '*/5 * * * *' },
  },
};
