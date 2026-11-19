'use strict';

/**
 * Team-side client portal controls in Work (W10): share a project, choose which tasks and files the
 * client sees, invite client contacts and revoke them. Normal user JWT + active organization.
 *
 * Who may do what
 * - Share a project / invite / revoke: org admins, PM managers who can see the project, the
 *   project's manager, or anyone with PM projects "manage".
 * - Toggle task / file visibility: PM projects "write" on a project the user can see.
 */

const portal = require('../../../utils/client-portal');
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const {
  canAccess,
  requireModuleAccess,
  isPmOrgAdminRole,
  isPmOrgManagerRole,
  userCanViewProjectRow,
} = require('../../../utils/rbac');

const PROJECT_UID = 'api::project.project';
const TASK_UID = 'api::task.task';
const CONTACT_UID = 'api::contact.contact';
const ATTACHMENT_UID = 'api::entity-attachment.entity-attachment';

const relId = (rel) => (rel == null ? null : typeof rel === 'object' ? rel.id ?? null : Number(rel) || null);
const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};
const userName = (u) => [u?.firstName, u?.lastName].filter(Boolean).join(' ').trim() || u?.username || u?.email || 'Your project team';

/** Returns a response body when the request must stop (ctx.unauthorized/forbidden return nothing). */
function guard(ctx, access = 'write') {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return ctx.body || { error: 'unauthorized' };
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return ctx.body || { error: 'forbidden' };
  }
  return requireModuleAccess(ctx, 'pm', 'projects', access) || null;
}

async function loadProject(ctx, rawId) {
  const id = portal.toId(rawId);
  if (!id) return null;
  const project = await strapi.entityService.findOne(PROJECT_UID, id, {
    fields: ['id', 'name', 'isPrivate', 'clientPortalEnabled'],
    populate: {
      organization: { fields: ['id'] },
      projectManager: { fields: ['id'] },
      teamMembers: { fields: ['id'] },
      clientAccount: { fields: ['id', 'companyName'] },
    },
  });
  if (!project || orgIdFromRelation(project.organization) !== ctx.state.orgId) return null;
  if (!userCanViewProjectRow(ctx, project, ctx.state.user.id)) return null;
  return project;
}

function canManagePortal(ctx, project) {
  if (isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx)) return true;
  if (canAccess(ctx, 'pm', 'projects', 'manage')) return true;
  return project != null && relId(project.projectManager) === ctx.state.user.id;
}

async function loadOrgContact(ctx, rawId) {
  const id = portal.toId(rawId);
  if (!id) return null;
  const contact = await strapi.entityService.findOne(CONTACT_UID, id, {
    fields: ['id', 'firstName', 'lastName', 'email', 'portalAccess'],
    populate: { organization: { fields: ['id'] }, clientAccount: { fields: ['id'] } },
  });
  if (!contact || orgIdFromRelation(contact.organization) !== ctx.state.orgId) return null;
  return contact;
}

async function lastActive(contactId) {
  const [row] = await strapi.entityService.findMany(portal.SESSION_UID, {
    filters: { kind: 'session', contact: { id: contactId } },
    fields: ['lastUsedAt'],
    sort: { lastUsedAt: 'desc' },
    limit: 1,
  });
  return row?.lastUsedAt || null;
}

module.exports = {
  /** GET /client-portal/projects/:id — sharing state + the client account's contacts. */
  async projectSharing(ctx) {
    const denied = guard(ctx, 'read');
    if (denied) return denied;
    const project = await loadProject(ctx, ctx.params.id);
    if (!project) return ctx.notFound('Project not found');

    const clientAccountId = relId(project.clientAccount);
    const contacts = clientAccountId
      ? await strapi.entityService.findMany(CONTACT_UID, {
          filters: { organization: { id: ctx.state.orgId }, clientAccount: { id: clientAccountId } },
          fields: ['id', 'firstName', 'lastName', 'email', 'portalAccess'],
          sort: { firstName: 'asc' },
          limit: 200,
        })
      : [];
    const rows = [];
    for (const c of contacts) {
      rows.push({
        id: c.id,
        name: portal.contactName(c),
        email: c.email || '',
        portalAccess: c.portalAccess === true,
        lastActiveAt: c.portalAccess ? await lastActive(c.id) : null,
      });
    }
    const tasks = await strapi.entityService.findMany(TASK_UID, {
      filters: { organization: { id: ctx.state.orgId }, projects: { id: project.id }, status: { $ne: 'CANCELLED' } },
      fields: ['id', 'name', 'status', 'taskType', 'scheduledDate', 'clientVisible', 'clientApprovalStatus', 'clientApprovalComment', 'clientApprovalAt'],
      populate: { parent: { fields: ['id'] }, clientRequestedBy: { fields: ['id', 'firstName', 'lastName'] } },
      sort: [{ createdAt: 'asc' }],
      limit: 500,
    });
    const taskIds = tasks.map((t) => t.id);
    const or = [{ subjectType: 'project', subjectId: project.id }];
    if (taskIds.length) or.push({ subjectType: 'task', subjectId: { $in: taskIds } });
    const files = await strapi.entityService.findMany(ATTACHMENT_UID, {
      filters: { organization: { id: ctx.state.orgId }, $or: or },
      fields: ['id', 'fileName', 'subjectType', 'subjectId', 'clientShareable', 'createdAt'],
      populate: { file: { fields: ['name', 'url', 'mime'] } },
      sort: { createdAt: 'desc' },
      limit: 300,
    });
    const taskName = new Map(tasks.map((t) => [t.id, t.name]));

    ctx.body = {
      data: {
        projectId: project.id,
        enabled: project.clientPortalEnabled === true,
        tasks: tasks.map((t) => ({
          id: t.id,
          name: t.name,
          status: t.status,
          type: t.taskType || 'task',
          dueDate: t.scheduledDate || null,
          isSubtask: Boolean(relId(t.parent)),
          clientVisible: t.clientVisible === true,
          approval: { status: t.clientApprovalStatus || 'none', comment: t.clientApprovalComment || '', at: t.clientApprovalAt || null },
          requestedBy: t.clientRequestedBy ? portal.contactName(t.clientRequestedBy) : null,
        })),
        files: files.map((f) => ({
          id: f.id,
          name: f.fileName || f.file?.name || 'File',
          url: f.file?.url || null,
          taskId: f.subjectType === 'task' ? f.subjectId : null,
          taskName: f.subjectType === 'task' ? taskName.get(f.subjectId) || null : null,
          clientShareable: f.clientShareable === true,
        })),
        clientAccount: project.clientAccount ? { id: project.clientAccount.id, name: project.clientAccount.companyName } : null,
        contacts: rows,
        canManage: canManagePortal(ctx, project),
        feature: portal.CLIENT_PORTAL_FEATURE,
        featureAvailable: await portal.orgHasPortalFeature(strapi, ctx.state.orgId),
      },
    };
  },

  /** PUT /client-portal/projects/:id/sharing { enabled } */
  async setProjectSharing(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const project = await loadProject(ctx, ctx.params.id);
    if (!project) return ctx.notFound('Project not found');
    if (!canManagePortal(ctx, project)) return ctx.forbidden('Only project managers can share a project with the client');
    const enabled = body(ctx).enabled === true;
    if (enabled && !relId(project.clientAccount)) return ctx.badRequest('Link the project to a client account first');
    if (enabled && !(await portal.orgHasPortalFeature(strapi, ctx.state.orgId))) {
      return ctx.forbidden('The client portal is not included in your plan');
    }
    await strapi.entityService.update(PROJECT_UID, project.id, { data: { clientPortalEnabled: enabled } });
    ctx.body = { data: { projectId: project.id, enabled } };
  },

  /** PUT /client-portal/tasks/:id { clientVisible?, requestApproval? } */
  async setTaskSharing(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const id = portal.toId(ctx.params.id);
    if (!id) return ctx.notFound('Task not found');
    const task = await strapi.entityService.findOne(TASK_UID, id, {
      fields: ['id', 'taskType', 'clientVisible', 'clientApprovalStatus'],
      populate: { organization: { fields: ['id'] }, projects: { fields: ['id'] } },
    });
    if (!task || orgIdFromRelation(task.organization) !== ctx.state.orgId) return ctx.notFound('Task not found');
    let visibleProject = null;
    for (const p of task.projects || []) {
      visibleProject = visibleProject || (await loadProject(ctx, p.id));
    }
    if (!visibleProject) return ctx.forbidden('You cannot change this task');

    const input = body(ctx);
    const data = {};
    if (typeof input.clientVisible === 'boolean') data.clientVisible = input.clientVisible;
    const willBeVisible = data.clientVisible ?? task.clientVisible === true;
    if (task.taskType === 'deliverable' && willBeVisible) {
      // Sharing a deliverable asks the client for approval; requestApproval re-asks after changes.
      if (input.requestApproval === true || (data.clientVisible === true && (task.clientApprovalStatus || 'none') === 'none')) {
        data.clientApprovalStatus = 'pending';
      }
    }
    if (!Object.keys(data).length) return ctx.badRequest('Nothing to change');
    const updated = await strapi.entityService.update(TASK_UID, task.id, {
      data,
      fields: ['id', 'clientVisible', 'clientApprovalStatus', 'clientApprovalComment', 'clientApprovalAt'],
    });
    ctx.body = { data: updated };
  },

  /** PUT /client-portal/attachments/:id { clientShareable } */
  async setFileSharing(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const id = portal.toId(ctx.params.id);
    if (!id) return ctx.notFound('File not found');
    const row = await strapi.entityService.findOne(ATTACHMENT_UID, id, {
      fields: ['id', 'subjectType', 'subjectId'],
      populate: { organization: { fields: ['id'] } },
    });
    if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) return ctx.notFound('File not found');
    let projectIds = [];
    if (row.subjectType === 'project') projectIds = [row.subjectId];
    else if (row.subjectType === 'task') {
      const task = await strapi.entityService.findOne(TASK_UID, row.subjectId, { fields: ['id'], populate: { projects: { fields: ['id'] } } });
      projectIds = (task?.projects || []).map((p) => p.id);
    } else return ctx.badRequest('Only project and task files can be shared with clients');
    let ok = false;
    for (const pid of projectIds) ok = ok || Boolean(await loadProject(ctx, pid));
    if (!ok) return ctx.forbidden('You cannot change this file');
    const clientShareable = body(ctx).clientShareable === true;
    await strapi.entityService.update(ATTACHMENT_UID, row.id, { data: { clientShareable } });
    ctx.body = { data: { id: row.id, clientShareable } };
  },

  /** POST /client-portal/contacts/:id/invite { projectId? } — turns portal access on and emails a magic link. */
  async invite(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const contact = await loadOrgContact(ctx, ctx.params.id);
    if (!contact) return ctx.notFound('Contact not found');
    const projectId = body(ctx).projectId;
    const project = projectId != null ? await loadProject(ctx, projectId) : null;
    if (projectId != null && !project) return ctx.notFound('Project not found');
    if (!canManagePortal(ctx, project)) return ctx.forbidden('Only project managers can invite clients');
    if (!contact.email) return ctx.badRequest('This contact has no email address');
    if (!relId(contact.clientAccount)) return ctx.badRequest('Link this contact to a client account first');
    if (project && relId(project.clientAccount) !== relId(contact.clientAccount)) {
      return ctx.badRequest("This contact does not belong to the project's client account");
    }
    if (!(await portal.orgHasPortalFeature(strapi, ctx.state.orgId))) {
      return ctx.forbidden('The client portal is not included in your plan');
    }

    if (contact.portalAccess !== true) {
      await strapi.entityService.update(CONTACT_UID, contact.id, { data: { portalAccess: true } });
    }
    const eligible = await portal.loadEligibleContact(strapi, contact.id);
    if (!eligible) return ctx.badRequest('This contact cannot use the portal');
    try {
      await portal.issueMagicLink(strapi, eligible, { invitedBy: userName(ctx.state.user) });
    } catch (e) {
      if (e instanceof portal.PortalError) {
        ctx.status = e.status;
        ctx.body = { data: null, error: { status: e.status, name: 'PortalError', message: e.message, details: { code: e.code } } };
        return;
      }
      throw e;
    }
    ctx.body = { data: { contactId: contact.id, portalAccess: true, invited: true } };
  },

  /** POST /client-portal/contacts/:id/revoke — turns portal access off and ends every session. */
  async revoke(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const contact = await loadOrgContact(ctx, ctx.params.id);
    if (!contact) return ctx.notFound('Contact not found');
    if (!canManagePortal(ctx, null)) {
      // A project manager may revoke contacts of their own project's client.
      const projectId = body(ctx).projectId;
      const project = projectId != null ? await loadProject(ctx, projectId) : null;
      if (!project || !canManagePortal(ctx, project) || relId(project.clientAccount) !== relId(contact.clientAccount)) {
        return ctx.forbidden('Only project managers can revoke client access');
      }
    }
    await strapi.entityService.update(CONTACT_UID, contact.id, { data: { portalAccess: false } });
    const sessions = await portal.revokeContactSessions(strapi, contact.id);
    ctx.body = { data: { contactId: contact.id, portalAccess: false, sessionsRevoked: sessions } };
  },
};
