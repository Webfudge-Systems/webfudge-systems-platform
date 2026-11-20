'use strict';

/**
 * Workspaces (W1) — team / department / client spaces that group projects.
 * Auth: global jwt-auth (ctx.state.user + ctx.state.orgId). Access rules live in utils/workspaces.
 */

const { requireModuleAccess } = require('../../../utils/rbac');
const {
  WORKSPACE_UID,
  relId,
  idList,
  ensureDefaultWorkspace,
  visibleWorkspaceIds,
  buildProjectVisibilityFilters,
  userCanManageWorkspace,
  userCanCreateWorkspace,
  loadWorkspaceForAccess,
  orgMemberUserIds,
} = require('../../../utils/workspaces');

const PROJECT_UID = 'api::project.project';
const KINDS = new Set(['general', 'team', 'department', 'client', 'internal', 'other']);
const USER_FIELDS = ['id', 'username', 'email', 'firstName', 'lastName'];

const POPULATE = {
  members: { fields: USER_FIELDS },
  admins: { fields: USER_FIELDS },
  createdByUser: { fields: ['id'] },
  organization: { fields: ['id'] },
};

function guard(ctx, level = 'read') {
  if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
  if (!ctx.state.orgId) return ctx.forbidden('No active organization');
  return requireModuleAccess(ctx, 'pm', 'projects', level);
}

function readBody(ctx) {
  const body = ctx.request?.body || {};
  const payload = body.data || body;
  return payload && typeof payload === 'object' ? payload : {};
}

/** Only allowed fields; members/admins validated against the org. Returns { data } or { error }. */
async function cleanInput(strapi, orgId, input, { isDefault = false } = {}) {
  const data = {};
  if (input.name !== undefined) {
    const name = String(input.name || '').trim();
    if (!name) return { error: 'Workspace name is required' };
    data.name = name.slice(0, 120);
  }
  if (input.description !== undefined) data.description = input.description ? String(input.description) : null;
  if (input.color !== undefined) data.color = input.color ? String(input.color).slice(0, 32) : null;
  if (input.kind !== undefined && !isDefault) {
    if (!KINDS.has(input.kind)) return { error: 'Invalid workspace type' };
    data.kind = input.kind;
  }
  if (input.membersMode !== undefined) {
    if (!['all', 'restricted'].includes(input.membersMode)) return { error: 'Invalid members setting' };
    // The default workspace always stays open so nothing disappears for existing users.
    if (isDefault && input.membersMode !== 'all') return { error: 'The default workspace is always open to everyone' };
    data.membersMode = input.membersMode;
  }
  if (input.sortOrder !== undefined) data.sortOrder = Number(input.sortOrder) || 0;
  for (const key of ['members', 'admins']) {
    if (input[key] === undefined) continue;
    const raw = Array.isArray(input[key]) ? input[key] : input[key]?.set || [];
    const ids = [...new Set(idList(raw))];
    if (ids.length) {
      const allowed = await orgMemberUserIds(strapi, orgId);
      const bad = ids.filter((id) => !allowed.has(id));
      if (bad.length) return { error: 'Some selected people are not in this organization' };
    }
    data[key] = ids;
  }
  return { data };
}

async function projectCounts(strapi, ctx, wsIds) {
  const counts = {};
  if (!wsIds.length) return counts;
  const filters = await buildProjectVisibilityFilters(strapi, ctx, ctx.state.orgId, ctx.state.user.id);
  const rows = await strapi.entityService.findMany(PROJECT_UID, {
    filters: { $and: [filters, { workspace: { id: { $in: wsIds } } }] },
    fields: ['id'],
    populate: { workspace: { fields: ['id'] } },
    limit: 5000,
  });
  for (const r of rows) {
    const id = relId(r.workspace);
    if (id) counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

function present(ctx, ws, counts = {}) {
  const { organization, createdByUser, ...rest } = ws;
  return {
    ...rest,
    createdByUser: relId(createdByUser),
    projectCount: counts[ws.id] || 0,
    canManage: userCanManageWorkspace(ctx, ws, ctx.state.user.id),
  };
}

module.exports = {
  async find(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    await ensureDefaultWorkspace(strapi, ctx.state.orgId);
    const ids = await visibleWorkspaceIds(strapi, ctx, ctx.state.orgId, ctx.state.user.id);
    const rows = ids.length
      ? await strapi.entityService.findMany(WORKSPACE_UID, {
          filters: { id: { $in: ids } },
          populate: POPULATE,
          sort: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
          limit: 500,
        })
      : [];
    const counts = await projectCounts(strapi, ctx, ids);
    ctx.set('Cache-Control', 'no-store');
    return {
      data: rows.map((ws) => present(ctx, ws, counts)),
      meta: { canCreate: userCanCreateWorkspace(ctx) },
    };
  },

  async findOne(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const ws = await loadWorkspaceForAccess(strapi, ctx, ctx.params.id);
    if (!ws) return ctx.notFound('Workspace not found');
    const full = await strapi.entityService.findOne(WORKSPACE_UID, ws.id, { populate: POPULATE });
    const counts = await projectCounts(strapi, ctx, [ws.id]);
    return { data: present(ctx, full, counts) };
  },

  async create(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    if (!userCanCreateWorkspace(ctx)) return ctx.forbidden('Only admins and managers can create workspaces');
    const input = readBody(ctx);
    if (input.name === undefined) return ctx.badRequest('Workspace name is required');
    const { data, error } = await cleanInput(strapi, ctx.state.orgId, input);
    if (error) return ctx.badRequest(error);

    const me = Number(ctx.state.user.id);
    // Creator always keeps access to a restricted workspace they create.
    if (data.membersMode === 'restricted') {
      data.admins = [...new Set([...(data.admins || []), me])];
    }
    const last = await strapi.db.query(WORKSPACE_UID).findOne({
      where: { organization: { id: ctx.state.orgId } },
      orderBy: { sortOrder: 'desc' },
      select: ['sortOrder'],
    });
    const created = await strapi.entityService.create(WORKSPACE_UID, {
      data: {
        kind: 'team',
        membersMode: 'all',
        sortOrder: (Number(last?.sortOrder) || 0) + 1,
        ...data,
        isDefault: false,
        createdByUser: me,
        organization: ctx.state.orgId,
      },
    });
    const full = await strapi.entityService.findOne(WORKSPACE_UID, created.id, { populate: POPULATE });
    return { data: present(ctx, full) };
  },

  async update(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const ws = await loadWorkspaceForAccess(strapi, ctx, ctx.params.id);
    if (!ws) return ctx.notFound('Workspace not found');
    if (!userCanManageWorkspace(ctx, ws, ctx.state.user.id)) {
      return ctx.forbidden('Only workspace admins can change this workspace');
    }
    const { data, error } = await cleanInput(strapi, ctx.state.orgId, readBody(ctx), { isDefault: ws.isDefault });
    if (error) return ctx.badRequest(error);
    // Keep the editor in a restricted workspace so they can't lock themselves out by accident.
    const nextMode = data.membersMode || ws.membersMode;
    if (nextMode === 'restricted' && data.admins !== undefined) {
      const me = Number(ctx.state.user.id);
      const isCreator = relId(ws.createdByUser) === me;
      if (!isCreator && !data.admins.includes(me) && !(data.members || idList(ws.members)).includes(me)) {
        data.admins = [...data.admins, me];
      }
    }
    await strapi.entityService.update(WORKSPACE_UID, ws.id, { data });
    const full = await strapi.entityService.findOne(WORKSPACE_UID, ws.id, { populate: POPULATE });
    const counts = await projectCounts(strapi, ctx, [ws.id]);
    return { data: present(ctx, full, counts) };
  },

  /** Deletes a workspace after moving its projects to the default workspace (nothing is lost). */
  async delete(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const ws = await loadWorkspaceForAccess(strapi, ctx, ctx.params.id);
    if (!ws) return ctx.notFound('Workspace not found');
    if (ws.isDefault) return ctx.badRequest('The default workspace cannot be deleted');
    if (!userCanManageWorkspace(ctx, ws, ctx.state.user.id)) {
      return ctx.forbidden('Only workspace admins can delete this workspace');
    }
    const fallback = await ensureDefaultWorkspace(strapi, ctx.state.orgId);
    const projects = await strapi.db.query(PROJECT_UID).findMany({
      where: { workspace: { id: ws.id } },
      select: ['id'],
    });
    for (const p of projects) {
      await strapi.entityService.update(PROJECT_UID, p.id, { data: { workspace: fallback } });
    }
    await strapi.entityService.delete(WORKSPACE_UID, ws.id);
    return { data: { id: ws.id, movedProjects: projects.length, movedTo: fallback } };
  },
};
