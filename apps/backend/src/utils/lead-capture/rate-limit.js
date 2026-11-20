'use strict';

/**
 * Fixed-window, in-memory rate limiter for the public lead-capture endpoints (ticket G7).
 * Per API instance: with N instances the effective limit is N× — fine for spam protection, which is
 * the goal here (the honeypot, timing check and optional allowed-domains list do the rest).
 *
 * Limits (env, optional):
 *   LEAD_CAPTURE_IP_LIMIT_PER_MIN   website-form submissions per IP per minute   (default 10)
 *   LEAD_CAPTURE_ORG_LIMIT_PER_HOUR all captures per org per source per hour     (default 600)
 */

const buckets = new Map();
let lastSweep = 0;

function hit(key, limit, windowMs, now = Date.now()) {
  if (now - lastSweep > 60000) {
    for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    lastSweep = now;
  }
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    b = { count: 0, resetAt: now + windowMs };
    buckets.set(key, b);
  }
  b.count += 1;
  return { allowed: b.count <= limit, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

const ipLimit = () => Number(process.env.LEAD_CAPTURE_IP_LIMIT_PER_MIN) || 10;
const orgLimit = () => Number(process.env.LEAD_CAPTURE_ORG_LIMIT_PER_HOUR) || 600;

/** @returns {{ allowed: boolean, retryAfterSec: number, reason?: string }} */
function checkCaptureRate({ orgId, sourceKey, ip, perIp }, now = Date.now()) {
  if (perIp && ip) {
    const r = hit(`ip:${sourceKey}:${ip}`, ipLimit(), 60000, now);
    if (!r.allowed) return { ...r, reason: 'too many submissions from this IP address' };
  }
  const r = hit(`org:${orgId}:${sourceKey}`, orgLimit(), 3600000, now);
  if (!r.allowed) return { ...r, reason: 'hourly capture limit reached for this source' };
  return { allowed: true, retryAfterSec: 0 };
}

function resetRateLimits() {
  buckets.clear();
}

module.exports = { checkCaptureRate, resetRateLimits, hit };
