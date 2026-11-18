'use strict';

/**
 * project controller
 * - Requires ctx.state.user + ctx.state.orgId (global jwt-auth).
 * - CRUD is scoped to organization (tenant isolation).
 */

const { createCoreController } = require('@strapi/strapi').factories;
const {
  orgIdFromRelation,
  readListQuery,
  createPopulateSanitizer,
  safeCount,
  resolveEntityPkForRouteParam,
} = require('../../../utils/content-api-helpers');
const { logCrmActivity, collectChangedKeys, actorDisplayName } = require('../../../utils/crm-activity-log');
const { emitUpdateNotifications, projectStakeholderIds } = require('../../../utils/notification-emitter');
const {
  requireModuleAccess,
  isPmOrgAdminRole,
  isPmOrgManagerRole,
  isPmOrgMemberRole,
  buildProjectListFiltersForUser,
  userCanAccessProjectRow,
  userCanViewProjectRow,
} = require('../../../utils/rbac');


const UID = 'api::project.project';
const { listTemplates, getTemplate, planTemplate } = require('../../../utils/project-templates');
const TASK_UID = 'api::task.task';
const CLIENT_ACCOUNT_UID = 'api::client-account.client-account';

async function recomputeFinancials(projectId) {
  const tasks = await strapi.entityService.findMany(TASK_UID, {
    filters: { timeProject: projectId },
    limit: 10000,
  });

  const totalLoggedHours = tasks.reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0);
  const billableHours = tasks
    .filter((t) => t.billable && !t.invoiced)
    .reduce((s, t) => s + (parseFloat(t.hoursLogged) || 0), 0);

  const project = await strapi.entityService.findOne(UID, projectId);
  const unbilledAmount = Math.round(billableHours * (project?.hourlyRate || 0));

  await strapi.entityService.update(UID, projectId, {
    data: {
      totalLoggedHours: Math.round(totalLoggedHours * 100) / 100,
      billableHours: Math.round(billableHours * 100) / 100,
      unbilledAmount,
    },
  });
}

const ALLOWED_POPULATE = new Set([
  'projectManager',
  'teamMembers',
  'tasks',
  'clientAccount',
  'organization',
  'sourceDeal',
]);

const sanitizePopulate = createPopulateSanitizer(ALLOWED_POPULATE, [
  'projectManager',
  'clientAccount',
  'organization',
  'sourceDeal',
]);

async function assertClientAccountInOrg(strapi, clientAccountId, orgId) {
  if (clientAccountId == null || clientAccountId === '') return null;
  const id =
    typeof clientAccountId === 'object'
      ? clientAccountId.id ?? clientAccountId.documentId
      : Number(clientAccountId);
  if (!id || Number.isNaN(id)) return 'Invalid client account';
  const row = await strapi.entityService.findOne(CLIENT_ACCOUNT_UID, id, {
    populate: ['organization'],
  });
  if (!row || orgIdFromRelation(row.organization) !== orgId) {
    return 'Client account not found in this organization';
  }
  return null;
}

module.exports = createCoreController(UID, ({ strapi }) => ({
  /** GET /projects/templates — built-in project templates (W4). */
  async templates(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'read');
    if (denied) return denied;
    return { data: listTemplates() };
  },

  /**
   * POST /projects/from-template — create a project and all its phases/tasks from a template (W4).
   * Body: { templateKey, project: { name, startDate, ...same fields as POST /projects }, roleAssignments: { role: userId } }
   * Phases become parent tasks, template tasks become their subtasks; dates are relative to startDate.
   */
  async createFromTemplate(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'write');
    if (denied) return denied;
    if (isPmOrgMemberRole(ctx)) return ctx.forbidden('Members cannot create projects');

    const body = ctx.request?.body?.data || ctx.request?.body || {};
    const template = getTemplate(body.templateKey);
    if (!template) return ctx.badRequest('Unknown project template');
    const project = body.project && typeof body.project === 'object' ? { ...body.project } : {};
    if (!String(project.name || '').trim()) return ctx.badRequest('Project name is required');
    const startDate = String(project.startDate || new Date().toISOString()).slice(0, 10);
    if (Number.isNaN(Date.parse(startDate))) return ctx.badRequest('Start date is invalid');

    delete project.id;
    delete project.documentId;
    delete project.tasks;
    project.name = String(project.name).trim();
    project.organization = ctx.state.orgId;
    if (project.projectManager == null && ctx.state.user?.id) project.projectManager = ctx.state.user.id;
    if (project.clientAccount != null && project.clientAccount !== '') {
      const clientErr = await assertClientAccountInOrg(strapi, project.clientAccount, ctx.state.orgId);
      if (clientErr) return ctx.badRequest(clientErr);
    }

    // Role → user. Only active members of this org can be assigned.
    const roleAssignments = body.roleAssignments && typeof body.roleAssignments === 'object' ? body.roleAssignments : {};
    const members = await strapi.entityService.findMany('api::organization-user.organization-user', {
      filters: { organization: ctx.state.orgId, isActive: true },
      populate: { user: { fields: ['id'] } },
      limit: 1000,
    });
    const memberIds = new Set(members.map((m) => m.user?.id).filter(Boolean).map(String));
    const pmId = typeof project.projectManager === 'object' ? project.projectManager?.id : project.projectManager;
    const assigneeFor = (role) => {
      const raw = role === 'projectManager' ? roleAssignments.projectManager ?? pmId : roleAssignments[role];
      const id = raw == null || raw === '' ? null : parseInt(String(raw), 10);
      return id != null && memberIds.has(String(id)) ? id : null;
    };

    const plan = planTemplate(template, startDate);
    project.startDate = new Date(`${startDate}T09:00:00.000Z`).toISOString();
    if (!project.endDate) project.endDate = plan.endDate;
    const assigned = new Set(template.roles.map(assigneeFor).filter(Boolean));
    const team = new Set([...(Array.isArray(project.teamMembers) ? project.teamMembers : []).map((x) => (typeof x === 'object' ? x.id : x)), ...assigned]);
    project.teamMembers = [...team].map(Number).filter((n) => memberIds.has(String(n)));

    const actorId = ctx.state.user.id;
    const created = await strapi.db.transaction(async () => {
      const entry = await strapi.entityService.create(UID, { data: project });
      let taskCount = 0;
      for (const phase of plan.phases) {
        const parent = await strapi.entityService.create('api::task.task', {
          data: {
            name: phase.name,
            status: 'SCHEDULED',
            priority: 'medium',
            taskType: 'task',
            startDate: phase.startDate,
            scheduledDate: phase.scheduledDate,
            projects: [entry.id],
            organization: ctx.state.orgId,
            assigner: actorId,
            assignee: assigneeFor('projectManager'),
            assignmentApprovalStatus: 'not_required',
          },
        });
        taskCount += 1;
        for (const t of phase.tasks) {
          await strapi.entityService.create('api::task.task', {
            data: {
              name: t.name,
              status: 'SCHEDULED',
              priority: t.taskType === 'milestone' ? 'high' : 'medium',
              taskType: t.taskType,
              startDate: t.startDate,
              scheduledDate: t.scheduledDate,
              parent: parent.id,
              projects: [entry.id],
              organization: ctx.state.orgId,
              assigner: actorId,
              assignee: assigneeFor(t.role),
              assignmentApprovalStatus: 'not_required',
              description: `Role: ${t.roleLabel}`,
            },
          });
          taskCount += 1;
        }
      }
      return { entry, taskCount };
    });

    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: actorId,
        action: 'create',
        subjectType: 'project',
        entity: created.entry,
        changedKeys: null,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: created.entry, meta: { template: template.key, tasksCreated: created.taskCount } };
  },

  /**
   * Org client accounts for PM project client picker (PM projects read; no CRM module required on client).
   */
  async clientOptions(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'read');
    if (denied) return denied;

    const rows = await strapi.entityService.findMany(CLIENT_ACCOUNT_UID, {
      filters: { organization: ctx.state.orgId },
      fields: ['companyName', 'status'],
      sort: { companyName: 'asc' },
      limit: 500,
    });

    const data = (rows || []).map((row) => ({
      id: row.id,
      companyName: row.companyName || '',
      status: row.status || null,
      label: row.companyName || `Account ${row.id}`,
    }));

    return { data };
  },

  async find(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'read');
    if (denied) return denied;

    const { query, page, pageSize, sort } = readListQuery(ctx, {
      maxPageSize: 500,
      defaultPageSize: 25,
      defaultSort: 'updatedAt:desc',
    });

    const baseFilters = buildProjectListFiltersForUser(ctx, ctx.state.orgId, ctx.state.user?.id);
    const filters = { ...baseFilters };
    const extra = query.filters;
    if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
      if (extra.clientAccount) filters.clientAccount = extra.clientAccount;
      if (extra.status) filters.status = extra.status;
      if (extra.sourceDeal) filters.sourceDeal = extra.sourceDeal;
    }

    const results = await strapi.entityService.findMany(UID, {
      filters,
      start: (page - 1) * pageSize,
      limit: pageSize,
      sort,
      populate: sanitizePopulate(query.populate),
    });

    const total = await safeCount(strapi, UID, filters, results.length);
    const pageCount = Math.ceil(Math.max(total, 1) / pageSize);
    return { data: results, meta: { pagination: { page, pageSize, pageCount, total } } };
  },

  async findOne(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'read');
    if (denied) return denied;

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();

    const sanitized = sanitizePopulate(ctx.query?.populate);
    const populate = [...new Set([...(Array.isArray(sanitized) ? sanitized : []), 'organization'])];
    const entry = await strapi.entityService.findOne(UID, pk, {
      populate,
    });
    if (!entry) return ctx.notFound();
    if (orgIdFromRelation(entry.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    if (!isPmOrgAdminRole(ctx) && ctx.state.user?.id) {
      const gate = await strapi.entityService.findOne(UID, pk, {
        populate: ['teamMembers', 'projectManager'],
        fields: ['isPrivate'],
      });
      if (!userCanViewProjectRow(ctx, gate, ctx.state.user.id)) {
        return ctx.forbidden('Access denied');
      }
    }
    return { data: entry };
  },

  async create(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'write');
    if (denied) return denied;
    if (isPmOrgMemberRole(ctx)) {
      return ctx.forbidden('Members cannot create projects');
    }

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};

    data.organization = ctx.state.orgId;
    if (data.projectManager == null && ctx.state.user?.id) {
      data.projectManager = ctx.state.user.id;
    }

    delete data.id;
    delete data.documentId;

    if (data.clientAccount != null && data.clientAccount !== '') {
      const clientErr = await assertClientAccountInOrg(strapi, data.clientAccount, ctx.state.orgId);
      if (clientErr) return ctx.badRequest(clientErr);
    }

    const entry = await strapi.entityService.create(UID, { data });
    try {
      const lookupKey = entry?.id ?? entry?.documentId;
      const forLog =
        lookupKey != null
          ? await strapi.entityService.findOne(UID, lookupKey, {
              populate: ['projectManager', 'clientAccount', 'teamMembers'],
            })
          : entry;
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'create',
        subjectType: 'project',
        entity: forLog,
        changedKeys: null,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: entry };
  },

  async update(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'write');
    if (denied) return denied;

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();

    const existing = await strapi.entityService.findOne(UID, pk, {
      populate: ['organization', 'projectManager', 'clientAccount', 'teamMembers'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    if (isPmOrgMemberRole(ctx)) {
      return ctx.forbidden('Members cannot edit project settings');
    }
    if (
      isPmOrgManagerRole(ctx) &&
      !isPmOrgAdminRole(ctx) &&
      ctx.state.user?.id &&
      !userCanAccessProjectRow(existing, ctx.state.user.id)
    ) {
      return ctx.forbidden('You can only edit projects you are assigned to manage');
    }

    const body = ctx.request?.body || {};
    const payload = body.data || body;
    const data = typeof payload === 'object' ? { ...payload } : {};
    delete data.organization;

    if (Object.prototype.hasOwnProperty.call(data, 'clientAccount') && data.clientAccount !== '') {
      const clientErr = await assertClientAccountInOrg(strapi, data.clientAccount, ctx.state.orgId);
      if (clientErr) return ctx.badRequest(clientErr);
    }

    await strapi.entityService.update(UID, pk, { data });
    const changedKeys = collectChangedKeys(data);

    // Reload full row for response + timeline — Strapi 5 update() may omit numeric `id` on the
    // returned entry, which caused logCrmActivity to skip so name edits never appeared.
    const forLog = await strapi.entityService.findOne(UID, pk, {
      populate: ['projectManager', 'clientAccount', 'teamMembers'],
    });

    try {
      const actorName = await actorDisplayName(strapi, ctx.state.user?.id);
      await emitUpdateNotifications(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        actorName,
        subjectType: 'project',
        subjectId: pk,
        entityName: (forLog?.name || 'Project').trim() || 'Project',
        changedKeys,
        stakeholderIds: projectStakeholderIds(existing),
        previousEntity: existing,
        patch: data,
      });
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'update',
        subjectType: 'project',
        entity: forLog,
        subjectId: pk,
        changedKeys,
        previousEntity: existing,
        patch: data,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: forLog };
  },

  async delete(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials');
    if (!ctx.state.orgId) return ctx.forbidden('No active organization');
    const denied = requireModuleAccess(ctx, 'pm', 'projects', 'manage');
    if (denied) return denied;

    const pk = await resolveEntityPkForRouteParam(strapi, UID, ctx.params.id);
    if (pk == null) return ctx.notFound();

    const existing = await strapi.entityService.findOne(UID, pk, {
      populate: ['organization'],
    });
    if (!existing) return ctx.notFound();
    if (orgIdFromRelation(existing.organization) !== ctx.state.orgId) {
      return ctx.forbidden('Access denied');
    }
    if (
      isPmOrgManagerRole(ctx) &&
      !isPmOrgAdminRole(ctx) &&
      ctx.state.user?.id &&
      !userCanAccessProjectRow(existing, ctx.state.user.id)
    ) {
      return ctx.forbidden('You can only delete projects you are assigned to manage');
    }

    const entry = await strapi.entityService.delete(UID, pk);
    try {
      await logCrmActivity(strapi, {
        organizationId: ctx.state.orgId,
        actorUserId: ctx.state.user?.id,
        action: 'delete',
        subjectType: 'project',
        entity: existing,
        changedKeys: null,
      });
    } catch (_) {
      /* best-effort */
    }
    return { data: entry };
  },
}));

module.exports.recomputeFinancials = recomputeFinancials;
