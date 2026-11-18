'use strict';

/**
 * Client retainers (W14). Managers (PM admin / manager role or PM projects manage) see and edit all;
 * an account manager sees the retainers assigned to them.
 * GET /retainers?month=YYYY-MM includes this month's usage status for each retainer.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../../../utils/rbac');
const { RETAINER_UID, monthKey, prevMonth, activeIn, retainerStatus, checkRetainerAlerts } = require('../../../utils/retainers');

const isManager = (ctx) => isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'pm', 'projects', 'manage');
const POPULATE = {
  clientAccount: { fields: ['id', 'companyName'] },
  project: { fields: ['id', 'name'] },
  accountManager: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
  organization: { fields: ['id'] },
};
const userName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email : null);

function guard(ctx) {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  return true;
}

function serialize(r) {
  return {
    id: r.id,
    name: r.name,
    unit: r.unit,
    monthlyAllowance: Number(r.monthlyAllowance) || 0,
    rollover: r.rollover,
    rolloverCap: r.rolloverCap == null ? null : Number(r.rolloverCap),
    startMonth: r.startMonth,
    endMonth: r.endMonth,
    active: r.active !== false,
    client: r.clientAccount ? { id: r.clientAccount.id, name: r.clientAccount.companyName } : null,
    project: r.project ? { id: r.project.id, name: r.project.name } : null,
    accountManager: r.accountManager ? { id: r.accountManager.id, name: userName(r.accountManager) } : null,
  };
}

async function belongs(strapi, uid, id, orgId) {
  if (!id) return true;
  const row = await strapi.entityService.findOne(uid, id, { populate: { organization: { fields: ['id'] } } });
  return row && orgIdFromRelation(row.organization) === orgId;
}

async function normalize(strapi, ctx, body, creating) {
  const data = {};
  if (creating || body.name !== undefined) {
    const name = String(body.name || '').trim().slice(0, 120);
    if (!name) return { error: 'Give the retainer a name' };
    data.name = name;
  }
  if (body.unit !== undefined || creating) {
    const u = body.unit || 'hours';
    if (!['hours', 'deliverables'].includes(u)) return { error: 'Unit must be hours or deliverables' };
    data.unit = u;
  }
  if (body.monthlyAllowance !== undefined || creating) {
    const a = Number(body.monthlyAllowance);
    if (!Number.isFinite(a) || a <= 0 || a > 10000) return { error: 'Monthly allowance must be more than 0' };
    data.monthlyAllowance = Math.round(a * 10) / 10;
  }
  if (body.rollover !== undefined) {
    if (!['none', 'carry_forward'].includes(body.rollover)) return { error: 'Rollover must be none or carry_forward' };
    data.rollover = body.rollover;
  }
  if (body.rolloverCap !== undefined) data.rolloverCap = body.rolloverCap === null || body.rolloverCap === '' ? null : Math.max(0, Number(body.rolloverCap) || 0);
  for (const k of ['startMonth', 'endMonth']) {
    if (body[k] === undefined) continue;
    if (body[k] === null || body[k] === '') {
      if (k === 'startMonth') return { error: 'Start month is required' };
      data[k] = null;
      continue;
    }
    const m = String(body[k]).match(/^(\d{4})-(\d{2})/);
    if (!m) return { error: `${k} must be YYYY-MM` };
    data[k] = `${m[1]}-${m[2]}-01`;
  }
  if (creating && !data.startMonth) data.startMonth = `${monthKey()}-01`;
  if (data.endMonth && data.startMonth && data.endMonth < data.startMonth) return { error: 'End month is before the start month' };
  if (body.active !== undefined) data.active = Boolean(body.active);
  for (const [k, uid] of [
    ['clientAccount', 'api::client-account.client-account'],
    ['project', 'api::project.project'],
  ]) {
    if (body[k] === undefined) continue;
    const id = body[k] ? parseInt(body[k], 10) : null;
    if (id && !(await belongs(strapi, uid, id, ctx.state.orgId))) return { error: `That ${k === 'project' ? 'project' : 'client'} isn't in this organization` };
    data[k] = id;
  }
  if (body.accountManager !== undefined) {
    const id = body.accountManager ? parseInt(body.accountManager, 10) : null;
    if (id) {
      const m = await strapi.entityService.findMany('api::organization-user.organization-user', { filters: { organization: ctx.state.orgId, user: id }, limit: 1 });
      if (!m[0]) return { error: 'Account manager must be a member of this organization' };
    }
    data.accountManager = id;
  }
  if (creating && !data.clientAccount && !data.project) return { error: 'Pick a client or a project' };
  return { data };
}

async function loadOwned(strapi, ctx) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const row = await strapi.entityService.findOne(RETAINER_UID, id, { populate: POPULATE });
  if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) return null;
  return row;
}

module.exports = createCoreController(RETAINER_UID, ({ strapi }) => ({
  async find(ctx) {
    if (!guard(ctx)) return;
    const manager = isManager(ctx);
    const key = /^\d{4}-\d{2}$/.test(ctx.query?.month || '') ? ctx.query.month : monthKey();
    const filters = { organization: ctx.state.orgId };
    if (!manager) filters.accountManager = ctx.state.user.id;
    const rows = await strapi.entityService.findMany(RETAINER_UID, { filters, populate: POPULATE, sort: [{ name: 'asc' }], limit: 500 });
    const data = [];
    for (const r of rows) {
      data.push({ ...serialize(r), status: r.active !== false && activeIn(r, key) ? await retainerStatus(strapi, r, key) : null });
    }
    ctx.set('Cache-Control', 'no-store');
    return { data, meta: { month: key, manager } };
  },

  async create(ctx) {
    if (!guard(ctx)) return;
    if (!isManager(ctx)) return ctx.forbidden('Only managers can set up retainers');
    const { data, error } = await normalize(strapi, ctx, ctx.request?.body?.data || ctx.request?.body || {}, true);
    if (error) return ctx.badRequest(error);
    const entry = await strapi.entityService.create(RETAINER_UID, { data: { ...data, organization: ctx.state.orgId }, populate: POPULATE });
    await checkRetainerAlerts(strapi).catch(() => {});
    return { data: serialize(entry) };
  },

  async update(ctx) {
    if (!guard(ctx)) return;
    if (!isManager(ctx)) return ctx.forbidden('Only managers can change retainers');
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Retainer not found');
    const { data, error } = await normalize(strapi, ctx, ctx.request?.body?.data || ctx.request?.body || {}, false);
    if (error) return ctx.badRequest(error);
    const entry = await strapi.entityService.update(RETAINER_UID, row.id, { data, populate: POPULATE });
    return { data: serialize(entry) };
  },

  async delete(ctx) {
    if (!guard(ctx)) return;
    if (!isManager(ctx)) return ctx.forbidden('Only managers can delete retainers');
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Retainer not found');
    await strapi.entityService.delete(RETAINER_UID, row.id);
    return { data: { id: row.id } };
  },

  /** GET /retainers/:id/history?months=6 — usage for recent months. */
  async history(ctx) {
    if (!guard(ctx)) return;
    const row = await loadOwned(strapi, ctx);
    if (!row) return ctx.notFound('Retainer not found');
    if (!isManager(ctx) && row.accountManager?.id !== ctx.state.user.id) return ctx.forbidden('Access denied');
    const n = Math.min(12, Math.max(1, parseInt(ctx.query?.months, 10) || 6));
    const keys = [];
    let k = monthKey();
    for (let i = 0; i < n; i++) {
      keys.unshift(k);
      k = prevMonth(k);
    }
    const months = [];
    for (const key of keys) if (activeIn(row, key)) months.push(await retainerStatus(strapi, row, key));
    return { data: { retainer: serialize(row), months } };
  },
}));
