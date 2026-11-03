'use strict';

/**
 * Self-serve SaaS: catalogue, organizations, per-app trials, the Home hub and invitations.
 * Every action except the public catalogue and invitation lookup needs a signed-in user.
 */

const { isSaas } = require('../../../utils/platform');
const { createOrganizationOwnerMembership } = require('../../../utils/organization-role');
const { membershipSummary } = require('../../../utils/rbac');
const { uniqueUsernameFromEmail } = require('../../../utils/user-username');
const { TRIAL_DAYS, DAY, getOrgAccess, invalidateOrgAccess } = require('../../../utils/saas-access');
const { requireMember, memberCount, addMember, relationId, seatLimitProblem, MEMBERSHIP_UID } = require('../../../utils/saas-org');
const { sessionPayload, userPayload, normalizeEmail, isEmail, passwordProblem } = require('../../../utils/auth-session');

const ORG_UID = 'api::organization.organization';
const APP_UID = 'api::app.app';
const PLAN_UID = 'api::plan.plan';
const SUB_UID = 'api::subscription.subscription';
const INVITE_UID = 'api::invitation.invitation';
const USER_UID = 'plugin::users-permissions.user';

const INDUSTRIES = ['technology', 'finance', 'healthcare', 'education', 'retail', 'manufacturing', 'services', 'other'];
const SIZES = ['size_1_10', 'size_11_50', 'size_51_200', 'size_201_500', 'size_500_plus'];
const INVITE_ROLES = { admin: 'Admin', manager: 'Manager', member: 'Member' };

const toSlug = (value) =>
  String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

async function uniqueOrgSlug(name) {
  const base = toSlug(name) || 'organization';
  let slug = base;
  for (let i = 2; ; i += 1) {
    const taken = await strapi.entityService.count(ORG_UID, { filters: { slug } });
    if (!taken) return slug;
    slug = `${base}-${i}`;
  }
}

function serializeApp(app) {
  return {
    id: app.id,
    slug: app.slug,
    name: app.name,
    tagline: app.tagline || app.description || '',
    color: app.color || null,
    availability: app.availability || 'available',
  };
}

function serializePlan(plan) {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    description: plan.description || '',
    pricePerUserMonthly: Number(plan.pricePerUserMonthly) || 0,
    yearlyDiscountPercent: plan.yearlyDiscountPercent ?? 15,
    maxUsers: plan.maxUsers || null,
    features: Array.isArray(plan.features) ? plan.features : [],
    isPopular: Boolean(plan.isPopular),
  };
}

async function loadCatalog() {
  const apps = await strapi.entityService.findMany(APP_UID, {
    filters: { slug: { $ne: 'accounts' }, isActive: true },
    sort: { order: 'asc' },
    limit: 50,
  });
  const plans = await strapi.entityService.findMany(PLAN_UID, {
    filters: { isActive: true },
    populate: { app: { fields: ['slug'] } },
    sort: { order: 'asc' },
    limit: 200,
  });
  return apps.map((app) => ({
    ...serializeApp(app),
    plans: plans.filter((p) => p.app?.slug === app.slug).map(serializePlan),
  }));
}

/** Org card used by the Home hub, the app switcher and CRM/PM banners. */
async function orgSummary(org, membership, userId) {
  const access = await getOrgAccess(strapi, org.id);
  const subs = await strapi.entityService.findMany(SUB_UID, {
    filters: { organization: org.id },
    populate: { app: true },
    limit: 50,
  });
  const summary = membershipSummary(membership);
  const ownerId = relationId(org.owner);
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    industry: org.industry || null,
    size: org.size || null,
    onboardingCompleted: Boolean(org.onboardingCompleted),
    role: summary.role,
    roleCode: summary.roleCode,
    isOwner: ownerId != null && String(ownerId) === String(userId),
    isAdmin: (ownerId != null && String(ownerId) === String(userId)) || summary.roleCode === 'admin',
    memberCount: await memberCount(strapi, org.id),
    apps: subs
      .filter((s) => s.app?.slug)
      .map((s) => ({ ...serializeApp(s.app), ...access[s.app.slug] })),
  };
}

function ensureSaas(ctx) {
  if (isSaas()) return true;
  ctx.notFound('Not available on this platform');
  return false;
}

async function findPendingInvitation(token) {
  if (!token || String(token).length < 20) return null;
  const [inv] = await strapi.entityService.findMany(INVITE_UID, {
    filters: { token: String(token), status: 'pending' },
    populate: { organization: true, invitedBy: { fields: ['firstName', 'lastName', 'email'] } },
    limit: 1,
  });
  if (!inv || new Date(inv.expiresAt).getTime() < Date.now()) return null;
  return inv;
}

async function acceptInvite(inv, user) {
  const orgId = relationId(inv.organization);
  await addMember(strapi, { orgId, userId: user.id, role: inv.role || 'Member' });
  await strapi.entityService.update(INVITE_UID, inv.id, { data: { status: 'accepted', acceptedAt: new Date() } });
  invalidateOrgAccess(orgId);
  return orgId;
}

module.exports = {
  async catalog(ctx) {
    if (!ensureSaas(ctx)) return;
    ctx.send({ apps: await loadCatalog(), trialDays: TRIAL_DAYS });
  },

  async home(ctx) {
    if (!ensureSaas(ctx)) return;
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Sign in to continue.');

    const memberships = await strapi.entityService.findMany(MEMBERSHIP_UID, {
      filters: { user: user.id, isActive: true },
      populate: { role: true, organization: { populate: { owner: { fields: ['id'] } } } },
      sort: { joinedAt: 'asc' },
      limit: 50,
    });
    const organizations = [];
    for (const m of memberships) {
      if (m.organization) organizations.push(await orgSummary(m.organization, m, user.id));
    }

    const invites = await strapi.entityService.findMany(INVITE_UID, {
      filters: { email: normalizeEmail(user.email), status: 'pending', expiresAt: { $gt: new Date() } },
      populate: { organization: { fields: ['name'] }, invitedBy: { fields: ['firstName', 'lastName', 'email'] } },
      limit: 20,
    });
    const memberOf = new Set(organizations.map((o) => String(o.id)));
    ctx.send({
      user: userPayload(user),
      organizations,
      invitations: invites
        .filter((inv) => inv.organization && !memberOf.has(String(inv.organization.id)))
        .map((inv) => ({
          token: inv.token,
          organization: { id: inv.organization.id, name: inv.organization.name },
          role: INVITE_ROLES[String(inv.role || '').toLowerCase()] || 'Member',
          invitedBy: [inv.invitedBy?.firstName, inv.invitedBy?.lastName].filter(Boolean).join(' ') || inv.invitedBy?.email || null,
          expiresAt: inv.expiresAt,
        })),
    });
  },

  async createOrganization(ctx) {
    if (!ensureSaas(ctx)) return;
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Sign in to continue.');
    const { name, industry, size } = ctx.request.body || {};
    const cleanName = String(name || '').trim().replace(/\s+/g, ' ');
    if (cleanName.length < 2 || cleanName.length > 80) {
      return ctx.badRequest('Enter an organization name between 2 and 80 characters.', { field: 'name' });
    }
    const owned = await strapi.entityService.count(ORG_UID, { filters: { owner: user.id } });
    if (owned >= 10) return ctx.badRequest('You can own up to 10 organizations. Contact us if you need more.');

    const org = await strapi.entityService.create(ORG_UID, {
      data: {
        name: cleanName,
        slug: await uniqueOrgSlug(cleanName),
        owner: user.id,
        companyEmail: user.email,
        status: 'trial',
        onboardingCompleted: false,
        industry: INDUSTRIES.includes(industry) ? industry : null,
        size: SIZES.includes(size) ? size : null,
      },
    });
    await createOrganizationOwnerMembership(strapi, { userId: user.id, organizationId: org.id });
    ctx.send({ organization: { id: org.id, name: org.name, slug: org.slug } });
  },

  /** Starts a 14-day trial for each requested app the organization doesn't have yet. */
  async startTrials(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId, { admin: true });
    if (!guard) return;

    const slugs = [...new Set((ctx.request.body?.apps || []).map(String))];
    if (!slugs.length) return ctx.badRequest('Pick at least one app.', { field: 'apps' });

    const apps = await strapi.entityService.findMany(APP_UID, { filters: { slug: { $in: slugs }, isActive: true } });
    const seats = await memberCount(strapi, orgId);
    const started = [];
    for (const app of apps) {
      if (app.slug === 'accounts' || (app.availability && app.availability !== 'available')) continue;
      const exists = await strapi.entityService.count(SUB_UID, { filters: { organization: orgId, app: app.id } });
      if (exists) continue;
      const now = new Date();
      await strapi.entityService.create(SUB_UID, {
        data: {
          organization: orgId,
          app: app.id,
          status: 'trial',
          planCode: 'trial',
          billingCycle: 'monthly',
          totalUsers: Math.max(1, seats),
          startDate: now,
          trialEndsAt: new Date(now.getTime() + TRIAL_DAYS * DAY),
          autoRenew: false,
          remindersSent: {},
        },
      });
      started.push(app.slug);
    }
    if (!started.length && !apps.length) return ctx.badRequest('Those apps are not available yet.', { field: 'apps' });
    invalidateOrgAccess(orgId);
    ctx.send({ started, access: await getOrgAccess(strapi, orgId) });
  },

  async completeOnboarding(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId, { admin: true });
    if (!guard) return;
    await strapi.entityService.update(ORG_UID, orgId, { data: { onboardingCompleted: true } });
    ctx.send({ ok: true });
  },

  async organization(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId);
    if (!guard) return;
    ctx.send({ organization: await orgSummary(guard.organization, guard.membership, ctx.state.user.id) });
  },

  /** Lighter call for CRM/PM: access per app for the current X-Organization-Id. */
  async access(ctx) {
    if (!isSaas()) return ctx.send({ platform: 'internal', apps: {} });
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Sign in to continue.');
    if (!ctx.state.orgId) return ctx.send({ platform: 'saas', organization: null, apps: {} });
    const guard = await requireMember(ctx, strapi, ctx.state.orgId);
    if (!guard) return;
    ctx.send({
      platform: 'saas',
      organization: { id: guard.organization.id, name: guard.organization.name },
      isAdmin: guard.isAdmin,
      apps: await getOrgAccess(strapi, ctx.state.orgId),
    });
  },

  async invite(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId, { admin: true });
    if (!guard) return;

    const rows = Array.isArray(ctx.request.body?.invites) ? ctx.request.body.invites : [];
    const cleaned = rows
      .map((r) => ({ email: normalizeEmail(r?.email), role: INVITE_ROLES[String(r?.role || 'member').toLowerCase()] || 'Member' }))
      .filter((r) => r.email);
    if (!cleaned.length) return ctx.badRequest('Add at least one email address.', { field: 'invites' });
    const bad = cleaned.find((r) => !isEmail(r.email));
    if (bad) return ctx.badRequest(`${bad.email} is not a valid email address.`, { field: 'invites' });
    if (cleaned.length > 50) return ctx.badRequest('Invite up to 50 people at a time.');

    const overLimit = await seatLimitProblem(strapi, orgId, cleaned.length);
    if (overLimit) return ctx.badRequest(overLimit, { code: 'PLAN_USER_LIMIT' });

    const service = strapi.service('api::invitation.invitation');
    let sent = 0;
    const skipped = [];
    for (const { email, role } of cleaned) {
      const user = await strapi.query(USER_UID).findOne({ where: { email } });
      if (user) {
        const already = await strapi.entityService.count(MEMBERSHIP_UID, { filters: { user: user.id, organization: orgId, isActive: true } });
        if (already) {
          skipped.push({ email, reason: 'already a member' });
          continue;
        }
      }
      // Replace any earlier pending invite for the same person.
      const earlier = await strapi.entityService.findMany(INVITE_UID, { filters: { email, organization: orgId, status: 'pending' } });
      for (const inv of earlier) await strapi.entityService.update(INVITE_UID, inv.id, { data: { status: 'expired' } });
      await service.createInvitations(orgId, [email], ctx.state.user.id, role, {});
      sent += 1;
    }
    ctx.send({ sent, skipped });
  },

  async pendingInvitations(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId, { admin: true });
    if (!guard) return;
    const invites = await strapi.entityService.findMany(INVITE_UID, {
      filters: { organization: orgId, status: 'pending', expiresAt: { $gt: new Date() } },
      sort: { createdAt: 'desc' },
      limit: 100,
    });
    ctx.send({ invitations: invites.map((i) => ({ id: i.id, email: i.email, role: INVITE_ROLES[String(i.role || '').toLowerCase()] || 'Member', expiresAt: i.expiresAt })) });
  },

  async revokeInvitation(ctx) {
    if (!ensureSaas(ctx)) return;
    const orgId = Number(ctx.params.id);
    const guard = await requireMember(ctx, strapi, orgId, { admin: true });
    if (!guard) return;
    const [inv] = await strapi.entityService.findMany(INVITE_UID, { filters: { id: Number(ctx.params.invitationId), organization: orgId }, limit: 1 });
    if (!inv) return ctx.notFound('Invitation not found');
    await strapi.entityService.update(INVITE_UID, inv.id, { data: { status: 'expired' } });
    ctx.send({ ok: true });
  },

  async invitation(ctx) {
    if (!ensureSaas(ctx)) return;
    const inv = await findPendingInvitation(ctx.params.token);
    if (!inv) return ctx.notFound('This invitation has expired or was already used.');
    const existing = await strapi.query(USER_UID).findOne({ where: { email: normalizeEmail(inv.email) } });
    ctx.send({
      email: inv.email,
      organization: { name: inv.organization?.name },
      role: INVITE_ROLES[String(inv.role || '').toLowerCase()] || 'Member',
      invitedBy: [inv.invitedBy?.firstName, inv.invitedBy?.lastName].filter(Boolean).join(' ') || null,
      hasAccount: Boolean(existing),
    });
  },

  async acceptInvitation(ctx) {
    if (!ensureSaas(ctx)) return;
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Sign in to accept this invitation.');
    const inv = await findPendingInvitation(ctx.params.token);
    if (!inv) return ctx.notFound('This invitation has expired or was already used.');
    if (normalizeEmail(inv.email) !== normalizeEmail(user.email)) {
      return ctx.forbidden(`This invitation is for ${inv.email}. Sign in with that email to accept it.`);
    }
    const organizationId = await acceptInvite(inv, user);
    ctx.send({ organizationId });
  },

  async declineInvitation(ctx) {
    if (!ensureSaas(ctx)) return;
    const user = ctx.state.user;
    if (!user) return ctx.unauthorized('Sign in to continue.');
    const inv = await findPendingInvitation(ctx.params.token);
    if (!inv) return ctx.send({ ok: true });
    if (normalizeEmail(inv.email) !== normalizeEmail(user.email)) return ctx.forbidden('This invitation is for someone else.');
    await strapi.entityService.update(INVITE_UID, inv.id, { data: { status: 'expired' } });
    ctx.send({ ok: true });
  },

  /** New person joining through an invitation: the link proves the email, so no code is needed. */
  async registerFromInvitation(ctx) {
    if (!ensureSaas(ctx)) return;
    const inv = await findPendingInvitation(ctx.params.token);
    if (!inv) return ctx.notFound('This invitation has expired or was already used.');
    const { firstName, lastName, password } = ctx.request.body || {};
    if (!String(firstName || '').trim()) return ctx.badRequest('Enter your name.', { field: 'firstName' });
    const weak = passwordProblem(password);
    if (weak) return ctx.badRequest(weak, { field: 'password' });

    const email = normalizeEmail(inv.email);
    let user = await strapi.query(USER_UID).findOne({ where: { email } });
    if (user?.confirmed) {
      return ctx.badRequest('You already have an account. Sign in to accept the invitation.', { code: 'ACCOUNT_EXISTS' });
    }
    const profile = { password, firstName: String(firstName).trim(), lastName: String(lastName || '').trim(), confirmed: true };
    if (user) {
      user = await strapi.plugins['users-permissions'].services.user.edit(user.id, profile);
    } else {
      user = await strapi.plugins['users-permissions'].services.user.add({
        ...profile,
        email,
        username: await uniqueUsernameFromEmail(strapi, email),
        blocked: false,
        provider: 'local',
      });
    }
    const organizationId = await acceptInvite(inv, user);
    ctx.send({ ...(await sessionPayload(user)), organizationId });
  },
};

