'use strict';

/** Organization membership helpers for the SaaS and billing controllers. */

const { resolveOrganizationRoleIdForOrg } = require('./organization-role');
const { membershipSummary } = require('./rbac');

const MEMBERSHIP_UID = 'api::organization-user.organization-user';

const relationId = (value) => (value && typeof value === 'object' ? value.id : value);

async function getMembership(strapi, userId, orgId) {
  const [membership] = await strapi.entityService.findMany(MEMBERSHIP_UID, {
    filters: { user: userId, organization: orgId, isActive: true },
    populate: { role: true, organization: { populate: { owner: { fields: ['id'] } } } },
    limit: 1,
  });
  return membership || null;
}

function isAdminMembership(membership, userId) {
  if (!membership) return false;
  const ownerId = relationId(membership.organization?.owner);
  if (ownerId != null && String(ownerId) === String(userId)) return true;
  return membershipSummary(membership).roleCode === 'admin';
}

/**
 * Loads the caller's membership of :id and checks it.
 * Returns { membership, organization, isAdmin } or null after answering the request.
 */
async function requireMember(ctx, strapi, orgId, { admin = false } = {}) {
  const user = ctx.state.user;
  if (!user) {
    ctx.unauthorized('Sign in to continue.');
    return null;
  }
  const membership = await getMembership(strapi, user.id, orgId);
  if (!membership) {
    ctx.forbidden('You are not a member of this organization.');
    return null;
  }
  const isAdmin = isAdminMembership(membership, user.id);
  if (admin && !isAdmin) {
    ctx.forbidden('Only organization admins can do this.');
    return null;
  }
  return { membership, organization: membership.organization, isAdmin };
}

async function memberCount(strapi, orgId) {
  return strapi.entityService.count(MEMBERSHIP_UID, { filters: { organization: orgId, isActive: true } });
}

/** Adds (or re-activates) a member with the given role name/code. */
async function addMember(strapi, { orgId, userId, role = 'Member' }) {
  const roleId = await resolveOrganizationRoleIdForOrg(strapi, role, orgId);
  const [existing] = await strapi.entityService.findMany(MEMBERSHIP_UID, {
    filters: { user: userId, organization: orgId },
    limit: 1,
  });
  if (existing) {
    return strapi.entityService.update(MEMBERSHIP_UID, existing.id, { data: { isActive: true, role: roleId } });
  }
  return strapi.entityService.create(MEMBERSHIP_UID, {
    data: { user: userId, organization: orgId, role: roleId, isActive: true, joinedAt: new Date(), customPermissions: {} },
  });
}

/**
 * Active plans cap members plus pending invitations: the Free plan by its user limit, paid plans by
 * the seats bought. Returns a message when adding `adding` more people would go over, otherwise null.
 */
async function seatLimitProblem(strapi, orgId, adding) {
  const activeSubs = await strapi.entityService.findMany('api::subscription.subscription', {
    filters: { organization: orgId, status: 'active' },
    populate: { plan: true, app: true },
  });
  const limits = activeSubs
    .map((s) => ({ app: s.app?.name, cap: s.planCode === 'free' ? s.plan?.maxUsers : s.totalUsers, free: s.planCode === 'free' }))
    .filter((l) => l.cap);
  if (!limits.length) return null;
  const pending = await strapi.entityService.count('api::invitation.invitation', {
    filters: { organization: orgId, status: 'pending', expiresAt: { $gt: new Date() } },
  });
  const total = (await memberCount(strapi, orgId)) + pending + adding;
  const tight = limits.filter((l) => total > l.cap);
  if (!tight.length) return null;
  const names = tight.map((l) => l.app).join(' and ');
  const cap = Math.min(...tight.map((l) => l.cap));
  return tight.some((l) => l.free)
    ? `The Free plan allows up to ${cap} people. Upgrade ${names} to invite more.`
    : `Your ${names} plan covers ${cap} users. Add users in Apps & billing first.`;
}

module.exports = { MEMBERSHIP_UID, relationId, getMembership, isAdminMembership, requireMember, memberCount, addMember, seatLimitProblem };
