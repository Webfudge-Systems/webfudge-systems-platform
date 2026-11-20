'use strict';

/**
 * Client portal API (W10), used by client contacts — never by team users.
 * Auth is the portal session token (`Authorization: Bearer wfp_…`), resolved per request by
 * utils/client-portal.resolvePortal. Every read and write is scoped to the projects that contact
 * may see; anything outside that scope answers 404.
 */

const portal = require('../../../utils/client-portal');

const TASK_UID = 'api::task.task';
const MAX_TITLE = 200;
const MAX_TEXT = 5000;

function fail(ctx, e) {
  if (e instanceof portal.PortalError) {
    ctx.status = e.status;
    ctx.body = { data: null, error: { status: e.status, name: 'PortalError', message: e.message, details: { code: e.code } } };
    return;
  }
  throw e;
}

/** Wraps a handler that needs a signed-in portal contact. */
const withPortal = (handler) => async (ctx) => {
  try {
    const session = await portal.resolvePortal(strapi, ctx);
    ctx.set('Cache-Control', 'no-store');
    return await handler(ctx, session);
  } catch (e) {
    return fail(ctx, e);
  }
};

const notFound = (ctx) => fail(ctx, new portal.PortalError(404, 'NOT_FOUND', 'Not found'));
const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};
const text = (v, max) => String(v ?? '').trim().slice(0, max);

module.exports = {
  /** POST /portal/auth/request-link { email } — always 200 so emails cannot be probed. */
  async requestLink(ctx) {
    await portal.requestMagicLink(strapi, body(ctx).email);
    ctx.body = { data: { ok: true } };
  },

  /** POST /portal/auth/exchange { token } → { token, expiresAt } */
  async exchange(ctx) {
    try {
      ctx.set('Cache-Control', 'no-store');
      ctx.body = { data: await portal.exchangeMagicLink(strapi, body(ctx).token) };
    } catch (e) {
      return fail(ctx, e);
    }
  },

  logout: withPortal(async (ctx, session) => {
    await strapi.entityService.update(portal.SESSION_UID, session.sessionId, { data: { revokedAt: new Date() } });
    ctx.body = { data: { ok: true } };
  }),

  /** GET /portal/me — who is signed in and the projects shared with them. */
  me: withPortal(async (ctx, session) => {
    const projects = await portal.listPortalProjects(strapi, session);
    const withProgress = [];
    for (const p of projects) {
      withProgress.push({ ...p, progress: await portal.projectProgress(strapi, p.id) });
    }
    ctx.body = {
      data: {
        contact: {
          id: session.contact.id,
          name: portal.contactName(session.contact),
          email: session.contact.email,
        },
        organization: { name: session.contact.organization?.name || '' },
        client: { name: session.contact.clientAccount?.companyName || '' },
        projects: withProgress,
      },
    };
  }),

  /** GET /portal/projects/:id — progress, milestones, client-visible tasks, shareable files. */
  project: withPortal(async (ctx, session) => {
    const project = await portal.findPortalProject(strapi, session, ctx.params.id);
    if (!project) return notFound(ctx);
    const tasks = (await portal.listVisibleTasks(strapi, session, project.id)).map((t) => portal.serializeTask(t, session));
    const files = await portal.listShareableFiles(strapi, session, project.id, tasks.map((t) => t.id));
    ctx.body = {
      data: {
        project: { ...project, progress: await portal.projectProgress(strapi, project.id) },
        milestones: tasks.filter((t) => t.type === 'milestone'),
        deliverables: tasks.filter((t) => t.type === 'deliverable'),
        tasks: tasks.filter((t) => t.type !== 'milestone' && t.type !== 'deliverable'),
        files,
      },
    };
  }),

  /** POST /portal/projects/:id/tasks/:taskId/approval { decision: approve | request_changes, comment } */
  approval: withPortal(async (ctx, session) => {
    const project = await portal.findPortalProject(strapi, session, ctx.params.id);
    if (!project) return notFound(ctx);
    const task = await portal.findVisibleTask(strapi, session, project.id, ctx.params.taskId);
    if (!task) return notFound(ctx);
    if (task.taskType !== 'deliverable') return ctx.badRequest('Only deliverables can be approved');
    if (task.clientApprovalStatus !== 'pending') {
      ctx.status = 409;
      ctx.body = { data: null, error: { status: 409, name: 'PortalError', message: 'This deliverable is not waiting for your approval.', details: { code: 'NOT_PENDING' } } };
      return;
    }
    const { decision } = body(ctx);
    const comment = text(body(ctx).comment, MAX_TEXT);
    if (!['approve', 'request_changes'].includes(decision)) return ctx.badRequest('decision must be approve or request_changes');
    if (decision === 'request_changes' && !comment) return ctx.badRequest('Tell the team what to change');

    const status = decision === 'approve' ? 'approved' : 'changes_requested';
    // TODO(W9): approvals/proofing will add versions and multiple reviewers on top of these fields.
    const updated = await strapi.entityService.update(TASK_UID, task.id, {
      data: {
        clientApprovalStatus: status,
        clientApprovalComment: comment || null,
        clientApprovalAt: new Date(),
        clientApprovalBy: session.contact.id,
      },
      fields: ['id', 'name', 'description', 'status', 'taskType', 'scheduledDate', 'startDate', 'completedAt', 'clientApprovalStatus', 'clientApprovalComment', 'clientApprovalAt', 'createdAt'],
    });

    const who = portal.contactName(session.contact);
    const verdict = decision === 'approve' ? 'approved' : 'requested changes on';
    await portal.logClientComment(strapi, {
      orgId: session.orgId,
      taskId: task.id,
      taskName: task.name,
      contact: session.contact,
      comment: `${verdict === 'approved' ? 'Approved' : 'Requested changes'} via the client portal${comment ? `: ${comment}` : '.'}`,
    });
    await portal.notifyProjectTeam(strapi, {
      orgId: session.orgId,
      projectId: project.id,
      taskId: task.id,
      title: `${who} ${verdict} "${task.name}"`,
      message: comment || `${who} ${verdict} this deliverable in the client portal.`,
    });
    ctx.body = { data: portal.serializeTask(updated, session) };
  }),

  /** POST /portal/projects/:id/requests { title, description } → a new task in the project for triage. */
  createRequest: withPortal(async (ctx, session) => {
    const project = await portal.findPortalProject(strapi, session, ctx.params.id);
    if (!project) return notFound(ctx);
    const title = text(body(ctx).title, MAX_TITLE);
    const description = text(body(ctx).description, MAX_TEXT);
    if (!title) return ctx.badRequest('Give your request a title');

    const who = portal.contactName(session.contact);
    // TODO(W1): drop the task into the project's intake/default list once workspaces/lists merge.
    const created = await strapi.entityService.create(TASK_UID, {
      data: {
        name: title,
        description: `${description}${description ? '\n\n' : ''}Raised by ${who} (${session.contact.email}) via the client portal.`,
        status: 'SCHEDULED',
        priority: 'medium',
        taskType: 'task',
        tags: ['client-request'],
        organization: session.orgId,
        projects: [project.id],
        clientVisible: true,
        clientRequestedBy: session.contact.id,
      },
      fields: ['id', 'name', 'description', 'status', 'taskType', 'scheduledDate', 'startDate', 'completedAt', 'clientApprovalStatus', 'clientApprovalComment', 'clientApprovalAt', 'createdAt'],
      populate: { clientRequestedBy: { fields: ['id'] } },
    });
    await portal.notifyProjectTeam(strapi, {
      orgId: session.orgId,
      projectId: project.id,
      taskId: created.id,
      title: `New client request: ${title}`,
      message: `${who} raised a request on ${project.name}.`,
    });
    ctx.status = 201;
    ctx.body = { data: portal.serializeTask(created, session) };
  }),
};
