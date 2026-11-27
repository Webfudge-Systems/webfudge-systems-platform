'use strict';

/**
 * Scope-creep watcher (ticket W19, SaaS only, plan feature pm.scope_watch).
 *
 *   GET  /scope-watch/projects/:id          → SOW source, checks (with change-order status), unchecked count
 *   PUT  /scope-watch/projects/:id/sow      { sowText?, sowAttachmentId? } → set the SOW (project editors)
 *   POST /scope-watch/projects/:id/check    { taskId?, force?, language? } → Fudge AI checks client requests
 *   POST /scope-watch/checks/:checkId/dismiss → hide a flag (project editors)
 *   GET  /scope-watch/portfolio             → open out-of-scope flags per visible project
 *
 * Change orders are AI actions (work.project.send_change_order, outbound): approve / reject them
 * with POST /api/ai/actions/:id/approve|reject (the AI approval queue).
 */

const { isSaas } = require('../../../utils/platform');
const { requireFeature } = require('../../../utils/saas-plans');
const { requireModuleAccess } = require('../../../utils/rbac');
const { loadProjectForAccess, buildProjectVisibilityFilters } = require('../../../utils/workspaces');
const ai = require('../../../utils/ai');
const { actorFromCtx, ACTION_UID, fromDb, POPULATE } = require('../../../utils/ai/actions');
const scope = require('../../../utils/ai/work-scope');

const PROJECT_UID = 'api::project.project';
const FEATURE = 'pm.scope_watch';
const MAX_SOW_TEXT = 100000;

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const body = (ctx) => ctx.request?.body?.data || ctx.request?.body || {};

async function gate(ctx) {
  if (!isSaas()) {
    ctx.notFound('Not available');
    return false;
  }
  if (!ctx.state.user) {
    ctx.unauthorized('Missing or invalid credentials');
    return false;
  }
  if (!ctx.state.orgId) {
    ctx.forbidden('No active organization');
    return false;
  }
  if (requireModuleAccess(ctx, 'pm', 'projects', 'read')) return false;
  return requireFeature(ctx, strapi, FEATURE);
}

const loadProject = (ctx) => loadProjectForAccess(strapi, ctx, parseInt(String(ctx.params.id), 10));

function serializeAction(a) {
  if (!a) return null;
  return {
    id: a.id,
    status: a.status,
    to: a.input?.to || null,
    subject: a.input?.subject || null,
    body: a.input?.body || null,
    title: a.input?.title || null,
    estimateHours: a.input?.estimateHours ?? null,
    delivered: a.result?.delivered ?? null,
    decidedBy: a.decidedBy ? { id: a.decidedBy.id, name: a.decidedBy.username || a.decidedBy.email } : null,
    decidedAt: a.decidedAt || null,
    reason: a.status === 'rejected' ? a.error || null : null,
  };
}

function serializeCheck(c, action) {
  return {
    id: c.id,
    sourceType: c.sourceType,
    sourceKey: c.sourceKey,
    task: c.task ? { id: c.task.id, name: c.task.name } : null,
    requestedBy: c.requestedBy ? { id: c.requestedBy.id, name: [c.requestedBy.firstName, c.requestedBy.lastName].filter(Boolean).join(' ') || c.requestedBy.email } : null,
    title: c.requestTitle,
    text: c.requestText,
    verdict: c.verdict,
    confidence: c.confidence,
    reason: c.reason,
    sowReference: c.sowReference,
    estimateHours: c.estimateHours == null ? null : Number(c.estimateHours),
    dismissed: Boolean(c.dismissed),
    checkedAt: c.createdAt,
    changeOrder: serializeAction(action),
  };
}

async function actionsById(orgId, ids) {
  const list = ids.filter(Boolean);
  if (!list.length) return new Map();
  const rows = await strapi.entityService.findMany(ACTION_UID, { filters: { organization: orgId, id: { $in: list } }, populate: POPULATE, limit: list.length });
  return new Map(rows.map((r) => [r.id, fromDb(r)]));
}

async function sowInfo(orgId, projectId) {
  const row = await scope.getScopeRow(strapi, orgId, projectId);
  if (!row) return { configured: false, source: null };
  let file = null;
  if (row.sowAttachmentId) {
    const att = await scope.projectAttachment(strapi, orgId, projectId, row.sowAttachmentId);
    file = att ? { attachmentId: att.id, name: att.fileName || att.file?.name || 'SOW', mime: att.file?.mime || null, missing: false } : { attachmentId: row.sowAttachmentId, name: row.sowFileName, missing: true };
  }
  const hasText = Boolean(row.sowText && row.sowText.trim());
  return {
    configured: hasText || Boolean(file && !file.missing),
    source: hasText ? 'text' : file ? 'file' : null,
    text: row.sowText || '',
    file,
    updatedAt: row.sowUpdatedAt || null,
    lastCheckedAt: row.lastCheckedAt || null,
  };
}

module.exports = {
  async project(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const project = await loadProject(ctx);
    if (!project) return ctx.notFound('Project not found');
    const orgId = ctx.state.orgId;
    const checks = await strapi.entityService.findMany(scope.CHECK_UID, {
      filters: { organization: orgId, project: project.id },
      populate: { task: { fields: ['id', 'name'] }, requestedBy: { fields: ['id', 'firstName', 'lastName', 'email'] } },
      sort: { createdAt: 'desc' },
      limit: 200,
    });
    const actions = await actionsById(orgId, checks.map((c) => c.aiActionId));
    let unchecked = 0;
    try {
      unchecked = (await scope.collectRequests(strapi, orgId, project.id)).length;
    } catch {
      unchecked = 0;
    }
    const canEdit = await scope.canEditProject(strapi, actorFromCtx(ctx), project.id);
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      data: {
        sow: await sowInfo(orgId, project.id),
        checks: checks.map((c) => serializeCheck(c, actions.get(c.aiActionId))),
        unchecked,
      },
      meta: { canEdit, aiEnabled: ai.aiEnabled() },
    };
    return ctx.body;
  },

  async setSow(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const project = await loadProject(ctx);
    if (!project) return ctx.notFound('Project not found');
    const orgId = ctx.state.orgId;
    if (!(await scope.canEditProject(strapi, actorFromCtx(ctx), project.id))) return ctx.forbidden('Only people who can edit this project can change its SOW');
    const b = body(ctx);
    const data = {};
    if (b.sowText !== undefined) {
      const text = String(b.sowText || '');
      if (text.length > MAX_SOW_TEXT) return ctx.badRequest(`Keep the SOW under ${MAX_SOW_TEXT.toLocaleString('en-IN')} characters, or attach it as a PDF`);
      data.sowText = text.trim() || null;
    }
    if (b.sowAttachmentId !== undefined) {
      if (b.sowAttachmentId === null || b.sowAttachmentId === '') {
        data.sowAttachmentId = null;
        data.sowFileName = null;
      } else {
        const att = await scope.projectAttachment(strapi, orgId, project.id, b.sowAttachmentId);
        if (!att) return ctx.badRequest('Pick a file attached to this project');
        data.sowAttachmentId = att.id;
        data.sowFileName = att.fileName || att.file?.name || null;
      }
    }
    if (!Object.keys(data).length) return ctx.badRequest('Send sowText or sowAttachmentId');
    data.sowUpdatedAt = new Date();
    data.sowUpdatedBy = ctx.state.user.id;
    const existing = await scope.getScopeRow(strapi, orgId, project.id);
    if (existing) await strapi.entityService.update(scope.SCOPE_UID, existing.id, { data });
    else await strapi.entityService.create(scope.SCOPE_UID, { data: { organization: orgId, project: project.id, ...data } });
    ctx.body = { data: { sow: await sowInfo(orgId, project.id) } };
    return ctx.body;
  },

  async check(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const project = await loadProject(ctx);
    if (!project) return ctx.notFound('Project not found');
    const b = body(ctx);
    try {
      const out = await scope.checkProjectScope(strapi, ctx, project.id, { taskId: b.taskId ? parseInt(b.taskId, 10) : undefined, force: Boolean(b.force), language: b.language });
      const ids = out.checked.map((c) => c.aiActionId);
      const actions = await actionsById(ctx.state.orgId, ids);
      const full = out.checked.length
        ? await strapi.entityService.findMany(scope.CHECK_UID, {
            filters: { id: { $in: out.checked.map((c) => c.id) } },
            populate: { task: { fields: ['id', 'name'] }, requestedBy: { fields: ['id', 'firstName', 'lastName', 'email'] } },
            sort: { createdAt: 'desc' },
          })
        : [];
      ctx.body = {
        data: {
          checked: full.map((c) => serializeCheck(c, actions.get(c.aiActionId))),
          outOfScope: full.filter((c) => c.verdict === 'out_of_scope').length,
          drafted: out.drafted,
          creditsUsed: out.creditsUsed,
          message: out.message || null,
          credits: await ai.creditStatus(strapi, ctx.state.orgId),
        },
      };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },

  async dismiss(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const id = parseInt(String(ctx.params.checkId), 10);
    const row = Number.isNaN(id) ? null : await strapi.entityService.findOne(scope.CHECK_UID, id, { populate: { organization: { fields: ['id'] }, project: { fields: ['id'] } } });
    if (!row || String(relId(row.organization)) !== String(ctx.state.orgId)) return ctx.notFound('Not found');
    const project = await loadProjectForAccess(strapi, ctx, relId(row.project));
    if (!project) return ctx.notFound('Not found');
    if (!(await scope.canEditProject(strapi, actorFromCtx(ctx), project.id))) return ctx.forbidden('Only people who can edit this project can dismiss flags');
    const dismissed = body(ctx).dismissed !== false;
    await strapi.entityService.update(scope.CHECK_UID, id, { data: { dismissed } });
    ctx.body = { data: { id, dismissed } };
    return ctx.body;
  },

  async portfolio(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const filters = await buildProjectVisibilityFilters(strapi, ctx, ctx.state.orgId, ctx.state.user.id);
    const projects = await strapi.entityService.findMany(PROJECT_UID, { filters, fields: ['id', 'name', 'slug'], limit: 1000 });
    const ids = projects.map((p) => p.id);
    if (!ids.length) {
      ctx.body = { data: { projects: [], summary: { flagged: 0, pendingChangeOrders: 0 } } };
      return ctx.body;
    }
    const checks = await strapi.entityService.findMany(scope.CHECK_UID, {
      filters: { organization: ctx.state.orgId, project: { id: { $in: ids } }, verdict: 'out_of_scope', dismissed: { $ne: true } },
      fields: ['id', 'aiActionId', 'estimateHours'],
      populate: { project: { fields: ['id'] } },
      limit: 5000,
    });
    const actions = await actionsById(ctx.state.orgId, checks.map((c) => c.aiActionId));
    const byProject = new Map();
    for (const c of checks) {
      const pid = relId(c.project);
      const b = byProject.get(pid) || { flagged: 0, pending: 0, hours: 0 };
      const status = actions.get(c.aiActionId)?.status;
      if (status === 'rejected') continue; // the team decided it is fine
      b.flagged += 1;
      if (status === 'pending_approval') b.pending += 1;
      b.hours += Number(c.estimateHours) || 0;
      byProject.set(pid, b);
    }
    const rows = projects
      .filter((p) => byProject.has(p.id))
      .map((p) => ({ id: p.id, slug: p.slug || null, name: p.name, outOfScope: byProject.get(p.id).flagged, pendingChangeOrders: byProject.get(p.id).pending, estimateHours: Math.round(byProject.get(p.id).hours * 10) / 10 }))
      .sort((a, b) => b.pendingChangeOrders - a.pendingChangeOrders || b.outOfScope - a.outOfScope);
    ctx.set('Cache-Control', 'no-store');
    ctx.body = { data: { projects: rows, summary: { flagged: rows.reduce((a, r) => a + r.outOfScope, 0), pendingChangeOrders: rows.reduce((a, r) => a + r.pendingChangeOrders, 0) } } };
    return ctx.body;
  },
};
