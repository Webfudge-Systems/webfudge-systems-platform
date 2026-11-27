'use strict';

/**
 * G11: any new activity on a lead (comment, field change, created) schedules a debounced lead
 * rescore. Never throws, so scoring can't break an activity write.
 */

const relId = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' || /^\d+$/.test(String(v))) return Number(v);
  if (typeof v === 'object') return relId(v.id ?? v.connect?.[0]?.id ?? v.connect?.[0] ?? v.set?.[0]?.id ?? v.set?.[0]);
  return null;
};

module.exports = {
  afterCreate(event) {
    try {
      const data = event.params?.data || {};
      const leadId = relId(data.leadCompany) ?? relId(event.result?.leadCompany);
      if (!leadId) return;
      require('../../../../utils/lead-scoring').onLeadActivity(strapi, leadId, data.action === 'comment' ? 'comment' : 'activity');
    } catch (err) {
      strapi.log.warn(`[lead-score] activity hook failed: ${err.message}`);
    }
  },
};
