'use strict';

/**
 * Meta webhook helpers: GET verify-token handshake and X-Hub-Signature-256 (HMAC SHA-256 of the
 * raw body, keyed with the app secret) for POST deliveries.
 */

const { hmacSha256Hex, timingSafeEqualHex } = require('./hash');

/** GET handshake: echo hub.challenge only when hub.mode=subscribe and the verify token matches. */
function verifyWebhookChallenge(query, expectedVerifyToken) {
  const q = query || {};
  if (
    q['hub.mode'] === 'subscribe' &&
    !!expectedVerifyToken &&
    typeof q['hub.verify_token'] === 'string' &&
    timingSafeEqualHex(Buffer.from(q['hub.verify_token']).toString('hex'), Buffer.from(expectedVerifyToken).toString('hex')) &&
    typeof q['hub.challenge'] === 'string'
  ) {
    return { ok: true, challenge: q['hub.challenge'] };
  }
  return { ok: false };
}

/**
 * Validate X-Hub-Signature-256 against the RAW request body (string or Buffer).
 * Mandatory on every POST: never act on an unverified payload.
 */
function verifyWebhookSignature(rawBody, signatureHeader, appSecret) {
  if (!signatureHeader || !appSecret || rawBody == null) return false;
  const prefix = 'sha256=';
  if (typeof signatureHeader !== 'string' || !signatureHeader.startsWith(prefix)) return false;
  const provided = signatureHeader.slice(prefix.length).toLowerCase();
  const computed = hmacSha256Hex(appSecret, typeof rawBody === 'string' ? rawBody : Buffer.from(rawBody));
  return timingSafeEqualHex(provided, computed);
}

const str = (v) => (v != null && v !== '' ? String(v) : undefined);

/** Extract leadgen changes from a parsed webhook body: [{ leadgenId, formId, pageId, adId, adgroupId, createdTime }]. */
function extractLeadgenEvents(payload) {
  const events = [];
  if (!payload || payload.object !== 'page' || !Array.isArray(payload.entry)) return events;
  for (const entry of payload.entry) {
    for (const change of (entry && entry.changes) || []) {
      const v = change && change.value;
      if (!change || change.field !== 'leadgen' || !v || !v.leadgen_id) continue;
      events.push({
        leadgenId: String(v.leadgen_id),
        formId: str(v.form_id),
        pageId: str(v.page_id) || str(entry.id),
        adId: str(v.ad_id),
        adgroupId: str(v.adgroup_id),
        createdTime: v.created_time,
      });
    }
  }
  return events;
}

module.exports = { verifyWebhookChallenge, verifyWebhookSignature, extractLeadgenEvents };
