'use strict';

/**
 * Project profitability (ticket W22, Business plan).
 *
 *   cost    = approved timesheet hours × member hourly cost rate      (./cost-source.js)
 *   revenue = Grow invoices for the project's deal / client account  (./revenue-source.js)
 *   margin  = revenue − cost, margin % = margin / revenue
 *
 * Revenue attribution:
 *   1. An invoice on the project's source deal belongs to that project.
 *   2. Any other invoice on the client account is shared by that client's projects that have no
 *      source deal (or by all its projects when every one has a deal), in proportion to their
 *      approved hours (equally when nobody has logged approved time yet).
 *
 * Target margin: the project's own target, else the organization default, else DEFAULT_TARGET.
 * Alerts: once per project per month, to org admins (and the project manager when they are an
 * admin or manager), when a project with revenue falls below its target. Checked by cron (see
 * src/index.js), like the W14 retainer alerts.
 *
 * Cost rates are confidential: only org admins see them, or anything they can be derived from
 * (per-member hours × cost). Managers see project totals.
 */

const costSource = require('./cost-source');
const revenueSource = require('./revenue-source');

const PROJECT_UID = 'api::project.project';
const TARGET_UID = 'api::profitability.profit-target';
const ORG_USER_UID = 'api::organization-user.organization-user';
const DEFAULT_TARGET = 30;
const NEAR_BAND = 5;
const CLOSED_PROJECT = ['COMPLETED', 'CANCELLED', 'ARCHIVED'];

const r0 = (n) => Math.round(Number(n) || 0);
const r1 = (n) => Math.round((Number(n) || 0) * 10) / 10;
const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));
const monthOf = (day) => String(day || '').slice(0, 7);

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** The last `n` month keys ending with the current month, oldest first. */
function lastMonths(n, now = new Date()) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) out.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  return out;
}

const marginPct = (revenue, cost) => (revenue > 0 ? r1(((revenue - cost) / revenue) * 100) : null);

function marginStatus(pct, target) {
  if (pct == null) return 'no_revenue';
  if (target == null) return 'ok';
  if (pct < target) return 'below';
  if (pct < target + NEAR_BAND) return 'near';
  return 'ok';
}

/**
 * Split invoices across projects (pure).
 * @param {Array} invoices  [{ id, date, amount, dealId, clientAccountId }]
 * @param {Array} projects  [{ id, clientAccountId, sourceDealId }] — every org project of the clients involved
 * @param {Map}   hoursByProject  projectId → approved hours (weights)
 * @returns {Array} [{ projectId, invoiceId, date, amount }]
 */
function attributeRevenue(invoices, projects, hoursByProject = new Map()) {
  const byDeal = new Map();
  const byClient = new Map();
  for (const p of projects) {
    if (p.sourceDealId != null) byDeal.set(p.sourceDealId, p.id);
    if (p.clientAccountId != null) {
      if (!byClient.has(p.clientAccountId)) byClient.set(p.clientAccountId, []);
      byClient.get(p.clientAccountId).push(p);
    }
  }
  const out = [];
  for (const inv of invoices) {
    if (inv.dealId != null && byDeal.has(inv.dealId)) {
      out.push({ projectId: byDeal.get(inv.dealId), invoiceId: inv.id, date: inv.date, amount: inv.amount });
      continue;
    }
    const all = byClient.get(inv.clientAccountId) || [];
    if (!all.length) continue;
    const noDeal = all.filter((p) => p.sourceDealId == null);
    const pool = noDeal.length ? noDeal : all;
    const total = pool.reduce((a, p) => a + (hoursByProject.get(p.id) || 0), 0);
    for (const p of pool) {
      const share = total > 0 ? (hoursByProject.get(p.id) || 0) / total : 1 / pool.length;
      if (share > 0) out.push({ projectId: p.id, invoiceId: inv.id, date: inv.date, amount: inv.amount * share });
    }
  }
  return out;
}

/**
 * Profitability of one project (pure).
 * @param {{ entries, revenue, rates, target, months, detail }} args
 *   entries: approved hours of this project; revenue: attributed rows of this project
 *   rates: Map userId → hourly cost; months: month keys for the trend; detail: include per-member rows
 */
function projectFigures({ entries = [], revenue = [], rates = new Map(), target = DEFAULT_TARGET, months = [], detail = false }) {
  const trend = new Map(months.map((m) => [m, { month: m, revenue: 0, cost: 0, hours: 0 }]));
  const members = new Map();
  let cost = 0;
  let hours = 0;
  let unratedHours = 0;
  const unratedUsers = new Set();
  for (const e of entries) {
    const rate = rates.get(e.userId);
    const c = rate ? e.hours * rate : 0;
    if (!rate) {
      unratedHours += e.hours;
      if (e.userId != null) unratedUsers.add(e.userId);
    }
    cost += c;
    hours += e.hours;
    const t = trend.get(monthOf(e.date));
    if (t) {
      t.cost += c;
      t.hours += e.hours;
    }
    if (detail) {
      const m = members.get(e.userId) || { userId: e.userId, hours: 0, cost: 0, hourlyCost: rate || 0 };
      m.hours += e.hours;
      m.cost += c;
      members.set(e.userId, m);
    }
  }
  let rev = 0;
  for (const r of revenue) {
    rev += r.amount;
    const t = trend.get(monthOf(r.date));
    if (t) t.revenue += r.amount;
  }
  const pct = marginPct(rev, cost);
  const result = {
    revenue: r0(rev),
    cost: r0(cost),
    margin: r0(rev - cost),
    marginPct: pct,
    approvedHours: r1(hours),
    unratedHours: r1(unratedHours),
    unratedMembers: unratedUsers.size,
    targetMarginPct: target,
    status: marginStatus(pct, target),
    trend: [...trend.values()].map((t) => ({
      month: t.month,
      revenue: r0(t.revenue),
      cost: r0(t.cost),
      margin: r0(t.revenue - t.cost),
      marginPct: marginPct(t.revenue, t.cost),
      hours: r1(t.hours),
    })),
  };
  if (detail) {
    result.members = [...members.values()]
      .map((m) => ({ userId: m.userId, hours: r1(m.hours), cost: r0(m.cost), hourlyCost: m.hourlyCost }))
      .sort((a, b) => b.cost - a.cost || b.hours - a.hours);
  }
  return result;
}

/** Target margin per project id, and the org default. */
async function loadTargets(strapi, orgId) {
  const rows = await strapi.entityService.findMany(TARGET_UID, {
    filters: { organization: orgId },
    populate: { project: { fields: ['id'] } },
    limit: 5000,
  });
  const byProject = new Map();
  let orgRow = null;
  for (const r of rows) {
    const pid = relId(r.project);
    if (pid == null) orgRow = orgRow || r;
    else byProject.set(pid, r);
  }
  const orgTarget = orgRow?.targetMarginPct != null ? Number(orgRow.targetMarginPct) : DEFAULT_TARGET;
  const targetFor = (pid) => {
    const row = byProject.get(pid);
    return row?.targetMarginPct != null ? Number(row.targetMarginPct) : orgTarget;
  };
  return { orgTarget, orgRow, byProject, targetFor };
}

/**
 * Profitability for a set of projects of one organization.
 * @returns {Promise<Map<number, object>>} projectId → figures (see projectFigures) + { projectTarget }
 */
async function computeProfitability(strapi, orgId, projectIds, { months = 6, detail = false } = {}) {
  const ids = [...new Set(projectIds.map(Number).filter(Boolean))];
  const out = new Map();
  if (!ids.length) return out;
  const pick = { fields: ['id'], populate: { clientAccount: { fields: ['id'] }, sourceDeal: { fields: ['id'] } } };
  const targets = await strapi.entityService.findMany(PROJECT_UID, { filters: { organization: orgId, id: { $in: ids } }, ...pick, limit: ids.length });
  const clientIds = [...new Set(targets.map((p) => relId(p.clientAccount)).filter((x) => x != null))];
  const siblings = clientIds.length
    ? await strapi.entityService.findMany(PROJECT_UID, { filters: { organization: orgId, clientAccount: { id: { $in: clientIds } } }, ...pick, limit: 5000 })
    : [];
  const all = new Map();
  for (const p of [...targets, ...siblings]) all.set(p.id, { id: p.id, clientAccountId: relId(p.clientAccount), sourceDealId: relId(p.sourceDeal) });
  const projects = [...all.values()];

  const [entries, rates, invoices, tg] = await Promise.all([
    costSource.approvedHours(strapi, orgId, projects.map((p) => p.id)),
    costSource.ratesFor(strapi, orgId),
    revenueSource.invoicesFor(strapi, orgId, {
      clientAccountIds: clientIds,
      dealIds: projects.map((p) => p.sourceDealId).filter((x) => x != null),
    }),
    loadTargets(strapi, orgId),
  ]);

  const hoursByProject = new Map();
  const entriesByProject = new Map();
  for (const e of entries) {
    hoursByProject.set(e.projectId, (hoursByProject.get(e.projectId) || 0) + e.hours);
    if (!entriesByProject.has(e.projectId)) entriesByProject.set(e.projectId, []);
    entriesByProject.get(e.projectId).push(e);
  }
  const revenueByProject = new Map();
  for (const r of attributeRevenue(invoices, projects, hoursByProject)) {
    if (!revenueByProject.has(r.projectId)) revenueByProject.set(r.projectId, []);
    revenueByProject.get(r.projectId).push(r);
  }
  const monthKeys = lastMonths(Math.min(24, Math.max(1, months)));
  for (const p of targets) {
    const own = tg.byProject.get(p.id);
    out.set(p.id, {
      ...projectFigures({
        entries: entriesByProject.get(p.id),
        revenue: revenueByProject.get(p.id),
        rates,
        target: tg.targetFor(p.id),
        months: monthKeys,
        detail,
      }),
      projectTarget: own?.targetMarginPct != null ? Number(own.targetMarginPct) : null,
      orgTarget: tg.orgTarget,
    });
  }
  return out;
}

/** User ids of active org admins. */
async function orgAdminUserIds(strapi, orgId) {
  const { isAdminRole } = require('../rbac');
  const rows = await strapi.entityService.findMany(ORG_USER_UID, {
    filters: { organization: orgId, isActive: { $ne: false } },
    populate: { user: { fields: ['id'] }, role: { fields: ['name', 'code'] } },
    limit: 2000,
  });
  return rows.filter((r) => isAdminRole(r.role)).map((r) => relId(r.user)).filter((x) => x != null);
}

async function userIsAdminOrManager(strapi, orgId, userId) {
  const { isAdminRole } = require('../rbac');
  const rows = await strapi.entityService.findMany(ORG_USER_UID, {
    filters: { organization: orgId, user: userId, isActive: { $ne: false } },
    populate: { role: { fields: ['name', 'code'] } },
    limit: 1,
  });
  const role = rows[0]?.role;
  if (!role) return false;
  const code = String(role.code || role.name || '').toLowerCase();
  return isAdminRole(role) || code === 'manager';
}

/** Cron: alert once per project per month when an active project with revenue is below its target margin. */
async function checkMarginAlerts(strapi, { orgId: onlyOrg } = {}) {
  const { hasFeature } = require('../saas-plans');
  const { notifyUsers } = require('../notification-emitter');
  const key = monthKey();
  const orgs = onlyOrg
    ? [{ id: onlyOrg }]
    : await strapi.entityService.findMany('api::organization.organization', { fields: ['id'], limit: 10000 });
  let sent = 0;
  for (const org of orgs) {
    if (!(await hasFeature(strapi, org.id, 'pm.profitability').catch(() => false))) continue;
    const projects = (
      await strapi.entityService.findMany(PROJECT_UID, {
        filters: { organization: org.id },
        fields: ['id', 'name', 'slug', 'status'],
        populate: { projectManager: { fields: ['id'] } },
        limit: 2000,
      })
    ).filter((p) => !CLOSED_PROJECT.includes(String(p.status || '').toUpperCase()));
    if (!projects.length) continue;
    const figures = await computeProfitability(strapi, org.id, projects.map((p) => p.id), { months: 1 });
    const below = projects.filter((p) => figures.get(p.id)?.status === 'below');
    if (!below.length) continue;
    const { byProject } = await loadTargets(strapi, org.id);
    const admins = await orgAdminUserIds(strapi, org.id);
    for (const p of below) {
      const row = byProject.get(p.id);
      const already = row?.alertsSent || {};
      if (already[key]) continue;
      const f = figures.get(p.id);
      const recipients = new Set(admins);
      const pm = relId(p.projectManager);
      if (pm && (await userIsAdminOrManager(strapi, org.id, pm))) recipients.add(pm);
      if (!recipients.size) continue;
      await notifyUsers(strapi, {
        userIds: [...recipients],
        organizationId: org.id,
        type: 'warning',
        title: `Margin below target: ${p.name}`,
        message: `Margin is ${f.marginPct}% against a ${f.targetMarginPct}% target.`,
        data: { href: `/projects/${p.slug || p.id}?tab=profitability`, projectId: p.id, month: key, kind: 'margin_below_target' },
      });
      const alertsSent = { ...already, [key]: new Date().toISOString() };
      if (row) await strapi.entityService.update(TARGET_UID, row.id, { data: { alertsSent } });
      else await strapi.entityService.create(TARGET_UID, { data: { organization: org.id, project: p.id, alertsSent } });
      sent += 1;
    }
  }
  return sent;
}

module.exports = {
  DEFAULT_TARGET,
  TARGET_UID,
  costSource,
  revenueSource,
  monthKey,
  lastMonths,
  marginPct,
  marginStatus,
  attributeRevenue,
  projectFigures,
  loadTargets,
  computeProfitability,
  checkMarginAlerts,
};
