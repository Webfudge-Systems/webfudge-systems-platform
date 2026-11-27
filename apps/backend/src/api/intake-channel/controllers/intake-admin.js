'use strict';

/**
 * W13 project intake settings (Fudge Work). Org admins and the project's manager only, because the
 * responses contain the channel secrets (form link / inbound address).
 */

const crypto = require('node:crypto');
const { isSaas } = require('../../../utils/platform');
const { isPmOrgAdminRole } = require('../../../utils/rbac');
const { loadProjectForAccess, relId, TASK_LIST_UID } = require('../../../utils/workspaces');
const { CHANNELS, channelAvailability } = require('../../../utils/intake/channels');
const { normalizeFields } = require('../../../utils/intake/forms');
const { CHANNEL_UID } = require('../../../utils/intake/create-task');

const newSecret = () => crypto.randomBytes(12).toString('hex');
const PRIORITIES = ['low', 'medium', 'high'];

function guard(ctx) {
  if (!isSaas()) return ctx.notFound() || true;
  if (!ctx.state.user) return ctx.unauthorized('Missing or invalid credentials') || true;
  if (!ctx.state.orgId) return ctx.forbidden('No active organization') || true;
  return null;
}

/** Project the caller may manage intake for, else sets the response and returns null. */
async function manageableProject(ctx, projectId) {
  const project = await loadProjectForAccess(strapi, ctx, projectId);
  if (!project) {
    ctx.notFound('Project not found');
    return null;
  }
  const isManager = relId(project.projectManager) === ctx.state.user.id;
  if (!isPmOrgAdminRole(ctx) && !isManager) {
    ctx.forbidden('Only org admins and the project manager can manage intake.');
    return null;
  }
  return project;
}

function sanitizeSettings(input = {}) {
  const s = {};
  if (input.intro != null) s.intro = String(input.intro).slice(0, 2000);
  if (input.successMessage != null) s.successMessage = String(input.successMessage).slice(0, 500);
  if (PRIORITIES.includes(input.priority)) s.priority = input.priority;
  if (Array.isArray(input.allowedSenderDomains)) {
    s.allowedSenderDomains = input.allowedSenderDomains
      .map((d) => String(d).trim().toLowerCase().replace(/^@/, ''))
      .filter((d) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d))
      .slice(0, 50);
  }
  return s;
}

function describe(row) {
  const domain = String(process.env.INTAKE_EMAIL_DOMAIN || '').trim().toLowerCase();
  return {
    id: row.id,
    channel: row.channel,
    name: row.name,
    enabled: row.enabled !== false,
    secret: row.secret,
    emailAddress: row.channel === 'email' && domain ? `task-${row.secret}@${domain}` : null,
    fields: row.channel === 'form' ? normalizeFields(row.fields) : null,
    settings: row.settings || {},
    taskListId: relId(row.taskList) || null,
    assigneeId: relId(row.assignee) || null,
    submissionCount: row.submissionCount || 0,
    lastSubmissionAt: row.lastSubmissionAt || null,
  };
}

async function validListId(project, listId) {
  if (!listId) return null;
  const list = await strapi.entityService.findOne(TASK_LIST_UID, Number(listId), { populate: { project: { fields: ['id'] } } });
  return list && relId(list.project) === project.id ? list.id : undefined;
}

function validAssignee(project, assigneeId) {
  if (assigneeId == null || assigneeId === '') return null;
  const ids = [relId(project.projectManager), ...(project.teamMembers || []).map(relId)].filter(Boolean);
  return ids.includes(Number(assigneeId)) ? Number(assigneeId) : undefined;
}

async function loadChannel(ctx) {
  const row = await strapi.entityService.findOne(CHANNEL_UID, Number(ctx.params.id), {
    populate: { organization: { fields: ['id'] }, project: { fields: ['id'] }, taskList: { fields: ['id'] }, assignee: { fields: ['id'] } },
  });
  if (!row || relId(row.organization) !== Number(ctx.state.orgId)) {
    ctx.notFound('Intake channel not found');
    return {};
  }
  const project = await manageableProject(ctx, relId(row.project));
  return project ? { row, project } : {};
}

async function applyInput(project, body, data) {
  if (body.name != null) data.name = String(body.name).trim().slice(0, 120) || data.name;
  if (body.enabled != null) data.enabled = Boolean(body.enabled);
  if (body.fields != null) data.fields = normalizeFields(body.fields);
  if (body.settings != null) data.settings = sanitizeSettings(body.settings);
  if (body.taskListId !== undefined) {
    const list = await validListId(project, body.taskListId);
    if (list === undefined) return 'That task list is not in this project.';
    data.taskList = list;
  }
  if (body.assigneeId !== undefined) {
    const a = validAssignee(project, body.assigneeId);
    if (a === undefined) return 'The assignee must be the project manager or a team member.';
    data.assignee = a;
  }
  return null;
}

module.exports = {
  async list(ctx) {
    if (guard(ctx)) return;
    const project = await manageableProject(ctx, ctx.params.projectId);
    if (!project) return;
    const [rows, lists] = await Promise.all([
      strapi.entityService.findMany(CHANNEL_UID, {
        filters: { project: project.id, organization: ctx.state.orgId },
        populate: { taskList: { fields: ['id'] }, assignee: { fields: ['id'] } },
        sort: { createdAt: 'asc' },
      }),
      strapi.entityService.findMany(TASK_LIST_UID, { filters: { project: project.id }, fields: ['id', 'name', 'isDefault'], sort: { sortOrder: 'asc' } }),
    ]);
    ctx.set('Cache-Control', 'no-store');
    ctx.body = {
      data: {
        channels: rows.map(describe),
        availability: Object.fromEntries(Object.values(CHANNELS).map((c) => [c.key, { label: c.label, ...channelAvailability(c.key) }])),
        taskLists: lists.map((l) => ({ id: l.id, name: l.name, isDefault: Boolean(l.isDefault) })),
      },
    };
  },

  async create(ctx) {
    if (guard(ctx)) return;
    const project = await manageableProject(ctx, ctx.params.projectId);
    if (!project) return;
    const body = ctx.request.body || {};
    const avail = channelAvailability(body.channel);
    if (!avail.available) return ctx.badRequest(avail.reason);

    const data = {
      channel: body.channel,
      name: body.channel === 'email' ? 'Email to task' : 'Request form',
      enabled: true,
      secret: newSecret(),
      settings: {},
      project: project.id,
      organization: ctx.state.orgId,
      createdByUser: ctx.state.user.id,
    };
    if (body.channel === 'form') data.fields = normalizeFields(body.fields);
    const err = await applyInput(project, body, data);
    if (err) return ctx.badRequest(err);
    if (!data.taskList) {
      const [def] = await strapi.entityService.findMany(TASK_LIST_UID, { filters: { project: project.id }, sort: [{ isDefault: 'desc' }, { sortOrder: 'asc' }], limit: 1 });
      data.taskList = def?.id || null;
    }
    const row = await strapi.entityService.create(CHANNEL_UID, { data, populate: { taskList: { fields: ['id'] }, assignee: { fields: ['id'] } } });
    ctx.status = 201;
    ctx.body = { data: describe(row) };
  },

  async update(ctx) {
    if (guard(ctx)) return;
    const { row, project } = await loadChannel(ctx);
    if (!row) return;
    const data = {};
    const err = await applyInput(project, ctx.request.body || {}, data);
    if (err) return ctx.badRequest(err);
    const updated = await strapi.entityService.update(CHANNEL_UID, row.id, { data, populate: { taskList: { fields: ['id'] }, assignee: { fields: ['id'] } } });
    ctx.body = { data: describe(updated) };
  },

  async rotate(ctx) {
    if (guard(ctx)) return;
    const { row } = await loadChannel(ctx);
    if (!row) return;
    const updated = await strapi.entityService.update(CHANNEL_UID, row.id, { data: { secret: newSecret() }, populate: { taskList: { fields: ['id'] }, assignee: { fields: ['id'] } } });
    ctx.body = { data: describe(updated) };
  },

  async remove(ctx) {
    if (guard(ctx)) return;
    const { row } = await loadChannel(ctx);
    if (!row) return;
    await strapi.entityService.delete(CHANNEL_UID, row.id);
    ctx.body = { data: { id: row.id } };
  },
};
