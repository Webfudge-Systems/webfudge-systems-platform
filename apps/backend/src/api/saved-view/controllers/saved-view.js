'use strict';

/**
 * Saved views (W3 tasks, G3 Grow lists). Scoped to the active org and a page:
 *   'my-tasks' | 'project:<id>' | 'crm:<leads|contacts|deals|accounts>'
 * Views are private to their owner unless `shared` is on, in which case every org member can
 * open them (only the owner can rename, change, share or delete). One default per user + scope
 * (the view a page opens with); the default is always one of the user's own views.
 * config is whitelisted (layout, grouping, columns, sort, filters) and capped at ~8 KB.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');

const UID = 'api::saved-view.saved-view';
const VIEWS = ['list', 'table', 'board', 'kanban', 'timeline', 'calendar', 'gantt', 'workload', 'members'];
const GROUPS = ['status', 'assignee', 'priority', 'taskType', 'none'];
const MAX_PER_SCOPE = 30;
const MAX_CONFIG = 8000;

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
  return /^(my-tasks|project:\d+|crm:(leads|contacts|deals|accounts))$/.test(s) ? s : null;
}

const plainObject = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : null);

function cleanConfig(raw) {
  const c = plainObject(raw) || {};
  const out = {};
  if (VIEWS.includes(c.view)) out.view = c.view;
  if (GROUPS.includes(c.groupBy)) out.groupBy = c.groupBy;
  if (typeof c.search === 'string') out.search = c.search.slice(0, 100);
  if (typeof c.statusTab === 'string') out.statusTab = c.statusTab.slice(0, 40);
  if (plainObject(c.filters)) out.filters = c.filters;
  // Grow list views (G3): table columns + sort
  const cols = plainObject(c.columns);
  if (cols) {
    out.columns = {};
    if (plainObject(cols.visibility)) out.columns.visibility = Object.fromEntries(Object.entries(cols.visibility).filter(([, v]) => typeof v === 'boolean').slice(0, 80));
    if (Array.isArray(cols.order)) out.columns.order = cols.order.filter((k) => typeof k === 'string').slice(0, 80);
    if (plainObject(cols.widths)) out.columns.widths = Object.fromEntries(Object.entries(cols.widths).filter(([, v]) => Number.isFinite(v)).slice(0, 80));
  }
  if (Array.isArray(c.sort)) {
    out.sort = c.sort
      .filter((r) => r && typeof r.key === 'string' && ['asc', 'desc'].includes(r.direction))
      .slice(0, 5)
      .map((r) => ({ key: r.key, direction: r.direction }));
  }
  if (JSON.stringify(out).length > MAX_CONFIG) {
    delete out.filters;
    delete out.columns;
  }
  return out;
}

const ownerName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email : null);

function serialize(r, meId) {
  const ownerId = r.user?.id ?? null;
  const mine = Number(ownerId) === Number(meId);
  return {
    id: r.id,
    name: r.name,
    scope: r.scope,
    config: r.config || {},
    isDefault: mine && Boolean(r.isDefault),
    shared: Boolean(r.shared),
    mine,
    owner: ownerId ? { id: ownerId, name: ownerName(r.user) } : null,
  };
}

const USER_FIELDS = { fields: ['id', 'username', 'firstName', 'lastName', 'email'] };

async function loadOwn(strapi, ctx) {
  const id = parseInt(String(ctx.params.id), 10);
  if (Number.isNaN(id)) return null;
  const row = await strapi.entityService.findOne(UID, id, { populate: { user: USER_FIELDS, organization: { fields: ['id'] } } });
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
  /** GET /saved-views?scope= → my views + views teammates shared in this org. */
  async find(ctx) {
    if (!guard(ctx)) return;
    const scope = cleanScope(ctx.query?.scope);
    if (!scope) return ctx.badRequest('Unknown view scope');
    const rows = await strapi.entityService.findMany(UID, {
      filters: { organization: ctx.state.orgId, scope, $or: [{ user: ctx.state.user.id }, { shared: true }] },
      populate: { user: USER_FIELDS },
      sort: [{ name: 'asc' }],
      limit: MAX_PER_SCOPE * 4,
    });
    ctx.set('Cache-Control', 'no-store');
    return { data: rows.map((r) => serialize(r, ctx.state.user.id)) };
  },

  async create(ctx) {
    if (!guard(ctx)) return;
    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const scope = cleanScope(body.scope);
    if (!scope) return ctx.badRequest('Unknown view scope');
    const name = String(body.name || '').trim().slice(0, 60);
    if (!name) return ctx.badRequest('Give the view a name');
    const count = await strapi.db.query(UID).count({ where: { organization: ctx.state.orgId, user: ctx.state.user.id, scope } });
    if (count >= MAX_PER_SCOPE) return ctx.badRequest(`At most ${MAX_PER_SCOPE} saved views here`);
    const entry = await strapi.entityService.create(UID, {
      data: {
        name,
        scope,
        config: cleanConfig(body.config),
        isDefault: Boolean(body.isDefault),
        shared: Boolean(body.shared),
        user: ctx.state.user.id,
        organization: ctx.state.orgId,
      },
      populate: { user: USER_FIELDS },
    });
    if (entry.isDefault) await clearDefault(strapi, ctx, scope, entry.id);
    return { data: serialize(entry, ctx.state.user.id) };
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
    if (body.shared !== undefined) data.shared = Boolean(body.shared);
    const entry = await strapi.entityService.update(UID, row.id, { data, populate: { user: USER_FIELDS } });
    if (data.isDefault) await clearDefault(strapi, ctx, row.scope, row.id);
    return { data: serialize(entry, ctx.state.user.id) };
  },

  async delete(ctx) {
    if (!guard(ctx)) return;
    const row = await loadOwn(strapi, ctx);
    if (!row) return ctx.notFound('View not found');
    await strapi.entityService.delete(UID, row.id);
    return { data: { id: row.id } };
  },
}));
