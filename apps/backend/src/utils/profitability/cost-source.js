'use strict';

/**
 * Cost source for project profitability (W22).
 *
 * Today: approved timesheet hours (W5) × a manual hourly cost rate per member, kept in
 * api::profitability.cost-rate and edited by org admins. When Fudge People ships, replace
 * `ratesFor` with a reader of its salary / cost data; the rest of profitability stays the same.
 *
 * Contract:
 *   ratesFor(strapi, orgId)                → Map<userId, hourlyCost>
 *   approvedHours(strapi, orgId, projectIds) → [{ projectId, userId, date: 'YYYY-MM-DD', hours }]
 */

const RATE_UID = 'api::profitability.cost-rate';
const ENTRY_UID = 'api::timesheet.time-entry';

const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));

async function ratesFor(strapi, orgId) {
  const rows = await strapi.entityService.findMany(RATE_UID, {
    filters: { organization: orgId },
    fields: ['hourlyCost'],
    populate: { user: { fields: ['id'] } },
    limit: 5000,
  });
  const map = new Map();
  for (const r of rows) {
    const uid = relId(r.user);
    if (uid != null) map.set(uid, Number(r.hourlyCost) || 0);
  }
  return map;
}

async function approvedHours(strapi, orgId, projectIds) {
  if (!projectIds.length || !strapi.contentTypes[ENTRY_UID]) return [];
  const rows = await strapi.entityService.findMany(ENTRY_UID, {
    filters: { organization: orgId, project: { id: { $in: projectIds } }, timesheet: { status: 'approved' } },
    fields: ['date', 'hours'],
    populate: { project: { fields: ['id'] }, user: { fields: ['id'] } },
    limit: 100000,
  });
  return rows
    .map((e) => ({ projectId: relId(e.project), userId: relId(e.user), date: String(e.date || '').slice(0, 10), hours: Number(e.hours) || 0 }))
    .filter((e) => e.projectId != null && e.hours > 0);
}

module.exports = { name: 'manual-rates+timesheets', ratesFor, approvedHours };
