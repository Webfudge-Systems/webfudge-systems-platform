'use strict';

/**
 * Public lead-capture endpoints (ticket G7). No login: the URL token "<orgId>.<secret>" identifies the org
 * and source. SaaS only (404 on Internal). Order of checks:
 *   source known → token valid for that org + source → source enabled → org has Grow (full access) →
 *   rate limit → (web form) allowed domains + honeypot/timing → (Google) google_key → map → ingest.
 * Every outcome except unknown source / malformed token is written to the org's capture event log.
 */

const { isSaas } = require('../../../utils/platform');
const { getOrgAccess } = require('../../../utils/saas-access');
const { ingestLead, logCaptureEvent } = require('../../../utils/lead-ingest');
const { SOURCES, sourceKeyFromSlug, parseToken, safeEqual, getCaptureConfig, originAllowed } = require('../../../utils/lead-capture/config');
const { checkCaptureRate } = require('../../../utils/lead-capture/rate-limit');
const { mapWebForm, mapGoogleAds, mapIndiaMart, mapJustDial, mapPropertyPortal } = require('../../../utils/lead-capture/mappers');
const { parseLeadEmail } = require('../../../utils/lead-capture/email-parsers');

function clientIp(ctx) {
  const fwd = String(ctx.request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || ctx.request.ip || '').slice(0, 64);
}

/** Website forms posted without JavaScript expect a page, not JSON. */
function wantsHtml(ctx) {
  const accept = String(ctx.request.headers.accept || '');
  return accept.includes('text/html') && !accept.includes('application/json');
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function safeRedirect(url) {
  try {
    const u = new URL(String(url));
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch (_) {
    return null;
  }
}

function reply(ctx, sourceKey, status, body, { cfg } = {}) {
  ctx.set('Cache-Control', 'no-store');
  if (sourceKey === 'web_form') {
    // Our snippet reads the JSON with fetch (simple CORS request → no preflight). Allow any origin to read
    // the result; access is controlled by the secret token and the optional allowed-domains list.
    ctx.set('Access-Control-Allow-Origin', '*');
    if (wantsHtml(ctx)) {
      const ok = status < 300;
      const redirect = ok && safeRedirect(cfg?.redirectUrl);
      if (redirect) {
        ctx.status = 303;
        ctx.redirect(redirect);
        return;
      }
      ctx.status = status;
      ctx.type = 'html';
      const text = ok ? cfg?.successMessage || 'Thank you! We will get in touch with you shortly.' : body?.error?.message || 'Something went wrong.';
      ctx.body = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${ok ? 'Thank you' : 'Not sent'}</title><body style="font-family:system-ui,sans-serif;max-width:32rem;margin:4rem auto;padding:0 1rem;color:#111"><h1 style="font-size:1.4rem">${ok ? 'Thank you' : 'Your message was not sent'}</h1><p>${escapeHtml(text)}</p><p><a href="javascript:history.back()">Go back</a></p></body>`;
      return;
    }
  }
  ctx.status = status;
  ctx.body = body;
}

const fail = (ctx, sourceKey, status, message, code, extra) => reply(ctx, sourceKey, status, { ok: false, error: { status, code, message } }, extra);

function requestBody(ctx) {
  const body = ctx.request.body;
  const base = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  return ctx.method === 'GET' ? { ...ctx.query } : { ...ctx.query, ...base };
}

async function handle(ctx, { viaEmail }) {
  if (!isSaas()) return ctx.notFound();
  const sourceKey = sourceKeyFromSlug(ctx.params.source);
  if (!sourceKey) return ctx.notFound('Unknown lead source');
  const meta = SOURCES[sourceKey];
  if (viaEmail && !meta.email) return ctx.notFound('This source does not accept lead emails');
  if (ctx.method === 'GET' && !['justdial', 'ninety_nine_acres', 'magicbricks'].includes(sourceKey)) {
    return fail(ctx, sourceKey, 405, 'Send leads with POST', 'METHOD_NOT_ALLOWED');
  }

  const token = parseToken(ctx.params.token);
  if (!token) return fail(ctx, sourceKey, 401, 'Invalid capture link', 'BAD_TOKEN');
  const { orgId } = token;
  const ip = clientIp(ctx);
  const config = await getCaptureConfig(strapi, orgId);
  const cfg = config.sources[sourceKey] || {};
  if (!cfg.secret || !safeEqual(cfg.secret, token.secret)) {
    if (cfg.secret) await logCaptureEvent(strapi, { orgId, sourceKey, status: 'rejected', ip, message: 'Wrong or rotated secret in the capture link' });
    return fail(ctx, sourceKey, 401, 'Invalid capture link', 'BAD_TOKEN');
  }
  if (!cfg.enabled) {
    await logCaptureEvent(strapi, { orgId, sourceKey, status: 'rejected', ip, message: `${meta.label} is switched off in Grow settings` });
    return fail(ctx, sourceKey, 403, 'This lead source is switched off', 'SOURCE_DISABLED', { cfg });
  }
  const access = await getOrgAccess(strapi, orgId);
  if ((access?.crm?.access || 'none') !== 'full') {
    await logCaptureEvent(strapi, { orgId, sourceKey, status: 'rejected', ip, message: 'Fudge Grow is not active (trial ended, plan expired or app not added)' });
    return fail(ctx, sourceKey, 402, 'Lead capture is paused for this organization', 'APP_NOT_ACTIVE', { cfg });
  }
  const rate = checkCaptureRate({ orgId, sourceKey, ip, perIp: sourceKey === 'web_form' });
  if (!rate.allowed) {
    ctx.set('Retry-After', String(rate.retryAfterSec));
    await logCaptureEvent(strapi, { orgId, sourceKey, status: 'rate_limited', ip, message: rate.reason });
    return fail(ctx, sourceKey, 429, 'Too many submissions. Please try again in a minute.', 'RATE_LIMITED', { cfg });
  }

  const body = requestBody(ctx);
  let mapped;
  if (viaEmail) {
    mapped = parseLeadEmail(sourceKey, body);
  } else if (sourceKey === 'web_form') {
    if (!originAllowed(cfg.allowedDomains, ctx.request.headers.origin, ctx.request.headers.referer)) {
      await logCaptureEvent(strapi, { orgId, sourceKey, status: 'rejected', ip, message: `Form posted from a site that is not in the allowed list (${ctx.request.headers.origin || ctx.request.headers.referer || 'no origin'})`.slice(0, 480) });
      return fail(ctx, sourceKey, 403, 'This form is not allowed to post from this website', 'ORIGIN_NOT_ALLOWED', { cfg });
    }
    mapped = mapWebForm(body);
    if (mapped.spam) {
      await logCaptureEvent(strapi, { orgId, sourceKey, status: 'spam', ip, message: `Blocked as spam: ${mapped.spam}` });
      // Look like success to bots.
      return reply(ctx, sourceKey, 200, { ok: true }, { cfg });
    }
  } else if (sourceKey === 'google_ads') {
    mapped = mapGoogleAds(body);
    if (!safeEqual(mapped.googleKey, cfg.secret)) {
      await logCaptureEvent(strapi, { orgId, sourceKey, status: 'rejected', ip, externalId: mapped.externalId, message: 'google_key does not match the key set in Grow settings' });
      return fail(ctx, sourceKey, 401, 'Invalid google_key', 'BAD_GOOGLE_KEY');
    }
    if (mapped.isTest) {
      await logCaptureEvent(strapi, { orgId, sourceKey, status: 'test', ip, externalId: mapped.externalId, message: 'Test lead from Google Ads received (no lead created)', details: mapped.lead });
      return reply(ctx, sourceKey, 200, {});
    }
  } else if (sourceKey === 'indiamart') {
    mapped = mapIndiaMart(body);
  } else if (sourceKey === 'justdial') {
    mapped = mapJustDial(body);
  } else {
    mapped = mapPropertyPortal(body, meta.label);
  }

  try {
    const result = await ingestLead(strapi, {
      orgId,
      source: meta.leadSource,
      sourceLabel: meta.label,
      sourceKey,
      lead: mapped.lead,
      sourceDetails: { ...mapped.sourceDetails, ...(ctx.method === 'GET' ? { via: 'GET push' } : {}) },
      externalId: mapped.externalId,
      ip,
    });
    if (sourceKey === 'google_ads') return reply(ctx, sourceKey, 200, {});
    if (sourceKey === 'indiamart') return reply(ctx, sourceKey, 200, { CODE: 200, STATUS: 'SUCCESS', ok: true, status: result.status });
    return reply(ctx, sourceKey, 200, { ok: true, status: result.status, message: cfg.successMessage || undefined }, { cfg });
  } catch (err) {
    if (err?.code === 'NO_CONTACT_INFO') {
      await logCaptureEvent(strapi, { orgId, sourceKey, status: 'rejected', ip, externalId: mapped.externalId, message: 'No email address or phone number in the payload' });
      return fail(ctx, sourceKey, 422, 'Please enter an email address or phone number', 'NO_CONTACT_INFO', { cfg });
    }
    strapi.log.error(`[lead-capture] ${sourceKey} org ${orgId}: ${err?.stack || err}`);
    await logCaptureEvent(strapi, { orgId, sourceKey, status: 'error', ip, externalId: mapped.externalId, message: `Could not save the lead: ${err?.message || err}` });
    return fail(ctx, sourceKey, 500, 'Could not save the lead', 'INGEST_FAILED', { cfg });
  }
}

module.exports = {
  async capture(ctx) {
    return handle(ctx, { viaEmail: false });
  },
  async captureEmail(ctx) {
    return handle(ctx, { viaEmail: true });
  },
};
