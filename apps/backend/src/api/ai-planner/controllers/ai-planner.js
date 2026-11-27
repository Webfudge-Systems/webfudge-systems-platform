'use strict';

/**
 * W16 AI project planner.
 *
 *   POST /api/projects/ai-plan          JSON or multipart
 *     { brief?, document? (file: PDF / .docx / .txt, ≤ 10 MB), dealId?, startDate?, language? }
 *     → { data: { plan, source, language, model, creditsUsed, credits } }   (nothing is saved)
 *
 *   POST /api/projects/ai-plan/create   JSON
 *     { plan, project: { name, startDate, workspace?, clientAccount?, projectManager?, ... }, roleAssignments: { roleKey: userId } }
 *     → { data: project, meta: { tasksCreated, listsCreated, dependenciesCreated } }
 *
 * A won deal's plan is created through POST /api/deals/:id/delivery-project with { aiPlan } instead,
 * so the deal link, client account and draft invoices are handled in one place.
 */

const fs = require('fs');
const ai = require('../../../utils/ai');
const { generatePlan, createProjectFromPlan } = require('../../../utils/ai/work-planner');
const { requireModuleAccess, isPmOrgMemberRole } = require('../../../utils/rbac');
const { loadWorkspaceForAccess, ensureDefaultWorkspace } = require('../../../utils/workspaces');
const { orgIdFromRelation } = require('../../../utils/content-api-helpers');
const { logCrmActivity } = require('../../../utils/crm-activity-log');

const CLIENT_ACCOUNT_UID = 'api::client-account.client-account';

function canCreateProjects(ctx) {
  const denied = requireModuleAccess(ctx, 'pm', 'projects', 'write');
  if (denied) return false;
  if (isPmOrgMemberRole(ctx)) {
    ctx.forbidden('Members cannot create projects');
    return false;
  }
  return true;
}

function firstFile(files, ...names) {
  for (const n of names) {
    const f = files?.[n];
    if (f) return Array.isArray(f) ? f[0] : f;
  }
  return null;
}

module.exports = ({ strapi }) => ({
  async generate(ctx) {
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const body = ctx.request.body?.data && typeof ctx.request.body.data === 'object' ? ctx.request.body.data : ctx.request.body || {};
    const dealId = body.dealId != null && body.dealId !== '' ? body.dealId : null;
    // Deal handoff: the deal owner (or deals manager) may plan its delivery project. Otherwise the
    // same rule as creating a project in Work.
    if (!dealId && !canCreateProjects(ctx)) return ctx.body;

    const file = firstFile(ctx.request.files, 'document', 'file', 'sow');
    let document = null;
    try {
      if (file) {
        document = {
          buffer: await fs.promises.readFile(file.filepath || file.path),
          mimeType: String(file.mimetype || file.type || '').split(';')[0].trim().toLowerCase(),
          filename: file.originalFilename || file.name || '',
        };
      }
      const data = await generatePlan(strapi, ctx, {
        brief: body.brief,
        document,
        dealId,
        startDate: body.startDate,
        language: body.language,
      });
      ctx.body = { data };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },

  async create(ctx) {
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    if (!canCreateProjects(ctx)) return ctx.body;

    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const project = body.project && typeof body.project === 'object' ? { ...body.project } : {};
    if (!String(project.name || '').trim()) return ctx.badRequest('Project name is required');
    const startDate = String(project.startDate || new Date().toISOString()).slice(0, 10);
    if (Number.isNaN(Date.parse(startDate))) return ctx.badRequest('Start date is invalid');

    for (const k of ['id', 'documentId', 'tasks', 'taskLists', 'clientPortalEnabled', 'sourceDeal']) delete project[k];
    project.name = String(project.name).trim();
    project.organization = ctx.state.orgId;
    if (!project.status) project.status = 'PLANNING';
    if (project.projectManager == null || project.projectManager === '') project.projectManager = ctx.state.user.id;

    if (project.clientAccount != null && project.clientAccount !== '') {
      const id = Number(typeof project.clientAccount === 'object' ? project.clientAccount.id : project.clientAccount);
      const row = Number.isInteger(id) && id > 0 ? await strapi.entityService.findOne(CLIENT_ACCOUNT_UID, id, { populate: ['organization'] }) : null;
      if (!row || orgIdFromRelation(row.organization) !== ctx.state.orgId) return ctx.badRequest('Client account not found in this organization');
      project.clientAccount = id;
    } else {
      delete project.clientAccount;
    }

    // W1: same workspace rules as POST /projects
    if (project.workspace != null && project.workspace !== '') {
      const ws = await loadWorkspaceForAccess(strapi, ctx, project.workspace);
      if (!ws) return ctx.badRequest('Workspace not found');
      project.workspace = ws.id;
    } else {
      project.workspace = await ensureDefaultWorkspace(strapi, ctx.state.orgId);
    }

    try {
      const created = await createProjectFromPlan(strapi, {
        orgId: ctx.state.orgId,
        actorId: ctx.state.user.id,
        plan: body.plan,
        project,
        startDate,
        roleAssignments: body.roleAssignments && typeof body.roleAssignments === 'object' ? body.roleAssignments : {},
      });
      try {
        await logCrmActivity(strapi, {
          organizationId: ctx.state.orgId,
          actorUserId: ctx.state.user.id,
          action: 'create',
          subjectType: 'project',
          entity: created.entry,
          changedKeys: null,
        });
      } catch (_) {
        /* best-effort */
      }
      ctx.body = {
        data: created.entry,
        meta: { source: 'ai-plan', tasksCreated: created.taskCount, listsCreated: created.listCount, dependenciesCreated: created.dependencyCount },
      };
      return ctx.body;
    } catch (err) {
      return ai.sendAiError(ctx, err);
    }
  },
});
