'use strict';

/**
 * Org-level Grow settings (GF4). GET: any member of the org (dropdowns need the lists).
 * PUT: CRM/PM settings manage. Values are validated per key; unknown keys are rejected.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { requireAppSettingsManage } = require('../../../utils/rbac');
const { SETTING_UID, NOTIFICATION_CATEGORIES, getSetting, setSetting } = require('../../../utils/crm-org-settings');

const PUBLIC_KEYS = ['industries', 'lead_sources', 'notification_prefs'];
const MAX_ITEMS = 100;

function sourceValue(label) {
  return String(label)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

const VALIDATORS = {
  industries(body) {
    const raw = Array.isArray(body?.items) ? body.items : [];
    const seen = new Set();
    const items = [];
    for (const r of raw) {
      const v = String(r || '').trim().slice(0, 80);
      if (!v || seen.has(v.toLowerCase())) continue;
      seen.add(v.toLowerCase());
      items.push(v);
    }
    if (items.length > MAX_ITEMS) return { error: `At most ${MAX_ITEMS} industries` };
    return { value: { items } };
  },
  lead_sources(body) {
    if (body?.items === null) return { value: { items: null } }; // back to the built-in list
    const raw = Array.isArray(body?.items) ? body.items : [];
    const seen = new Set();
    const items = [];
    for (const r of raw) {
      const label = String((r && typeof r === 'object' ? r.label : r) || '').trim().slice(0, 60);
      if (!label) continue;
      const value = (r && typeof r === 'object' && r.value ? sourceValue(r.value) : sourceValue(label)) || null;
      if (!value || seen.has(value)) continue;
      seen.add(value);
      items.push({ value, label });
    }
    if (!items.length) return { error: 'Keep at least one lead source' };
    if (items.length > MAX_ITEMS) return { error: `At most ${MAX_ITEMS} lead sources` };
    return { value: { items } };
  },
  notification_prefs(body) {
    const value = {};
    for (const c of NOTIFICATION_CATEGORIES) value[c] = body?.[c] !== false;
    return { value };
  },
};

module.exports = createCoreController(SETTING_UID, ({ strapi }) => ({
  /** GET /crm-settings → { industries, lead_sources, notification_prefs } */
  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const entries = await Promise.all(PUBLIC_KEYS.map(async (k) => [k, await getSetting(strapi, ctx.state.orgId, k)]));
    ctx.set('Cache-Control', 'no-store');
    return { data: Object.fromEntries(entries), meta: { notificationCategories: NOTIFICATION_CATEGORIES } };
  },

  /** PUT /crm-settings/:key */
  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireAppSettingsManage(ctx);
    if (denied) return denied;
    const key = String(ctx.params.key || '');
    const validate = VALIDATORS[key];
    if (!validate) return ctx.badRequest(`Unknown setting "${key}"`);
    const body = ctx.request?.body?.data ?? ctx.request?.body ?? {};
    const { value, error } = validate(body);
    if (error) return ctx.badRequest(error);
    await setSetting(strapi, ctx.state.orgId, key, value);
    return { data: await getSetting(strapi, ctx.state.orgId, key) };
  },
}));
