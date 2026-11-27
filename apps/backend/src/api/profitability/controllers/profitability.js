'use strict';

/**
 * Project profitability (W22, Business plan feature `pm.profitability`).
 *
 *   GET  /profitability/summary?ids=1,2      revenue / cost / margin for every visible project (portfolio)
 *   GET  /profitability/projects/:id         one project, monthly trend; per-member cost for admins
 *   PUT  /profitability/projects/:id/target  { targetMarginPct | null }        admin or manager
 *   GET  /profitability/settings             members + hourly cost rates, org target   admin only
 *   PUT  /profitability/settings/target      { targetMarginPct }                admin only
 *   PUT  /profitability/cost-rates/:userId   { hourlyCost | null }              admin only
 *
 * Who sees what: org admins and managers see project figures; only org admins see cost rates
 * and the per-member breakdown they could be worked out from.
 */

const { isPmOrgAdminRole, isPmOrgManagerRole } = require('../../../utils/rbac');
const { requireFeature } = require('../../../utils/saas-plans');
const { buildProjectVisibilityFilters, loadProjectForAccess } = require('../../../utils/workspaces');
const { computeProfitability, loadTargets, TARGET_UID } = require('../../../utils/profitability');

const PROJECT_UID = 'api::project.project';
const RATE_UID = 'api::profitability.cost-rate';
const ORG_USER_UID = 'api::organization-user.organization-user';
const CLOSED_PROJECT = ['COMPLETED', 'CANCELLED', 'ARCHIVED'];

const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));
const userName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email : null);
const isAdmin = (ctx) => isPmOrgAdminRole(ctx);
const canView = (ctx) => isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx);

/** Auth, org, plan feature and role. Returns false (with the response set) when denied. */
async function guard(ctx, { admin = false } = {}) {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  if (!(await requireFeature(ctx, strapi, 'pm.profitability'))) return false;
  if (admin ? !isAdmin(ctx) : !canView(ctx)) {
    ctx.forbidden(admin ? 'Only organization admins can manage cost rates and targets' : 'Only admins and managers can see project profitability');
    return false;
  }
  ctx.set('Cache-Control', 'no-store');
  return true;
}

/** Parses a margin target: number in [-100, 100], or null to clear. Returns undefined when invalid. */
function parseTarget(v) {
  if (v === null || v === '') return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < -100 || n > 100) return undefined;
  return Math.round(n * 10) / 10;
}

async function orgMembers(orgId) {
  const rows = await strapi.entityService.findMany(ORG_USER_UID, {
    filters: { organization: orgId, isActive: { $ne: false } },
    fields: ['jobRole'],
    populate: { user: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] }, role: { fields: ['name'] } },
    limit: 2000,
  });
  return rows.filter((r) => r.user?.id);
}

module.exports = {
  async summary(ctx) {
    if (!(await guard(ctx))) return;
    const orgId = ctx.state.orgId;
    const filters = await buildProjectVisibilityFilters(strapi, ctx, orgId, ctx.state.user.id);
    const wanted = String(ctx.query.ids || '')
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter(Boolean);
    if (wanted.length) filters.id = { $in: wanted };
    let projects = await strapi.entityService.findMany(PROJECT_UID, { filters, fields: ['id', 'status'], limit: 2000 });
    if (!wanted.length && ctx.query.status !== 'all') projects = projects.filter((p) => !CLOSED_PROJECT.includes(String(p.status || '').toUpperCase()));
    const figures = await computeProfitability(strapi, orgId, projects.map((p) => p.id), { months: 6 });
    const rows = projects.map((p) => {
      const f = figures.get(p.id);
      return {
        id: p.id,
        revenue: f.revenue,
        cost: f.cost,
        margin: f.margin,
        marginPct: f.marginPct,
        targetMarginPct: f.targetMarginPct,
        status: f.status,
        unratedHours: f.unratedHours,
        trend: f.trend.map((t) => ({ month: t.month, marginPct: t.marginPct, revenue: t.revenue, cost: t.cost })),
      };
    });
    const revenue = rows.reduce((a, r) => a + r.revenue, 0);
    const cost = rows.reduce((a, r) => a + r.cost, 0);
    const { orgTarget } = await loadTargets(strapi, orgId);
    return {
      data: {
        projects: rows,
        totals: {
          revenue,
          cost,
          margin: revenue - cost,
          marginPct: revenue > 0 ? Math.round(((revenue - cost) / revenue) * 1000) / 10 : null,
          belowTarget: rows.filter((r) => r.status === 'below').length,
        },
        orgTarget,
        canManage: isAdmin(ctx),
      },
    };
  },

  async project(ctx) {
    if (!(await guard(ctx))) return;
    const orgId = ctx.state.orgId;
    const project = await loadProjectForAccess(strapi, ctx, ctx.params.id);
    if (!project) return ctx.notFound('Project not found');
    const admin = isAdmin(ctx);
    const months = Math.min(24, Math.max(3, parseInt(ctx.query.months, 10) || 12));
    const f = (await computeProfitability(strapi, orgId, [project.id], { months, detail: admin })).get(project.id);
    if (admin && f.members?.length) {
      const users = await strapi.entityService.findMany('plugin::users-permissions.user', {
        filters: { id: { $in: f.members.map((m) => m.userId).filter(Boolean) } },
        fields: ['id', 'username', 'firstName', 'lastName', 'email'],
        limit: f.members.length,
      });
      const names = new Map(users.map((u) => [u.id, userName(u)]));
      f.members = f.members.map((m) => ({ ...m, name: names.get(m.userId) || 'Unknown member' }));
    }
    return {
      data: {
        projectId: project.id,
        ...f,
        canEditTarget: true,
        canManageRates: admin,
        sources: { cost: 'Approved timesheet hours × member cost rate', revenue: 'Fudge Grow invoices (before tax)' },
      },
    };
  },

  async setProjectTarget(ctx) {
    if (!(await guard(ctx))) return;
    const orgId = ctx.state.orgId;
    const project = await loadProjectForAccess(strapi, ctx, ctx.params.id);
    if (!project) return ctx.notFound('Project not found');
    const target = parseTarget(ctx.request.body?.targetMarginPct);
    if (target === undefined) return ctx.badRequest('Target margin must be a number between -100 and 100');
    const { byProject } = await loadTargets(strapi, orgId);
    const row = byProject.get(project.id);
    if (row) await strapi.entityService.update(TARGET_UID, row.id, { data: { targetMarginPct: target } });
    else await strapi.entityService.create(TARGET_UID, { data: { organization: orgId, project: project.id, targetMarginPct: target } });
    return { data: { projectId: project.id, targetMarginPct: target } };
  },

  async settings(ctx) {
    if (!(await guard(ctx, { admin: true }))) return;
    const orgId = ctx.state.orgId;
    const [members, rates, { orgTarget, orgRow }] = await Promise.all([
      orgMembers(orgId),
      strapi.entityService.findMany(RATE_UID, {
        filters: { organization: orgId },
        fields: ['hourlyCost', 'currency', 'updatedAt'],
        populate: { user: { fields: ['id'] } },
        limit: 5000,
      }),
      loadTargets(strapi, orgId),
    ]);
    const byUser = new Map(rates.map((r) => [relId(r.user), r]));
    return {
      data: {
        orgTarget,
        orgTargetSet: orgRow?.targetMarginPct != null,
        members: members
          .map((m) => {
            const r = byUser.get(m.user.id);
            return {
              userId: m.user.id,
              name: userName(m.user),
              email: m.user.email,
              jobRole: m.jobRole || null,
              role: m.role?.name || null,
              hourlyCost: r ? Number(r.hourlyCost) || 0 : null,
              currency: r?.currency || 'INR',
              updatedAt: r?.updatedAt || null,
            };
          })
          .sort((a, b) => String(a.name).localeCompare(String(b.name))),
      },
    };
  },

  async setOrgTarget(ctx) {
    if (!(await guard(ctx, { admin: true }))) return;
    const orgId = ctx.state.orgId;
    const target = parseTarget(ctx.request.body?.targetMarginPct);
    if (target === undefined || target === null) return ctx.badRequest('Target margin must be a number between -100 and 100');
    const { orgRow } = await loadTargets(strapi, orgId);
    if (orgRow) await strapi.entityService.update(TARGET_UID, orgRow.id, { data: { targetMarginPct: target } });
    else await strapi.entityService.create(TARGET_UID, { data: { organization: orgId, targetMarginPct: target } });
    return { data: { orgTarget: target } };
  },

  async setCostRate(ctx) {
    if (!(await guard(ctx, { admin: true }))) return;
    const orgId = ctx.state.orgId;
    const userId = parseInt(ctx.params.userId, 10);
    if (!userId) return ctx.badRequest('Invalid member');
    const member = await strapi.entityService.findMany(ORG_USER_UID, { filters: { organization: orgId, user: userId }, fields: ['id'], limit: 1 });
    if (!member.length) return ctx.notFound('Member not found in this organization');
    const raw = ctx.request.body?.hourlyCost;
    const existing = await strapi.entityService.findMany(RATE_UID, { filters: { organization: orgId, user: userId }, fields: ['id'], limit: 1 });
    if (raw === null || raw === '') {
      if (existing[0]) await strapi.entityService.delete(RATE_UID, existing[0].id);
      return { data: { userId, hourlyCost: null } };
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0 || n > 1e7) return ctx.badRequest('Hourly cost must be a positive number');
    const hourlyCost = Math.round(n * 100) / 100;
    const currency = String(ctx.request.body?.currency || 'INR').slice(0, 8).toUpperCase();
    if (existing[0]) await strapi.entityService.update(RATE_UID, existing[0].id, { data: { hourlyCost, currency } });
    else await strapi.entityService.create(RATE_UID, { data: { organization: orgId, user: userId, hourlyCost, currency } });
    return { data: { userId, hourlyCost, currency } };
  },
};
