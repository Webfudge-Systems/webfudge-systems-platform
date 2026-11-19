'use strict';

/**
 * Grow Settings → Lead sources (ticket G7). CRM/PM settings managers only: the response contains the
 * secret capture URLs. The IndiaMART CRM key is write-only (responses only say whether it is set).
 *
 * Env: LEAD_CAPTURE_BASE_URL — public API origin used in the URLs shown to users, e.g.
 * https://api.webfudgesystems.in (falls back to the request's forwarded host/protocol).
 */

const { isSaas } = require('../../../utils/platform');
const { requireAppSettingsManage } = require('../../../utils/rbac');
const { EVENT_UID } = require('../../../utils/lead-ingest');
const { SOURCES, sourceKeyFromSlug, newSecret, buildToken, getCaptureConfig, saveCaptureConfig, domainOf } = require('../../../utils/lead-capture/config');
const { pullForOrg } = require('../../../utils/lead-capture/indiamart-pull');

function guard(ctx) {
  // `|| true`: Strapi's ctx helpers set the response but may not return a truthy value.
  if (!isSaas()) return ctx.notFound() || true;
  if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials') || true;
  if (!ctx.state.orgId) return ctx.forbidden('No active organization') || true;
  const denied = requireAppSettingsManage(ctx);
  return denied ? denied || true : null;
}

function baseUrl(ctx) {
  const env = String(process.env.LEAD_CAPTURE_BASE_URL || '').trim().replace(/\/+$/, '');
  if (env) return env;
  const proto = String(ctx.request.headers['x-forwarded-proto'] || ctx.request.protocol || 'https').split(',')[0].trim();
  const host = String(ctx.request.headers['x-forwarded-host'] || ctx.request.host).split(',')[0].trim();
  return `${proto}://${host}`;
}

function describe(ctx, orgId, key, cfg, stats) {
  const meta = SOURCES[key];
  const token = cfg.secret ? buildToken(orgId, cfg.secret) : null;
  const url = token ? `${baseUrl(ctx)}/api/lead-capture/${meta.slug}/${token}` : null;
  const out = {
    key,
    slug: meta.slug,
    label: meta.label,
    leadSource: meta.leadSource,
    kind: meta.kind,
    enabled: Boolean(cfg.enabled),
    endpointUrl: url,
    emailEndpointUrl: meta.email && url ? `${url}/email` : null,
    stats: stats[key] || {},
  };
  if (key === 'google_ads') out.googleKey = cfg.secret || null;
  if (key === 'web_form') {
    out.allowedDomains = Array.isArray(cfg.allowedDomains) ? cfg.allowedDomains : [];
    out.redirectUrl = cfg.redirectUrl || '';
    out.successMessage = cfg.successMessage || '';
  }
  if (meta.pull) {
    const p = cfg.pull || {};
    out.pull = {
      enabled: Boolean(p.enabled),
      hasCrmKey: Boolean(p.crmKey),
      lastPulledAt: p.lastPulledAt || null,
      lastAttemptAt: p.lastAttemptAt || null,
      lastError: p.lastError || null,
      lastResult: p.lastResult || null,
    };
  }
  return out;
}

async function recentEvents(strapi, orgId, { source, limit = 50 } = {}) {
  const filters = { organization: orgId };
  if (source) filters.source = source;
  return strapi.entityService.findMany(EVENT_UID, {
    filters,
    fields: ['id', 'source', 'status', 'message', 'externalId', 'leadCompanyId', 'contactId', 'matchedOn', 'createdAt'],
    sort: [{ createdAt: 'desc' }, { id: 'desc' }],
    limit: Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200),
  });
}

/** Last-7-day counts per source and status. */
async function weekStats(strapi, orgId) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const rows = await strapi.entityService.findMany(EVENT_UID, {
    filters: { organization: orgId, createdAt: { $gte: since } },
    fields: ['source', 'status'],
    limit: 20000,
  });
  const stats = {};
  for (const r of rows) {
    stats[r.source] = stats[r.source] || {};
    stats[r.source][r.status] = (stats[r.source][r.status] || 0) + 1;
  }
  return stats;
}

function cleanDomains(list) {
  const arr = Array.isArray(list) ? list : typeof list === 'string' ? list.split(/[\s,]+/) : [];
  return [...new Set(arr.map(domainOf).filter(Boolean))].slice(0, 20);
}

module.exports = {
  async overview(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const orgId = ctx.state.orgId;
    const [config, stats, events] = await Promise.all([getCaptureConfig(strapi, orgId), weekStats(strapi, orgId), recentEvents(strapi, orgId)]);
    ctx.set('Cache-Control', 'no-store');
    return {
      data: {
        sources: Object.keys(SOURCES).map((k) => describe(ctx, orgId, k, config.sources[k] || {}, stats)),
        events,
      },
    };
  },

  async events(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const source = ctx.query.source ? sourceKeyFromSlug(ctx.query.source) : null;
    ctx.set('Cache-Control', 'no-store');
    return { data: await recentEvents(strapi, ctx.state.orgId, { source, limit: ctx.query.limit }) };
  },

  /** PUT /crm-lead-capture/:source { enabled, allowedDomains, redirectUrl, successMessage, pull: { enabled, crmKey } } */
  async update(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const key = sourceKeyFromSlug(ctx.params.source);
    if (!key) return ctx.badRequest('Unknown lead source');
    const body = ctx.request?.body?.data ?? ctx.request?.body ?? {};
    const orgId = ctx.state.orgId;
    const config = await getCaptureConfig(strapi, orgId);
    const cfg = { ...(config.sources[key] || {}) };

    if (body.enabled !== undefined) cfg.enabled = Boolean(body.enabled);
    if (cfg.enabled && !cfg.secret) cfg.secret = newSecret();
    if (key === 'web_form') {
      if (body.allowedDomains !== undefined) cfg.allowedDomains = cleanDomains(body.allowedDomains);
      if (body.redirectUrl !== undefined) {
        const r = String(body.redirectUrl || '').trim();
        if (r && !/^https?:\/\/[^\s]+$/i.test(r)) return ctx.badRequest('Thank-you page must be a full http(s) URL');
        cfg.redirectUrl = r.slice(0, 500);
      }
      if (body.successMessage !== undefined) cfg.successMessage = String(body.successMessage || '').trim().slice(0, 300);
    }
    if (SOURCES[key].pull && body.pull && typeof body.pull === 'object') {
      const pull = { ...(cfg.pull || {}) };
      if (body.pull.crmKey !== undefined) {
        const k = String(body.pull.crmKey || '').trim();
        if (k && !/^[A-Za-z0-9+/=._-]{10,200}$/.test(k)) return ctx.badRequest('That does not look like an IndiaMART CRM key');
        pull.crmKey = k || null;
        pull.lastError = null;
      }
      if (body.pull.enabled !== undefined) pull.enabled = Boolean(body.pull.enabled);
      if (pull.enabled && !pull.crmKey) return ctx.badRequest('Paste your IndiaMART CRM key to turn on pulling');
      cfg.pull = pull;
    }

    config.sources[key] = cfg;
    await saveCaptureConfig(strapi, orgId, config);
    return { data: describe(ctx, orgId, key, cfg, await weekStats(strapi, orgId)) };
  },

  async rotate(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const key = sourceKeyFromSlug(ctx.params.source);
    if (!key) return ctx.badRequest('Unknown lead source');
    const orgId = ctx.state.orgId;
    const config = await getCaptureConfig(strapi, orgId);
    config.sources[key] = { ...(config.sources[key] || {}), secret: newSecret() };
    await saveCaptureConfig(strapi, orgId, config);
    return { data: describe(ctx, orgId, key, config.sources[key], await weekStats(strapi, orgId)) };
  },

  async pullIndiaMart(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const result = await pullForOrg(strapi, ctx.state.orgId, { force: true });
    return { data: result };
  },
};
