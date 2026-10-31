'use strict';

/**
 * One codebase, two deployments:
 *   internal: Webfudge's own CRM/PM (current production data)
 *   saas:     the customer-facing product (separate database, Redis, S3, secrets)
 *
 * Set PLATFORM_MODE on the API service. Unset means "internal" so the existing
 * production deployment keeps working without any env change.
 */

const MODES = ['internal', 'saas'];

// Kept only so the existing internal deployment does not break if JWT_SECRET was never set.
const LEGACY_FALLBACK_JWT_SECRET = 'myJwtSecret123456789012345678901234567890';

function platformMode() {
  const raw = (process.env.PLATFORM_MODE || 'internal').trim().toLowerCase();
  if (!MODES.includes(raw)) {
    throw new Error(`PLATFORM_MODE must be one of ${MODES.join(', ')} (got "${process.env.PLATFORM_MODE}")`);
  }
  return raw;
}

function isSaas() {
  return platformMode() === 'saas';
}

function jwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (isSaas()) {
    throw new Error('JWT_SECRET must be set when PLATFORM_MODE=saas');
  }
  if (process.env.NODE_ENV === 'production') {
    console.warn('⚠️ JWT_SECRET is not set — using the legacy fallback secret. Set JWT_SECRET on this service.');
  }
  return LEGACY_FALLBACK_JWT_SECRET;
}

module.exports = { MODES, platformMode, isSaas, jwtSecret };
