'use strict';

const { isAdminRole } = require('./rbac');

function getMembershipId(ctx) {
  return ctx.state.orgMembership?.id ?? null;
}

function orgRoleFromCtx(ctx) {
  return ctx?.state?.orgRoleDetails || { name: ctx?.state?.orgRole, code: ctx?.state?.orgRoleCode };
}

function isHrAdmin(ctx) {
  if (isAdminRole(orgRoleFromCtx(ctx))) return true;
  const hr = ctx.state.orgPermissions?.hr?.modules;
  if (!hr) return false;
  return Object.values(hr).some((module) => module?.access === 'manage');
}

function assertSelfOrHrAdmin(ctx, orgUserId) {
  if (isHrAdmin(ctx)) return true;
  const membershipId = getMembershipId(ctx);
  return membershipId != null && String(membershipId) === String(orgUserId);
}

module.exports = {
  getMembershipId,
  isHrAdmin,
  assertSelfOrHrAdmin,
};
