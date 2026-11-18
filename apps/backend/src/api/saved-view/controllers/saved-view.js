'use strict';

/**
 * Saved task views (W3). Private to the user who saved them, scoped to the active org.
 * scope: 'my-tasks' | 'project:<id>'. config: { view, groupBy, ... } (JSON, max ~4 KB).
 * One default per user + scope (the view a page opens with).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');

const UID = 'api::saved-view.saved-view';
const VIEWS = ['list', 'table', 'board', 'kanban', 'timeline', 'calendar', 'gantt', 'workload'];
const GROUPS = ['status', 'assignee', 'priority', 'taskType', 'none'];
const MAX_PER_SCOPE = 30;

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

function cleanScope(v) {
  const s = String(v || '').trim();
  return /^(my-tasks|project:\d+)$/.test(s) ? s : null;
}

function cleanConfig(raw) {
  const c = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const out = {};
  if (VIEWS.includes(c.view)) out.view = c.view;
  if (GROUPS.includes(c.groupBy)) out.groupBy = c.groupBy;
  if (typeof c.search === 'string') out.search = c.search.slice(0, 100);
  if (typeof c.statusTab === 'string') out.statusTab = c.statusTab.slice(0, 40);
  if (c.filters && typeof c.filters === 'object') out.filters = c.filters;
  return JSON.stringify(out).length > 4000 ? { view: out.view, groupBy: out.groupBy } : out;
}

const serialize = (r) => ({ id: r.id, name: r.name, scope: r.scope, config: r.config || {}, isDefault: Boolean(r.isDefault) });

async function loadOwn(strapi, ctx) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const row = await strapi.entityService.findOne(UID, id, { populate: { user: { fields: ['id'] }, organization: { fields: ['id'] } } });
  if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId || Number(row.user?.id) !== Number(ctx.state.user.id)) return null;
  return row;
}

async function clearDefault(strapi, ctx, scope, exceptId) {
  const rows = await strapi.entityService.findMany(UID, {
    filters: { organization: ctx.state.orgId, user: ctx.state.user.id, scope, isDefault: true },
    limit: 50,
  });
  for (const r of rows) if (r.id !== exceptId) await strapi.entityService.update(UID, r.id, { data: { isDefault: false } });
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  /** GET /saved-views?scope= */
  async find(ctx) {
    if (!guard(ctx)) return;
    const scope = cleanScope(ctx.query?.scope);
    if (!scope) return ctx.badRequest('scope must be "my-tasks" or "project:<id>"');
    const rows = await strapi.entityService.findMany(UID, {
      filters: { organization: ctx.state.orgId, user: ctx.state.user.id, scope },
      sort: [{ name: 'asc' }],
      limit: MAX_PER_SCOPE,
    });
    ctx.set('Cache-Control', 'no-store');
    return { data: rows.map(serialize) };
  },

  async create(ctx) {
    if (!guard(ctx)) return;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const scope = cleanScope(body.scope);
    if (!scope) return ctx.badRequest('scope must be "my-tasks" or "project:<id>"');
    const name = String(body.name || '').trim().slice(0, 60);
    if (!name) return ctx.badRequest('Give the view a name');
    const count = await strapi.db.query(UID).count({ where: { organization: ctx.state.orgId, user: ctx.state.user.id, scope } });
    if (count >= MAX_PER_SCOPE) return ctx.badRequest(`At most ${MAX_PER_SCOPE} saved views here`);
    const entry = await strapi.entityService.create(UID, {
      data: { name, scope, config: cleanConfig(body.config), isDefault: Boolean(body.isDefault), user: ctx.state.user.id, organization: ctx.state.orgId },
    });
    if (entry.isDefault) await clearDefault(strapi, ctx, scope, entry.id);
    return { data: serialize(entry) };
  },

  async update(ctx) {
    if (!guard(ctx)) return;
    const row = await loadOwn(strapi, ctx);
    if (!row) return ctx.notFound('View not found');
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const data = {};
    if (body.name !== undefined) {
      const name = String(body.name || '').trim().slice(0, 60);
      if (!name) return ctx.badRequest('Give the view a name');
      data.name = name;
    }
    if (body.config !== undefined) data.config = cleanConfig(body.config);
    if (body.isDefault !== undefined) data.isDefault = Boolean(body.isDefault);
    const entry = await strapi.entityService.update(UID, row.id, { data });
    if (data.isDefault) await clearDefault(strapi, ctx, row.scope, row.id);
    return { data: serialize(entry) };
  },

  async delete(ctx) {
    if (!guard(ctx)) return;
    const row = await loadOwn(strapi, ctx);
    if (!row) return ctx.notFound('View not found');
    await strapi.entityService.delete(UID, row.id);
    return { data: { id: row.id } };
  },
}));
