'use strict';

/**
 * G11: a meeting created or updated on a lead (booked, completed, outcome, notes) schedules a
 * debounced lead rescore. Never throws, so scoring can't break a meeting write.
 */

const relId = (v) => {
  if (v == null) return null;
  if (typeof v === 'number' || /^\d+$/.test(String(v))) return Number(v);
  if (typeof v === 'object') return relId(v.id ?? v.connect?.[0]?.id ?? v.connect?.[0] ?? v.set?.[0]?.id ?? v.set?.[0]);
  return null;
};

async function schedule(event) {
  try {
    let leadId = relId(event.params?.data?.leadCompany) ?? relId(event.result?.leadCompany);
    if (!leadId && event.result?.id) {
      const m = await strapi.db.query('api::meeting.meeting').findOne({ where: { id: event.result.id }, select: ['id'], populate: { leadCompany: { select: ['id'] } } });
      leadId = relId(m?.leadCompany);
    }
    if (leadId) require('../../../../utils/lead-scoring').onLeadActivity(strapi, leadId, 'meeting');
  } catch (err) {
    strapi.log.warn(`[lead-score] meeting hook failed: ${err.message}`);
  }
}

module.exports = {
  afterCreate: schedule,
  afterUpdate: schedule,
};
