'use strict';

/**
 * Approvals & proofing (W9), client portal side. Portal session token only (see utils/client-portal).
 *   GET  /portal/projects/:id/tasks/:taskId/proofs
 *   POST /portal/projects/:id/tasks/:taskId/proofs/:versionId/comments   { body, x?, y?, timestamp? }
 * Approve / request changes stays on POST /portal/projects/:id/tasks/:taskId/approval (W10), which
 * also stamps the latest version.
 * The task must be client-visible in a project shared with the contact's client account, and the
 * version must belong to that task; anything else answers 404.
 */

const portal = require('../../../utils/client-portal');
const proofs = require('../../../utils/proofs');

const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};

function fail(ctx, e) {
  if (e instanceof portal.PortalError || e instanceof proofs.ProofError) {
    ctx.status = e.status;
    ctx.body = { data: null, error: { status: e.status, name: 'PortalError', message: e.message, details: { code: e.code || 'PROOF' } } };
    return;
  }
  throw e;
}

const notFound = (ctx) => fail(ctx, new portal.PortalError(404, 'NOT_FOUND', 'Not found'));

/** Resolves the session, project and task, or answers 401/403/404. */
async function scope(ctx) {
  const session = await portal.resolvePortal(strapi, ctx);
  ctx.set('Cache-Control', 'no-store');
  const project = await portal.findPortalProject(strapi, session, ctx.params.id);
  const task = project ? await portal.findVisibleTask(strapi, session, project.id, ctx.params.taskId) : null;
  return { session, project, task };
}

const viewerOf = (session) => ({ forClient: true, contactId: session.contact.id });

module.exports = {
  async list(ctx) {
    try {
      const { session, task } = await scope(ctx);
      if (!task) return notFound(ctx);
      ctx.body = {
        data: {
          task: portal.serializeTask(task, session),
          versions: await proofs.listTaskProofs(strapi, { orgId: session.orgId, taskId: task.id, viewer: viewerOf(session) }),
        },
      };
    } catch (e) {
      return fail(ctx, e);
    }
  },

  async addComment(ctx) {
    try {
      const { session, task } = await scope(ctx);
      if (!task) return notFound(ctx);
      const version = await proofs.findTaskVersion(strapi, { orgId: session.orgId, taskId: task.id, versionId: ctx.params.versionId });
      if (!version) return notFound(ctx);
      const input = body(ctx);
      const created = await proofs.addComment(strapi, {
        orgId: session.orgId,
        taskId: task.id,
        taskName: task.name,
        version,
        input: { body: input.body, x: input.x, y: input.y, timestamp: input.timestamp },
        contact: session.contact,
      });
      ctx.status = 201;
      ctx.body = { data: proofs.serializeComment(created, viewerOf(session)) };
    } catch (e) {
      return fail(ctx, e);
    }
  },
};
