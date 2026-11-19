'use strict';

/**
 * Lead-capture sources and their per-org configuration (ticket G7).
 *
 * Stored in crm-org-setting under key "lead_capture" (never returned by GET /crm-settings):
 *   { sources: { <key>: { enabled, secret, allowedDomains?, redirectUrl?, successMessage?,
 *                         pull?: { enabled, crmKey, lastPulledAt, lastError } } } }
 *
 * Each source has its own random secret. Public endpoint token = "<orgId>.<secret>", so the org is
 * found without a lookup table and a leaked token only exposes one source of one org (rotate it from
 * Grow Settings → Lead sources). Secrets and the IndiaMART CRM key stay server-side: only CRM settings
 * managers can read the endpoint URLs, and the CRM key is write-only (the UI only sees "set / not set").
 */

const crypto = require('crypto');
const { getSetting, setSetting } = require('../crm-org-settings');

const SETTING_KEY = 'lead_capture';

const SOURCES = {
  web_form: { slug: 'web-form', label: 'Website form', leadSource: 'WEBSITE', kind: 'form' },
  google_ads: { slug: 'google-ads', label: 'Google Ads lead forms', leadSource: 'GOOGLE_ADS', kind: 'webhook' },
  indiamart: { slug: 'indiamart', label: 'IndiaMART', leadSource: 'INDIAMART', kind: 'webhook', pull: true },
  justdial: { slug: 'justdial', label: 'JustDial', leadSource: 'JUSTDIAL', kind: 'webhook', email: true },
  ninety_nine_acres: { slug: '99acres', label: '99acres', leadSource: '99ACRES', kind: 'webhook', email: true },
  magicbricks: { slug: 'magicbricks', label: 'MagicBricks', leadSource: 'MAGICBRICKS', kind: 'webhook', email: true },
};

const SLUG_TO_KEY = Object.fromEntries(Object.entries(SOURCES).map(([k, v]) => [v.slug, k]));

function sourceKeyFromSlug(slug) {
  const s = String(slug || '').toLowerCase();
  return SLUG_TO_KEY[s] || (SOURCES[s] ? s : null);
}

function newSecret() {
  return crypto.randomBytes(18).toString('base64url');
}

function buildToken(orgId, secret) {
  return `${orgId}.${secret}`;
}

/** "<orgId>.<secret>" → { orgId, secret } or null. */
function parseToken(token) {
  const m = String(token || '').match(/^(\d{1,10})\.([A-Za-z0-9_-]{16,64})$/);
  if (!m) return null;
  return { orgId: Number(m[1]), secret: m[2] };
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  if (!x.length || x.length !== y.length) return false;
  return crypto.timingSafeEqual(x, y);
}

async function getCaptureConfig(strapi, orgId) {
  const v = await getSetting(strapi, orgId, SETTING_KEY);
  const sources = v && typeof v === 'object' && v.sources && typeof v.sources === 'object' ? v.sources : {};
  return { sources };
}

async function saveCaptureConfig(strapi, orgId, config) {
  await setSetting(strapi, orgId, SETTING_KEY, { sources: config.sources || {} });
}

/** Normalise "https://www.Example.com/path" / "example.com" → "example.com". */
function domainOf(value) {
  const s = String(value || '').trim().toLowerCase();
  if (!s) return '';
  try {
    const host = new URL(s.includes('://') ? s : `https://${s}`).hostname;
    return host.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

/** True when no domains are configured, or the request's Origin/Referer host is one of them (or a subdomain). */
function originAllowed(allowedDomains, origin, referer) {
  const list = (Array.isArray(allowedDomains) ? allowedDomains : []).map(domainOf).filter(Boolean);
  if (!list.length) return true;
  const host = domainOf(origin) || domainOf(referer);
  if (!host) return false;
  return list.some((d) => host === d || host.endsWith(`.${d}`));
}

module.exports = {
  SETTING_KEY,
  SOURCES,
  sourceKeyFromSlug,
  newSecret,
  buildToken,
  parseToken,
  safeEqual,
  getCaptureConfig,
  saveCaptureConfig,
  domainOf,
  originAllowed,
};
