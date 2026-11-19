'use strict';

/**
 * W1 — Workspaces and task lists.
 *
 * Hierarchy: Organization → Workspace → Project → Task list → Task → Subtask.
 *
 * This module holds:
 *  - the idempotent start-up bootstrap that puts existing data into the new hierarchy
 *    ("General" workspace per org, a default list per project);
 *  - the reusable access helpers (workspace + project visibility) that every controller —
 *    projects, tasks, sprints, portfolio and the client portal — should use instead of
 *    re-implementing the rules.
 *
 * Mode-agnostic: nothing here depends on PLATFORM_MODE, so it can be ported to master as is.
 */

const {
  isPmOrgAdminRole,
  isPmOrgManagerRole,
  buildProjectListFiltersForUser,
  userCanViewProjectRow,
} = require('./rbac');

const WORKSPACE_UID = 'api::workspace.workspace';
const TASK_LIST_UID = 'api::task-list.task-list';
const PROJECT_UID = 'api::project.project';
const TASK_UID = 'api::task.task';
const ORG_UID = 'api::organization.organization';
const ORG_USER_UID = 'api::organization-user.organization-user';

const DEFAULT_WORKSPACE_NAME = 'General';
const DEFAULT_LIST_NAME = 'Tasks';

function relId(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  if (typeof value === 'object') {
    if (value.id != null) return relId(value.id);
    if (Array.isArray(value.connect) && value.connect.length) return relId(value.connect[0]);
    if (Array.isArray(value.set) && value.set.length) return relId(value.set[0]);
  }
  return null;
}

function idList(raw) {
  const list = Array.isArray(raw) ? raw : raw != null ? [raw] : [];
  return list.map(relId).filter((id) => id != null);
}

/**
 * Set a relation on one row without touching its `updatedAt` (Strapi's timestamps subscriber
 * always bumps it). The raw column value is read and written back with knex, so this works the
 * same on SQLite and Postgres. Used only by the background migration — user actions bump it normally.
 */
async function setRelationQuietly(strapi, uid, id, data) {
  const meta = strapi.db.metadata.get(uid);
  const col = meta.attributes.updatedAt?.columnName || 'updated_at';
  const row = await strapi.db.connection(meta.tableName).where({ id }).first(col);
  await strapi.db.query(uid).update({ where: { id }, data });
  if (row && row[col] != null) {
    await strapi.db.connection(meta.tableName).where({ id }).update({ [col]: row[col] });
  }
}

/* ------------------------------------------------------------------ */
/* Defaults (created lazily, never duplicated)                         */
/* ------------------------------------------------------------------ */

/**
 * The org's default ("General") workspace id. Creates it when missing.
 * If two app instances raced and created two defaults, the lowest id wins and the
 * extra, still-empty copies are removed (they only ever hold what this module put there).
 */
async function ensureDefaultWorkspace(strapi, organizationId) {
  const orgId = relId(organizationId);
  if (!orgId) return null;
  const q = strapi.db.query(WORKSPACE_UID);
  let rows = await q.findMany({
    where: { organization: { id: orgId }, isDefault: true },
    select: ['id'],
    orderBy: { id: 'asc' },
  });
  if (!rows.length) {
    await q.create({
      data: {
        name: DEFAULT_WORKSPACE_NAME,
        kind: 'general',
        isDefault: true,
        membersMode: 'all',
        sortOrder: 0,
        description: 'Default workspace. Everyone in the organization can see it.',
        organization: orgId,
      },
    });
    rows = await q.findMany({
      where: { organization: { id: orgId }, isDefault: true },
      select: ['id'],
      orderBy: { id: 'asc' },
    });
  }
  const keep = rows[0]?.id ?? null;
  for (const extra of rows.slice(1)) {
    // Move anything that landed on a duplicate, then drop the empty duplicate.
    const projects = await strapi.db.query(PROJECT_UID).findMany({
      where: { workspace: { id: extra.id } },
      select: ['id'],
    });
    for (const p of projects) {
      await setRelationQuietly(strapi, PROJECT_UID, p.id, { workspace: keep });
    }
    await q.delete({ where: { id: extra.id } });
  }
  return keep;
}

/** A project's default list id. Creates it when missing (same race handling as above). */
async function ensureDefaultTaskList(strapi, projectId, organizationId = null) {
  const pid = relId(projectId);
  if (!pid) return null;
  const q = strapi.db.query(TASK_LIST_UID);
  let rows = await q.findMany({
    where: { project: { id: pid }, isDefault: true },
    select: ['id'],
    orderBy: { id: 'asc' },
  });
  if (!rows.length) {
    let orgId = relId(organizationId);
    if (!orgId) {
      const p = await strapi.db.query(PROJECT_UID).findOne({ where: { id: pid }, populate: { organization: { select: ['id'] } } });
      if (!p) return null;
      orgId = relId(p.organization);
    }
    await q.create({
      data: { name: DEFAULT_LIST_NAME, isDefault: true, sortOrder: 0, project: pid, organization: orgId },
    });
    rows = await q.findMany({
      where: { project: { id: pid }, isDefault: true },
      select: ['id'],
      orderBy: { id: 'asc' },
    });
  }
  const keep = rows[0]?.id ?? null;
  for (const extra of rows.slice(1)) {
    const tasks = await strapi.db.query(TASK_UID).findMany({ where: { taskList: { id: extra.id } }, select: ['id'] });
    for (const t of tasks) {
      await setRelationQuietly(strapi, TASK_UID, t.id, { taskList: keep });
    }
    await q.delete({ where: { id: extra.id } });
  }
  return keep;
}

/**
 * Put every project task that has no list yet into that project's default list.
 * Tasks in several projects go to the list of the first (lowest id) project.
 * Only fills empty `taskList` — never moves a task that already has a list.
 */
async function attachUnlistedTasks(strapi, projectId, listId) {
  const rows = await strapi.db.query(TASK_UID).findMany({
    where: { projects: { id: projectId }, taskList: { id: { $null: true } } },
    select: ['id'],
    limit: 5000,
  });
  for (const t of rows) {
    await setRelationQuietly(strapi, TASK_UID, t.id, { taskList: listId });
  }
  return rows.length;
}

/* ------------------------------------------------------------------ */
/* Start-up bootstrap                                                  */
/* ------------------------------------------------------------------ */

/**
 * Safe to run on every start:
 *  1. every org gets exactly one default "General" workspace (members = whole org);
 *  2. projects with no workspace are attached to it;
 *  3. every project gets one default list, and project tasks with no list are put in it.
 * Only fills empty relations; `updatedAt` is preserved so list orderings don't change.
 */
async function bootstrapWorkspaceHierarchy(strapi) {
  const stats = { orgs: 0, workspacesCreated: 0, projectsAttached: 0, listsCreated: 0, tasksAttached: 0 };
  const orgs = await strapi.db.query(ORG_UID).findMany({ select: ['id'], orderBy: { id: 'asc' } });
  for (const org of orgs) {
    stats.orgs += 1;
    const before = await strapi.db.query(WORKSPACE_UID).count({ where: { organization: { id: org.id }, isDefault: true } });
    const wsId = await ensureDefaultWorkspace(strapi, org.id);
    if (!before && wsId) stats.workspacesCreated += 1;

    const orphanProjects = await strapi.db.query(PROJECT_UID).findMany({
      where: { organization: { id: org.id }, workspace: { id: { $null: true } } },
      select: ['id'],
    });
    for (const p of orphanProjects) {
      await setRelationQuietly(strapi, PROJECT_UID, p.id, { workspace: wsId });
      stats.projectsAttached += 1;
    }
  }

  const projects = await strapi.db.query(PROJECT_UID).findMany({
    select: ['id'],
    populate: { organization: { select: ['id'] } },
    orderBy: { id: 'asc' },
  });
  for (const p of projects) {
    const had = await strapi.db.query(TASK_LIST_UID).count({ where: { project: { id: p.id }, isDefault: true } });
    const listId = await ensureDefaultTaskList(strapi, p.id, relId(p.organization));
    if (!had && listId) stats.listsCreated += 1;
    if (listId) stats.tasksAttached += await attachUnlistedTasks(strapi, p.id, listId);
  }
  return stats;
}

/* ------------------------------------------------------------------ */
/* Access helpers (reuse these — W10 client portal, sprints, etc.)     */
/* ------------------------------------------------------------------ */

function workspaceIsOpen(ws) {
  return !ws || ws.membersMode !== 'restricted';
}

/** Member of the workspace (explicit member, workspace admin or creator). Ignores org role. */
function userIsWorkspaceMember(ws, userId) {
  if (!ws || userId == null) return false;
  const uid = Number(userId);
  if (relId(ws.createdByUser) === uid) return true;
  return [...idList(ws.members), ...idList(ws.admins)].some((id) => id === uid);
}

/** May see the workspace and (subject to project rules) its projects. */
function userCanViewWorkspace(ctx, ws, userId) {
  if (!ws || userId == null) return false;
  if (isPmOrgAdminRole(ctx)) return true;
  return workspaceIsOpen(ws) || userIsWorkspaceMember(ws, userId);
}

/** May rename / change members / delete. Org admins, workspace admins and the creator. */
function userCanManageWorkspace(ctx, ws, userId) {
  if (!ws || userId == null) return false;
  if (isPmOrgAdminRole(ctx)) return true;
  const uid = Number(userId);
  if (relId(ws.createdByUser) === uid) return true;
  return idList(ws.admins).includes(uid);
}

/** Org admins and managers may create workspaces. */
function userCanCreateWorkspace(ctx) {
  return isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx);
}

/** Workspace ids in the org the user can see. */
async function visibleWorkspaceIds(strapi, ctx, orgId, userId) {
  const where = { organization: { id: orgId } };
  if (!isPmOrgAdminRole(ctx)) {
    where.$or = [
      { membersMode: { $ne: 'restricted' } },
      { membersMode: { $null: true } },
      { members: { id: userId } },
      { admins: { id: userId } },
      { createdByUser: { id: userId } },
    ];
  }
  const rows = await strapi.db.query(WORKSPACE_UID).findMany({ where, select: ['id'] });
  return rows.map((r) => r.id);
}

/**
 * Project list filters (entityService syntax) with workspace membership applied.
 * Rule: a non-admin sees a project only if the existing project rules allow it AND either
 * they can see its workspace, or they are explicitly on the project (PM / team member).
 * Projects without a workspace (not yet bootstrapped) stay visible under the old rules.
 */
async function buildProjectVisibilityFilters(strapi, ctx, orgId, userId) {
  const base = buildProjectListFiltersForUser(ctx, orgId, userId);
  if (isPmOrgAdminRole(ctx) || userId == null) return base;
  const wsIds = await visibleWorkspaceIds(strapi, ctx, orgId, userId);
  const wsGate = {
    $or: [
      { workspace: { id: { $null: true } } },
      ...(wsIds.length ? [{ workspace: { id: { $in: wsIds } } }] : []),
      { projectManager: { id: userId } },
      { teamMembers: { id: userId } },
    ],
  };
  const { organization, ...rest } = base;
  const parts = [rest, wsGate].filter((p) => Object.keys(p).length);
  return { organization, $and: parts };
}

/**
 * Single-project check: org, project rules and workspace membership.
 * `project` must be populated with organization, projectManager, teamMembers and
 * workspace (members, admins, createdByUser, membersMode) — use loadProjectForAccess.
 */
function userCanViewProject(ctx, project, userId) {
  if (!project || userId == null) return false;
  if (!userCanViewProjectRow(ctx, project, userId)) return false;
  if (isPmOrgAdminRole(ctx)) return true;
  const ws = project.workspace;
  if (!ws) return true;
  if (userCanViewWorkspace(ctx, ws, userId)) return true;
  const uid = Number(userId);
  if (relId(project.projectManager) === uid) return true;
  return idList(project.teamMembers).includes(uid);
}

const PROJECT_ACCESS_POPULATE = {
  organization: { fields: ['id'] },
  projectManager: { fields: ['id'] },
  teamMembers: { fields: ['id'] },
  workspace: {
    fields: ['id', 'membersMode', 'isDefault', 'name'],
    populate: { members: { fields: ['id'] }, admins: { fields: ['id'] }, createdByUser: { fields: ['id'] } },
  },
};

/** Load a project in the caller's org that the caller may view, else null. */
async function loadProjectForAccess(strapi, ctx, projectId) {
  const id = relId(projectId);
  if (!id) return null;
  const p = await strapi.entityService.findOne(PROJECT_UID, id, {
    fields: ['id', 'name', 'isPrivate'],
    populate: PROJECT_ACCESS_POPULATE,
  });
  if (!p || relId(p.organization) !== Number(ctx.state.orgId)) return null;
  if (!userCanViewProject(ctx, p, ctx.state.user?.id)) return null;
  return p;
}

/** Workspace in the org that the caller may view, else null. */
async function loadWorkspaceForAccess(strapi, ctx, workspaceId) {
  const id = relId(workspaceId);
  if (!id) return null;
  const ws = await strapi.entityService.findOne(WORKSPACE_UID, id, {
    populate: {
      organization: { fields: ['id'] },
      members: { fields: ['id'] },
      admins: { fields: ['id'] },
      createdByUser: { fields: ['id'] },
    },
  });
  if (!ws || relId(ws.organization) !== Number(ctx.state.orgId)) return null;
  if (!userCanViewWorkspace(ctx, ws, ctx.state.user?.id)) return null;
  return ws;
}

/**
 * Validate a task-list reference for a task create/update.
 * `projectsInput` is the task's (normalized) projects relation — the list must belong to one of them.
 * Returns { ok, id, projectId } or { ok: false, message }.
 */
async function resolveTaskListInput(strapi, orgId, raw, projectsInput) {
  const id = relId(raw);
  if (!id) return { ok: false, message: 'Invalid task list' };
  const list = await strapi.db.query(TASK_LIST_UID).findOne({
    where: { id },
    populate: { organization: { select: ['id'] }, project: { select: ['id'] } },
  });
  if (!list || relId(list.organization) !== Number(orgId)) {
    return { ok: false, message: 'Task list not found in this organization' };
  }
  const projectId = relId(list.project);
  let pids = [];
  if (Array.isArray(projectsInput)) pids = idList(projectsInput);
  else if (projectsInput && typeof projectsInput === 'object') {
    pids = [...idList(projectsInput.set), ...idList(projectsInput.connect)];
  }
  if (pids.length && !pids.includes(projectId)) {
    return { ok: false, message: 'Task list belongs to a different project' };
  }
  return { ok: true, id, projectId };
}

/** Active member user ids of an org (for validating workspace members). */
async function orgMemberUserIds(strapi, orgId) {
  const rows = await strapi.db.query(ORG_USER_UID).findMany({
    where: { organization: { id: orgId }, isActive: { $ne: false } },
    populate: { user: { select: ['id'] } },
  });
  return new Set(rows.map((r) => relId(r.user)).filter((id) => id != null));
}

module.exports = {
  WORKSPACE_UID,
  TASK_LIST_UID,
  DEFAULT_WORKSPACE_NAME,
  DEFAULT_LIST_NAME,
  relId,
  idList,
  ensureDefaultWorkspace,
  ensureDefaultTaskList,
  attachUnlistedTasks,
  bootstrapWorkspaceHierarchy,
  workspaceIsOpen,
  userIsWorkspaceMember,
  userCanViewWorkspace,
  userCanManageWorkspace,
  userCanCreateWorkspace,
  visibleWorkspaceIds,
  buildProjectVisibilityFilters,
  userCanViewProject,
  loadProjectForAccess,
  loadWorkspaceForAccess,
  orgMemberUserIds,
  resolveTaskListInput,
  PROJECT_ACCESS_POPULATE,
};
