'use strict';

/**
 * Project docs (W8): rich-text briefs, SOPs and meeting notes that live in a Work project or a
 * workspace. Content is TipTap JSON (see utils/project-docs.js).
 *
 * Access
 *  - Read: PM `projects` read + can view the doc's project (W1 rules incl. workspace membership),
 *    or, for a workspace-level doc, can view the workspace.
 *  - Write (create / edit / save version / restore): PM `projects` write + the same visibility.
 *  - Delete: the author, the project manager, PM org admins/managers or `projects` manage.
 *
 * Versions: before an edit, the previous state is snapshotted when the last snapshot is older than
 * 10 minutes or someone else made the last edit. "Save version" snapshots on demand; restore
 * snapshots the current state first, so a restore can itself be undone.
 *
 * @mentions: new mention nodes notify the user (type `mention`) through the notification emitter.
 * Convert-to-task happens in the PM app through the existing POST /tasks, so task rules,
 * assignment approval and task notifications stay in one place.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const { canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../../../utils/rbac');
const {
  relId,
  loadProjectForAccess,
  loadWorkspaceForAccess,
  buildProjectVisibilityFilters,
  visibleWorkspaceIds,
  orgMemberUserIds,
} = require('../../../utils/workspaces');
const { notifyUsers } = require('../../../utils/notification-emitter');
const { actorDisplayName } = require('../../../utils/crm-activity-log');
const docs = require('../../../utils/project-docs');

const UID = 'api::project-doc.project-doc';
const VERSION_UID = 'api::project-doc-version.project-doc-version';
const PROJECT_UID = 'api::project.project';
const TASK_UID = 'api::task.task';
const DOC_TYPES = new Set(['brief', 'sop', 'meeting_notes', 'wiki', 'other']);

const USER_FIELDS = ['id', 'username', 'firstName', 'lastName', 'email'];
const DOC_POPULATE = {
  organization: { fields: ['id'] },
  project: { fields: ['id', 'name'] },
  workspace: { fields: ['id', 'name'] },
  author: { fields: USER_FIELDS },
  lastEditedBy: { fields: USER_FIELDS },
};

const userName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email : null);
const userRef = (u) => (u ? { id: u.id, name: userName(u) } : null);

function guard(ctx, level = 'read') {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  if (!canAccess(ctx, 'pm', 'projects', level)) {
    ctx.forbidden(`You need ${level} access to PM.projects`);
    return false;
  }
  return true;
}

function serialize(doc, { full = false } = {}) {
  const out = {
    id: doc.id,
    documentId: doc.documentId,
    title: doc.title,
    docType: doc.docType || 'other',
    excerpt: docs.snippet(doc.contentText, 200),
    versionCount: doc.versionCount || 0,
    project: doc.project ? { id: doc.project.id, name: doc.project.name } : null,
    workspace: doc.workspace ? { id: doc.workspace.id, name: doc.workspace.name } : null,
    author: userRef(doc.author),
    lastEditedBy: userRef(doc.lastEditedBy),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
  if (full) out.content = docs.isDocJson(doc.content) ? doc.content : null;
  return out;
}

function serializeVersion(v, { full = false } = {}) {
  const out = {
    id: v.id,
    versionNumber: v.versionNumber,
    title: v.title,
    reason: v.reason || 'auto',
    note: v.note || null,
    excerpt: docs.snippet(v.contentText, 120),
    author: userRef(v.author),
    createdAt: v.createdAt,
  };
  if (full) out.content = docs.isDocJson(v.content) ? v.content : null;
  return out;
}

/** The doc in the caller's org that the caller may view, plus its project (if any). */
async function loadDoc(strapi, ctx, rawId = ctx.params.id) {
  const id = relId(rawId);
  if (!id) return null;
  const doc = await strapi.entityService.findOne(UID, id, { populate: DOC_POPULATE });
  if (!doc || relId(doc.organization) !== Number(ctx.state.orgId)) return null;
  if (doc.project) {
    const project = await loadProjectForAccess(strapi, ctx, doc.project.id);
    return project ? { doc, project } : null;
  }
  if (doc.workspace) {
    const ws = await loadWorkspaceForAccess(strapi, ctx, doc.workspace.id);
    return ws ? { doc, project: null } : null;
  }
  return null; // every doc belongs to a project or a workspace
}

function canDelete(ctx, doc, project) {
  const uid = Number(ctx.state.user.id);
  if (isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx)) return true;
  if (canAccess(ctx, 'pm', 'projects', 'manage')) return true;
  if (relId(doc.author) === uid) return true;
  return relId(project?.projectManager) === uid;
}

async function nextVersionNumber(strapi, docId) {
  const [last] = await strapi.entityService.findMany(VERSION_UID, {
    filters: { doc: { id: docId } },
    sort: { versionNumber: 'desc' },
    fields: ['versionNumber'],
    limit: 1,
  });
  return (Number(last?.versionNumber) || 0) + 1;
}

/** Store the doc's current state as a version. */
async function snapshot(strapi, ctx, doc, { reason, note, authorId } = {}) {
  const versionNumber = await nextVersionNumber(strapi, doc.id);
  await strapi.entityService.create(VERSION_UID, {
    data: {
      doc: doc.id,
      organization: ctx.state.orgId,
      versionNumber,
      title: doc.title,
      content: docs.isDocJson(doc.content) ? doc.content : null,
      contentText: doc.contentText || '',
      reason: reason || 'auto',
      note: note ? String(note).slice(0, 200) : null,
      author: authorId ?? relId(doc.lastEditedBy) ?? relId(doc.author) ?? ctx.state.user.id,
    },
  });
  return versionNumber;
}

/** Notify users newly @mentioned in the doc (org members only, never the actor). */
async function notifyMentions(strapi, ctx, doc, previousIds) {
  const fresh = docs.newMentionIds(previousIds, doc.content);
  const actorId = Number(ctx.state.user.id);
  const candidates = fresh.filter((id) => id !== actorId);
  if (!candidates.length) return;
  const members = await orgMemberUserIds(strapi, ctx.state.orgId);
  const userIds = candidates.filter((id) => members.has(id));
  if (!userIds.length) return;
  const actorName = await actorDisplayName(strapi, actorId);
  const where = doc.project?.name ? ` in ${doc.project.name}` : '';
  await notifyUsers(strapi, {
    userIds,
    organizationId: ctx.state.orgId,
    type: 'mention',
    title: `${actorName} mentioned you in a doc`,
    message: `"${doc.title}"${where}`,
    data: {
      priority: 'urgent',
      subjectType: 'project_doc',
      subjectId: doc.id,
      actorId,
      app: 'pm',
      href: `/docs/${doc.id}`,
    },
  });
}

/** Linked task chips: id, name, status for task links that resolve inside the org. */
async function linkedTasks(strapi, ctx, content) {
  const ids = docs.linkedTaskIds(content).slice(0, 200);
  if (!ids.length) return [];
  const rows = await strapi.entityService.findMany(TASK_UID, {
    filters: { id: { $in: ids }, organization: { id: ctx.state.orgId } },
    fields: ['id', 'name', 'status'],
    limit: ids.length,
  });
  return rows.map((t) => ({ id: t.id, name: t.name, status: t.status }));
}

function readContentInput(data) {
  if (!Object.prototype.hasOwnProperty.call(data, 'content')) return { has: false };
  const err = docs.contentError(data.content);
  if (err) return { has: true, error: err };
  return { has: true, content: data.content, text: docs.docToPlainText(data.content) };
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  /** GET /project-docs?project=&workspace=&q= — docs the caller can see (no content). */
  async find(ctx) {
    if (!guard(ctx)) return;
    const orgId = ctx.state.orgId;
    const userId = ctx.state.user.id;
    const { project, workspace, q, docType } = ctx.query || {};
    const and = [{ organization: { id: orgId } }];

    if (project) {
      const p = await loadProjectForAccess(strapi, ctx, project);
      if (!p) return ctx.notFound('Project not found');
      and.push({ project: { id: p.id } });
    } else {
      const projectFilters = await buildProjectVisibilityFilters(strapi, ctx, orgId, userId);
      const visibleProjects = await strapi.entityService.findMany(PROJECT_UID, {
        filters: projectFilters,
        fields: ['id'],
        limit: 5000,
      });
      const projectIds = visibleProjects.map((p) => p.id);
      const wsIds = await visibleWorkspaceIds(strapi, ctx, orgId, userId);
      const scope = [];
      if (projectIds.length) scope.push({ project: { id: { $in: projectIds } } });
      if (wsIds.length) scope.push({ project: { id: { $null: true } }, workspace: { id: { $in: wsIds } } });
      if (!scope.length) {
        ctx.body = { data: [], meta: { canCreate: canAccess(ctx, 'pm', 'projects', 'write') } };
        return;
      }
      and.push({ $or: scope });
      if (workspace) {
        const ws = await loadWorkspaceForAccess(strapi, ctx, workspace);
        if (!ws) return ctx.notFound('Workspace not found');
        and.push({ workspace: { id: ws.id } });
      }
    }
    if (docType && DOC_TYPES.has(String(docType))) and.push({ docType: String(docType) });
    const term = String(q || '').trim().slice(0, 100);
    if (term) and.push({ $or: [{ title: { $containsi: term } }, { contentText: { $containsi: term } }] });

    const rows = await strapi.entityService.findMany(UID, {
      filters: { $and: and },
      fields: ['id', 'documentId', 'title', 'docType', 'contentText', 'versionCount', 'createdAt', 'updatedAt'],
      populate: DOC_POPULATE,
      sort: { updatedAt: 'desc' },
      limit: 500,
    });
    ctx.body = {
      data: rows.map((d) => serialize(d)),
      meta: { canCreate: canAccess(ctx, 'pm', 'projects', 'write') },
    };
  },

  /** GET /project-docs/:id — full doc + linked task statuses + what the caller may do. */
  async findOne(ctx) {
    if (!guard(ctx)) return;
    const found = await loadDoc(strapi, ctx);
    if (!found) return ctx.notFound('Doc not found');
    const { doc, project } = found;
    ctx.body = {
      data: {
        ...serialize(doc, { full: true }),
        linkedTasks: await linkedTasks(strapi, ctx, doc.content),
      },
      meta: {
        canEdit: canAccess(ctx, 'pm', 'projects', 'write'),
        canDelete: canDelete(ctx, doc, project),
        canCreateTasks: Boolean(project) && canAccess(ctx, 'pm', 'tasks', 'write'),
      },
    };
  },

  /** POST /project-docs { data: { title, docType, project | workspace, content } } */
  async create(ctx) {
    if (!guard(ctx, 'write')) return;
    const data = ctx.request.body?.data || {};
    const title = String(data.title || '').trim().slice(0, 200) || 'Untitled doc';
    const docType = DOC_TYPES.has(String(data.docType)) ? String(data.docType) : 'other';

    let projectId = null;
    let workspaceId = null;
    if (data.project != null && data.project !== '') {
      const p = await loadProjectForAccess(strapi, ctx, data.project);
      if (!p) return ctx.badRequest('Project not found');
      projectId = p.id;
      workspaceId = relId(p.workspace);
    } else if (data.workspace != null && data.workspace !== '') {
      const ws = await loadWorkspaceForAccess(strapi, ctx, data.workspace);
      if (!ws) return ctx.badRequest('Workspace not found');
      workspaceId = ws.id;
    } else {
      return ctx.badRequest('A doc belongs to a project or a workspace');
    }

    const input = readContentInput(data);
    if (input.error) return ctx.badRequest(input.error);
    const content = input.has ? input.content : null;

    const created = await strapi.entityService.create(UID, {
      data: {
        title,
        docType,
        content,
        contentText: input.has ? input.text : '',
        mentionedUserIds: docs.mentionedUserIds(content),
        versionCount: 0,
        organization: ctx.state.orgId,
        project: projectId,
        workspace: workspaceId,
        author: ctx.state.user.id,
        lastEditedBy: ctx.state.user.id,
      },
      populate: DOC_POPULATE,
    });
    await notifyMentions(strapi, ctx, created, []);
    ctx.status = 201;
    ctx.body = { data: serialize(created, { full: true }) };
  },

  /**
   * PUT /project-docs/:id { data: { title?, docType?, content? , baseUpdatedAt? } }
   * `baseUpdatedAt` (the updatedAt the editor loaded) turns on conflict detection: if someone else
   * saved since, the API answers 409 with the latest doc instead of overwriting their work.
   */
  async update(ctx) {
    if (!guard(ctx, 'write')) return;
    const found = await loadDoc(strapi, ctx);
    if (!found) return ctx.notFound('Doc not found');
    const { doc } = found;
    const data = ctx.request.body?.data || {};
    const userId = Number(ctx.state.user.id);

    if (data.baseUpdatedAt && doc.updatedAt) {
      const base = new Date(data.baseUpdatedAt).getTime();
      const current = new Date(doc.updatedAt).getTime();
      if (Number.isFinite(base) && current > base && relId(doc.lastEditedBy) !== userId) {
        ctx.status = 409;
        ctx.body = {
          data: null,
          error: {
            status: 409,
            name: 'ConflictError',
            message: `${userName(doc.lastEditedBy) || 'Someone'} saved this doc after you opened it.`,
            details: { code: 'DOC_CONFLICT', latest: serialize(doc, { full: true }) },
          },
        };
        return;
      }
    }

    const patch = {};
    if (data.title !== undefined) patch.title = String(data.title || '').trim().slice(0, 200) || 'Untitled doc';
    if (data.docType !== undefined && DOC_TYPES.has(String(data.docType))) patch.docType = String(data.docType);
    const input = readContentInput(data);
    if (input.error) return ctx.badRequest(input.error);
    if (input.has) {
      patch.content = input.content;
      patch.contentText = input.text;
      patch.mentionedUserIds = docs.mentionedUserIds(input.content);
    }
    if (!Object.keys(patch).length) {
      ctx.body = { data: serialize(doc, { full: true }) };
      return;
    }

    const contentChanged =
      (input.has && JSON.stringify(input.content) !== JSON.stringify(doc.content || null)) ||
      (patch.title !== undefined && patch.title !== doc.title);
    if (contentChanged && docs.shouldSnapshotBeforeEdit(doc, userId)) {
      const n = await snapshot(strapi, ctx, doc, { reason: 'auto' });
      patch.versionCount = n;
      patch.lastSnapshotAt = new Date();
    }
    patch.lastEditedBy = userId;

    const updated = await strapi.entityService.update(UID, doc.id, { data: patch, populate: DOC_POPULATE });
    if (input.has) await notifyMentions(strapi, ctx, updated, doc.mentionedUserIds);
    ctx.body = {
      data: { ...serialize(updated, { full: true }), linkedTasks: await linkedTasks(strapi, ctx, updated.content) },
    };
  },

  /** DELETE /project-docs/:id — removes the doc and its versions. */
  async delete(ctx) {
    if (!guard(ctx, 'write')) return;
    const found = await loadDoc(strapi, ctx);
    if (!found) return ctx.notFound('Doc not found');
    const { doc, project } = found;
    if (!canDelete(ctx, doc, project)) return ctx.forbidden('Only the author, the project manager or an admin can delete this doc');
    await strapi.db.query(VERSION_UID).deleteMany({ where: { doc: { id: doc.id } } });
    await strapi.entityService.delete(UID, doc.id);
    ctx.body = { data: { id: doc.id } };
  },

  /** GET /project-docs/:id/versions — newest first, without content. */
  async versions(ctx) {
    if (!guard(ctx)) return;
    const found = await loadDoc(strapi, ctx);
    if (!found) return ctx.notFound('Doc not found');
    const rows = await strapi.entityService.findMany(VERSION_UID, {
      filters: { doc: { id: found.doc.id } },
      fields: ['id', 'versionNumber', 'title', 'reason', 'note', 'contentText', 'createdAt'],
      populate: { author: { fields: USER_FIELDS } },
      sort: { versionNumber: 'desc' },
      limit: 200,
    });
    ctx.body = { data: rows.map((v) => serializeVersion(v)) };
  },

  /** GET /project-docs/:id/versions/:versionId — one version with content (for preview). */
  async version(ctx) {
    if (!guard(ctx)) return;
    const found = await loadDoc(strapi, ctx);
    if (!found) return ctx.notFound('Doc not found');
    const v = await loadVersion(strapi, found.doc.id, ctx.params.versionId);
    if (!v) return ctx.notFound('Version not found');
    ctx.body = { data: serializeVersion(v, { full: true }) };
  },

  /** POST /project-docs/:id/versions { data: { note? } } — snapshot the current state now. */
  async saveVersion(ctx) {
    if (!guard(ctx, 'write')) return;
    const found = await loadDoc(strapi, ctx);
    if (!found) return ctx.notFound('Doc not found');
    const { doc } = found;
    const note = ctx.request.body?.data?.note;
    const n = await snapshot(strapi, ctx, doc, { reason: 'manual', note, authorId: ctx.state.user.id });
    await strapi.entityService.update(UID, doc.id, { data: { versionCount: n, lastSnapshotAt: new Date() } });
    ctx.status = 201;
    ctx.body = { data: { versionNumber: n } };
  },

  /** POST /project-docs/:id/versions/:versionId/restore — current state is kept as a version first. */
  async restore(ctx) {
    if (!guard(ctx, 'write')) return;
    const found = await loadDoc(strapi, ctx);
    if (!found) return ctx.notFound('Doc not found');
    const { doc } = found;
    const v = await loadVersion(strapi, doc.id, ctx.params.versionId);
    if (!v) return ctx.notFound('Version not found');

    const n = await snapshot(strapi, ctx, doc, {
      reason: 'before_restore',
      note: `Before restoring version ${v.versionNumber}`,
      authorId: ctx.state.user.id,
    });
    const content = docs.isDocJson(v.content) ? v.content : null;
    const updated = await strapi.entityService.update(UID, doc.id, {
      data: {
        title: v.title || doc.title,
        content,
        contentText: docs.docToPlainText(content),
        mentionedUserIds: docs.mentionedUserIds(content),
        versionCount: n,
        lastSnapshotAt: new Date(),
        lastEditedBy: ctx.state.user.id,
      },
      populate: DOC_POPULATE,
    });
    ctx.body = {
      data: { ...serialize(updated, { full: true }), linkedTasks: await linkedTasks(strapi, ctx, updated.content) },
      meta: { restoredVersion: v.versionNumber, savedAsVersion: n },
    };
  },
}));

async function loadVersion(strapi, docId, rawVersionId) {
  const id = relId(rawVersionId);
  if (!id) return null;
  const v = await strapi.entityService.findOne(VERSION_UID, id, {
    populate: { doc: { fields: ['id'] }, author: { fields: USER_FIELDS } },
  });
  if (!v || relId(v.doc) !== Number(docId)) return null;
  return v;
}
