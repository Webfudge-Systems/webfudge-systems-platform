'use strict';

/**
 * Access rules for the internal investment manager (apps/invest).
 *
 * The data is Webfudge's own money, so access is deliberately narrow:
 *   1. Never available on the SaaS deployment (PLATFORM_MODE=saas): every route answers 404.
 *   2. A signed-in user with an active organization (global jwt-auth middleware).
 *   3. INVEST_ORG_IDS (comma-separated org ids), when set, limits which organization may use it.
 *   4. INVEST_ALLOWED_EMAILS (comma-separated), when set, is the exact list of people allowed.
 *      When it is unset, only organization Admins are allowed.
 */

const { isSaas } = require('../platform');
const { isAdminRole } = require('../rbac');

function csv(value) {
  return String(value || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

/** @returns {{ allowed: boolean, status?: number, reason?: string }} */
function evaluateInvestAccess(ctx) {
  if (isSaas()) return { allowed: false, status: 404, reason: 'Not found' };
  const user = ctx.state?.user;
  if (!user) return { allowed: false, status: 401, reason: 'Missing or invalid credentials' };
  if (!ctx.state.orgId) return { allowed: false, status: 403, reason: 'No active organization' };

  const orgIds = csv(process.env.INVEST_ORG_IDS);
  if (orgIds.length && !orgIds.includes(String(ctx.state.orgId))) {
    return { allowed: false, status: 403, reason: 'The investment manager is not enabled for this organization' };
  }

  const emails = csv(process.env.INVEST_ALLOWED_EMAILS);
  if (emails.length) {
    const email = String(user.email || '').trim().toLowerCase();
    if (!emails.includes(email)) {
      return { allowed: false, status: 403, reason: 'You are not on the investment manager access list' };
    }
    return { allowed: true };
  }

  const role = ctx.state.orgRoleDetails || { name: ctx.state.orgRole, code: ctx.state.orgRoleCode };
  if (!isAdminRole(role)) {
    return { allowed: false, status: 403, reason: 'Only organization admins can open the investment manager' };
  }
  return { allowed: true };
}

/**
 * Guard for controllers. Returns true when the request may continue; otherwise sets the
 * response and returns false.
 */
function requireInvestAccess(ctx) {
  const result = evaluateInvestAccess(ctx);
  if (result.allowed) return true;
  if (result.status === 404) ctx.notFound(result.reason);
  else if (result.status === 401) ctx.unauthorized(result.reason);
  else ctx.forbidden(result.reason);
  return false;
}

module.exports = { evaluateInvestAccess, requireInvestAccess };
