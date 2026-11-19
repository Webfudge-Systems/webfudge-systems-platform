'use strict';

const crypto = require('node:crypto');

function sha256Hex(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

function hmacSha256Hex(secret, payload) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/** Constant-time comparison of two hex strings. */
function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/** appsecret_proof for Graph calls: HMAC-SHA256 of the access token keyed with the app secret. */
function appSecretProof(accessToken, appSecret) {
  return hmacSha256Hex(appSecret, accessToken);
}

module.exports = { sha256Hex, hmacSha256Hex, timingSafeEqualHex, appSecretProof };
