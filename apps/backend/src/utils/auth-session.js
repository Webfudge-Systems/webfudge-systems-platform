'use strict';

/** Session helpers shared by the auth and SaaS controllers. */

const jwt = require('jsonwebtoken');
const { createOrganizationOwnerMembership } = require('./organization-role');
const { membershipSummary } = require('./rbac');
const { jwtSecret, isSaas } = require('./platform');

const JWT_SECRET = jwtSecret();

const ORG_MEMBERSHIP_UID = 'api::organization-user.organization-user';

function getFallbackOrgName(user) {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return `${fullName}'s Organization`;
  const emailPrefix = (user.email || '').split('@')[0].trim();
  if (emailPrefix) return `${emailPrefix}'s Organization`;
  return `Organization ${user.id}`;
}

function toSlug(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function listActiveMemberships(userId, withModules = false) {
  return strapi.entityService.findMany(ORG_MEMBERSHIP_UID, {
    filters: { user: userId, isActive: true },
    sort: { joinedAt: 'ASC' },
    populate: {
      role: true,
      organization: {
        populate: {
          subscriptions: {
            populate: withModules ? { app: true, selectedModules: true } : { app: true },
          },
        },
      },
    },
  });
}

async function ensureActiveOrganizationMembership(user) {
  let memberships = await listActiveMemberships(user.id, true);
  if (memberships.length > 0) return memberships;

  // On SaaS, people create their organization explicitly during onboarding.
  if (isSaas()) return memberships;

  const orgName = getFallbackOrgName(user);
  const baseSlug = toSlug(orgName) || `organization-${user.id}`;
  let slug = `${baseSlug}-${user.id}`;
  let suffix = 1;

  while (true) {
    const existing = await strapi.entityService.findMany('api::organization.organization', {
      filters: { slug },
      limit: 1,
    });
    if (existing.length === 0) break;
    suffix += 1;
    slug = `${baseSlug}-${user.id}-${suffix}`;
  }

  const organization = await strapi.entityService.create('api::organization.organization', {
    data: {
      name: orgName,
      slug,
      owner: user.id,
      status: 'trial',
      onboardingCompleted: false,
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  });

  await createOrganizationOwnerMembership(strapi, {
    userId: user.id,
    organizationId: organization.id,
  });

  memberships = await listActiveMemberships(user.id, true);
  return memberships;
}

function organizationPayload(membership) {
  const summary = membershipSummary(membership);
  return {
    ...membership.organization,
    role: summary.role,
    roleCode: summary.roleCode,
    roleId: summary.roleId,
    accessLevel: summary.accessLevel,
    permissions: summary.permissions,
    customPermissions: summary.customPermissions,
    joinedAt: summary.joinedAt,
  };
}

function userPayload(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone || null,
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

async function sessionPayload(user) {
  const organizations = await ensureActiveOrganizationMembership(user);
  return {
    jwt: signToken(user),
    user: userPayload(user),
    organizations: organizations.map(organizationPayload),
  };
}

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

/** Returns a message when the password is too weak, otherwise null. */
function passwordProblem(password) {
  const value = String(password || '');
  if (value.length < 8) return 'Use at least 8 characters.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Use a mix of letters and numbers.';
  return null;
}

module.exports = {
  ensureActiveOrganizationMembership,
  listActiveMemberships,
  organizationPayload,
  userPayload,
  signToken,
  sessionPayload,
  normalizeEmail,
  isEmail,
  passwordProblem,
};
