'use strict';

/**
 * Per-org CRM settings as key → JSON value (G5 lead SLA / assignment, GF4 picklists and notification preferences).
 */

const SETTING_UID = 'api::crm-org-setting.crm-org-setting';

const NOTIFICATION_CATEGORIES = ['leads', 'deals', 'contacts', 'accounts', 'tasks', 'projects', 'comments', 'mentions', 'sla'];

const DEFAULTS = {
  lead_sla: { enabled: false, firstContactMinutes: 60, reassignOnBreach: false },
  lead_assignment: { applyToRepCreated: false },
  /** Extra industries offered in every industry dropdown (on top of the built-in list). */
  industries: { items: [] },
  /** null items = use the built-in lead source list. */
  lead_sources: { items: null },
  notification_prefs: Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c, true])),
  /** Reasons offered when a deal is marked lost (G15 lost-reason analysis). */
  lost_reasons: {
    items: ['Price too high', 'Chose a competitor', 'No budget', 'No response / went cold', 'Timing — not now', 'Not a fit', 'Other'],
  },
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

/** Notification type → preference category (types not listed are always delivered). */
const TYPE_CATEGORY = {
  lead_created: 'leads',
  lead_updated: 'leads',
  lead_assigned: 'leads',
  lead_comment: 'comments',
  deal_created: 'deals',
  deal_updated: 'deals',
  deal_comment: 'comments',
  contact_updated: 'contacts',
  contact_comment: 'comments',
  client_account_updated: 'accounts',
  client_account_comment: 'comments',
  task_assigned: 'tasks',
  task_updated: 'tasks',
  task_comment: 'comments',
  project_updated: 'projects',
  project_comment: 'comments',
  mention: 'mentions',
};

/** False when the org has switched off this notification's category (G5 SLA alerts pass data.category = 'sla'). */
async function notificationAllowed(strapi, orgId, type, data) {
  const category = data?.category || TYPE_CATEGORY[type];
  if (!category || !orgId) return true;
  try {
    const prefs = await getSetting(strapi, orgId, 'notification_prefs');
    return prefs?.[category] !== false;
  } catch (_) {
    return true;
  }
}

module.exports = {
  SETTING_UID,
  DEFAULTS,
  NOTIFICATION_CATEGORIES,
  getSetting,
  setSetting,
  notificationAllowed,
};
