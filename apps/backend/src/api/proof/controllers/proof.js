'use strict';

/**
 * Approvals & proofing (W9), team side in Work. Normal user JWT + active organization.
 *   GET  /proofs/tasks/:taskId                 versions (newest first) with their comments
 *   POST /proofs/tasks/:taskId/versions        { fileId | attachmentId, note? }   PM tasks write
 *   POST /proofs/versions/:id/comments         { body, x?, y?, timestamp?, internal? }
 *   POST /proofs/versions/:id/decision         { decision: approve | request_changes, comment? }   PM tasks write
 *   PUT  /proofs/comments/:id                  { resolved }   PM tasks write
 */

const proofs = require('../../../utils/proofs');
const { canAccess, requireModuleAccess } = require('../../../utils/rbac');

const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};

/** Returns a response body when the request must stop. */
function guard(ctx, access = 'read') {
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return ctx.body || { error: 'unauthorized' };
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return ctx.body || { error: 'forbidden' };
  }
  return requireModuleAccess(ctx, 'pm', 'tasks', access) || null;
}

function fail(ctx, e) {
  if (e instanceof proofs.ProofError) {
    ctx.status = e.status;
    ctx.body = { data: null, error: { status: e.status, name: 'ProofError', message: e.message } };
    return;
  }
  throw e;
}

const viewerOf = (ctx) => ({ userId: ctx.state.user.id });

/** Loads the version and checks the caller may view its task. */
async function versionForTeam(ctx) {
  const version = await proofs.loadVersion(strapi, ctx.state.orgId, ctx.params.id);
  if (!version) return {};
  const task = await proofs.loadTaskForTeam(strapi, ctx, version.task?.id);
  return task ? { version, task } : {};
}

module.exports = {
  async list(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const task = await proofs.loadTaskForTeam(strapi, ctx, ctx.params.taskId);
    if (!task) return ctx.notFound('Task not found');
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      data: {
        taskId: task.id,
        taskType: task.taskType || 'task',
        clientVisible: task.clientVisible === true,
        clientApprovalStatus: task.clientApprovalStatus || 'none',
        canEdit: canAccess(ctx, 'pm', 'tasks', 'write'),
        versions: await proofs.listTaskProofs(strapi, { orgId: ctx.state.orgId, taskId: task.id, viewer: viewerOf(ctx) }),
      },
    };
  },

  async createVersion(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const task = await proofs.loadTaskForTeam(strapi, ctx, ctx.params.taskId);
    if (!task) return ctx.notFound('Task not found');
    const input = body(ctx);
    try {
      const created = await proofs.createVersion(strapi, {
        orgId: ctx.state.orgId,
        task,
        userId: ctx.state.user.id,
        fileId: input.fileId,
        attachmentId: input.attachmentId,
        note: input.note,
      });
      ctx.status = 201;
      ctx.body = { data: { id: created.id, version: created.version } };
    } catch (e) {
      return fail(ctx, e);
    }
  },

  async addComment(ctx) {
    const denied = guard(ctx);
    if (denied) return denied;
    const { version, task } = await versionForTeam(ctx);
    if (!version) return ctx.notFound('Version not found');
    try {
      const created = await proofs.addComment(strapi, {
        orgId: ctx.state.orgId,
        taskId: task.id,
        taskName: task.name,
        version,
        input: body(ctx),
        userId: ctx.state.user.id,
      });
      ctx.status = 201;
      ctx.body = { data: proofs.serializeComment(created, viewerOf(ctx)) };
    } catch (e) {
      return fail(ctx, e);
    }
  },

  async decide(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const { version, task } = await versionForTeam(ctx);
    if (!version) return ctx.notFound('Version not found');
    const input = body(ctx);
    try {
      const status = await proofs.decideVersion(strapi, {
        orgId: ctx.state.orgId,
        taskId: task.id,
        taskName: task.name,
        version,
        decision: input.decision,
        comment: input.comment,
        userId: ctx.state.user.id,
      });
      ctx.body = { data: { id: version.id, status } };
    } catch (e) {
      return fail(ctx, e);
    }
  },

  async updateComment(ctx) {
    const denied = guard(ctx, 'write');
    if (denied) return denied;
    const id = proofs.toId(ctx.params.id);
    const row = id
      ? await strapi.entityService.findOne(proofs.COMMENT_UID, id, {
          fields: ['id'],
          populate: { organization: { fields: ['id'] }, task: { fields: ['id'] } },
        })
      : null;
    if (!row || Number(row.organization?.id) !== Number(ctx.state.orgId)) return ctx.notFound('Comment not found');
    const task = await proofs.loadTaskForTeam(strapi, ctx, row.task?.id);
    if (!task) return ctx.notFound('Comment not found');
    const resolved = body(ctx).resolved === true;
    await strapi.entityService.update(proofs.COMMENT_UID, row.id, {
      data: { resolved, resolvedAt: resolved ? new Date() : null },
    });
    ctx.body = { data: { id: row.id, resolved } };
  },
};
