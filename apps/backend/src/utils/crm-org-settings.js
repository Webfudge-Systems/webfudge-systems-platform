'use strict';

/**
 * Per-org CRM settings as key → JSON value (G5 lead SLA, GF4 picklists and notification preferences).
 */

const SETTING_UID = 'api::crm-org-setting.crm-org-setting';

const DEFAULTS = {
  lead_sla: { enabled: false, firstContactMinutes: 60, reassignOnBreach: false },
  lead_assignment: { applyToRepCreated: false },
};

async function getSetting(strapi, orgId, key) {
  const rows = await strapi.entityService.findMany(SETTING_UID, { filters: { organization: orgId, key }, limit: 1 });
  const stored = rows[0]?.value;
  const def = DEFAULTS[key];
  if (def && stored && typeof stored === 'object' && !Array.isArray(stored)) return { ...def, ...stored };
  return stored ?? (def ? { ...def } : null);
}

async function setSetting(strapi, orgId, key, value) {
  const rows = await strapi.entityService.findMany(SETTING_UID, { filters: { organization: orgId, key }, limit: 1 });
  if (rows[0]) return strapi.entityService.update(SETTING_UID, rows[0].id, { data: { value } });
  return strapi.entityService.create(SETTING_UID, { data: { key, value, organization: orgId } });
}

module.exports = { SETTING_UID, DEFAULTS, getSetting, setSetting };
