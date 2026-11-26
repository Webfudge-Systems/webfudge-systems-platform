'use strict';

/**
 * W17 Status Reporter (SaaS, Fudge Work). See utils/status-reports for the flow.
 *
 *   GET  /status-reports?projectId=&status=&limit=   reports for projects the caller can see
 *   GET  /status-reports/channels                     delivery channels and whether they work yet
 *   POST /status-reports/generate { projectId, language? }   write (or rewrite) this week's draft now
 *   GET  /status-reports/:id
 *   PUT  /status-reports/:id { client?: {subject, body, recipients, channel}, internal?: {...} }
 *   POST /status-reports/:id/send { audience, channel?, subject?, body?, recipients? }   one-click approve + send
 *   POST /status-reports/:id/discard { audience? }
 *
 * Gate: signed-in org member, AI_ENABLED on SaaS, and the Work plan feature pm.ai_teammates.
 */

const { createCoreController } = require('@strapi/strapi').factories;
const ai = require('../../../utils/ai');
const { requireFeature } = require('../../../utils/saas-plans');
const { buildProjectVisibilityFilters, loadProjectForAccess } = require('../../../utils/workspaces');
const { getActionRunner, actorFromCtx } = require('../../../utils/ai/actions');
const { canSendForProject } = require('../../../utils/status-reports/actions');
const { listChannels, getChannel } = require('../../../utils/status-reports/channels');
const sr = require('../../../utils/status-reports');

const UID = sr.REPORT_UID;
const POPULATE = {
  organization: { fields: ['id'] },
  project: { fields: ['id', 'name'], populate: { clientAccount: { fields: ['id', 'companyName'] } } },
  generatedBy: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
};
const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const personName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || u.email : null);

function fail(ctx, status, code, message) {
  ctx.status = status;
  ctx.body = { data: null, error: { status, name: 'StatusReportError', message, details: { code } } };
  return ctx.body;
}

function handle(ctx, err) {
  if (err instanceof sr.ReportError || err?.name === 'ChannelError' || (err?.code && err?.status && !String(err.code).startsWith('AI_'))) {
    return fail(ctx, err.status || 400, err.code, err.message);
  }
  return ai.sendAiError(ctx, err);
}

async function invalidate(orgId) {
  try {
    await require('../../../utils/cache').invalidateOrg(orgId);
  } catch (_) {
    /* cache is optional */
  }
}

/** AI on + plan includes the Status Reporter. */
async function gate(ctx) {
  if (!ai.requireAiEnabled(ctx)) return false;
  return requireFeature(ctx, strapi, sr.PLAN_FEATURE);
}

function serialize(report, states, canSend = false) {
  const versions = {};
  for (const a of sr.AUDIENCES) {
    const v = report.versions?.[a];
    if (!v) continue;
    const action = states.get(Number(v.actionId));
    versions[a] = {
      subject: v.subject,
      body: v.body,
      recipients: v.recipients || [],
      channel: v.channel || 'email',
      state: sr.versionState(v, action),
      actionId: v.actionId || null,
      sentAt: v.sentAt || action?.executedAt || null,
      delivered: v.delivered ?? action?.result?.delivered ?? null,
      deliveryNote: v.deliveryNote || action?.result?.note || null,
      error: action?.status === 'failed' ? action.error : null,
    };
  }
  return {
    id: report.id,
    project: report.project ? { id: report.project.id, name: report.project.name, client: report.project.clientAccount?.companyName || null } : null,
    weekKey: report.weekKey,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd,
    status: sr.reportStatus(versions),
    source: report.source,
    language: report.language,
    health: report.health,
    content: report.aiContent,
    activity: report.activity?.totals || null,
    versions,
    model: report.model,
    creditsUsed: report.creditsUsed || 0,
    generatedAt: report.generatedAt,
    generatedBy: report.generatedBy ? { id: report.generatedBy.id, name: personName(report.generatedBy) } : null,
    canSend,
  };
}

/** The report in the caller's org on a project they can see, else null. */
async function loadReport(ctx, id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) return null;
  const report = await strapi.entityService.findOne(UID, n, { populate: POPULATE });
  if (!report || String(relId(report.organization)) !== String(ctx.state.orgId)) return null;
  if (!report.project || !(await loadProjectForAccess(strapi, ctx, report.project.id))) return null;
  return report;
}

async function respondOne(ctx, report) {
  const fresh = await strapi.entityService.findOne(UID, report.id, { populate: POPULATE });
  const states = await sr.actionStates(strapi, [fresh]);
  const canSend = await canSendForProject(strapi, actorFromCtx(ctx), fresh.project.id);
  ctx.body = { data: serialize(fresh, states, canSend) };
  return ctx.body;
}

module.exports = createCoreController(UID, () => ({
  async find(ctx) {
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const orgId = ctx.state.orgId;
    const visible = await buildProjectVisibilityFilters(strapi, ctx, orgId, ctx.state.user.id);
    const projectFilter = { ...visible };
    if (ctx.query.projectId) projectFilter.id = Number(ctx.query.projectId);
    const filters = { organization: { id: orgId }, project: projectFilter };
    if (ctx.query.weekKey) filters.weekKey = String(ctx.query.weekKey);
    const limit = Math.min(Math.max(Number(ctx.query.limit) || 50, 1), 200);
    const rows = await strapi.entityService.findMany(UID, { filters, populate: POPULATE, sort: { periodStart: 'desc' }, limit });
    const states = await sr.actionStates(strapi, rows);
    let data = rows.map((r) => serialize(r, states));
    if (ctx.query.status) data = data.filter((r) => r.status === String(ctx.query.status));
    ctx.body = { data, meta: { weekKey: sr.reportPeriod().weekKey, channels: listChannels() } };
    return ctx.body;
  },

  async channels(ctx) {
    if (!ctx.state.user) return ctx.unauthorized('Sign in first.');
    ctx.body = { data: listChannels() };
    return ctx.body;
  },

  async findOne(ctx) {
    if (!ai.requireAiEnabled(ctx)) return ctx.body;
    const report = await loadReport(ctx, ctx.params.id);
    if (!report) return ctx.notFound('Status report not found.');
    return respondOne(ctx, report);
  },

  async generate(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const { projectId, language } = ctx.request.body || {};
    const actor = actorFromCtx(ctx);
    try {
      const project = await loadProjectForAccess(strapi, ctx, projectId);
      if (!project) return fail(ctx, 404, 'PROJECT_NOT_FOUND', 'Project not found.');
      if (!(await canSendForProject(strapi, actor, project.id))) {
        return fail(ctx, 403, 'FORBIDDEN', "Only the project's manager, PM managers or admins can write its weekly update.");
      }
      const report = await sr.generateReport(strapi, { orgId: ctx.state.orgId, projectId: project.id, userId: ctx.state.user.id, actor, source: 'manual', language });
      await invalidate(ctx.state.orgId);
      return respondOne(ctx, report);
    } catch (err) {
      return handle(ctx, err);
    }
  },

  async update(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    try {
      let report = await loadReport(ctx, ctx.params.id);
      if (!report) return ctx.notFound('Status report not found.');
      if (!(await canSendForProject(strapi, actorFromCtx(ctx), report.project.id))) return fail(ctx, 403, 'FORBIDDEN', 'You cannot edit this update.');
      const body = ctx.request.body || {};
      for (const a of sr.AUDIENCES) {
        if (body[a] && typeof body[a] === 'object') report = await sr.applyVersionEdits(strapi, report, report.project, a, body[a]);
      }
      await invalidate(ctx.state.orgId);
      return respondOne(ctx, report);
    } catch (err) {
      return handle(ctx, err);
    }
  },

  /** One click: save any last edits, then approve the queued action as the caller (which sends it). */
  async send(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const body = ctx.request.body || {};
    const audience = String(body.audience || '');
    const actor = actorFromCtx(ctx);
    const orgId = ctx.state.orgId;
    try {
      if (!sr.AUDIENCES.includes(audience)) return fail(ctx, 400, 'BAD_AUDIENCE', 'audience must be "client" or "internal".');
      const channel = getChannel(body.channel || 'email');
      if (!channel.available) return fail(ctx, 400, 'CHANNEL_UNAVAILABLE', channel.reason);

      let report = await loadReport(ctx, ctx.params.id);
      if (!report) return ctx.notFound('Status report not found.');
      if (!(await canSendForProject(strapi, actor, report.project.id))) return fail(ctx, 403, 'FORBIDDEN', 'You cannot send this update.');
      report = await sr.applyVersionEdits(strapi, report, report.project, audience, {
        subject: body.subject,
        body: body.body,
        recipients: body.recipients,
        channel: channel.key,
      });

      const v = report.versions?.[audience];
      if (!v?.recipients?.length) return fail(ctx, 400, 'NO_RECIPIENTS', `Add at least one recipient for the ${audience} update.`);

      // A version without a live queued action (no recipients at draft time, or discarded / failed before) gets a fresh one.
      const states = await sr.actionStates(strapi, [report]);
      let actionId = v.actionId;
      if (!actionId || states.get(Number(actionId))?.status !== 'pending_approval') {
        const project = await sr.loadProject(strapi, orgId, report.project.id);
        actionId = await sr.proposeVersion(strapi, { report, project, audience, version: { ...v, state: 'draft' }, actor });
        const versions = { ...report.versions, [audience]: { ...v, actionId, state: 'draft' } };
        report = await strapi.entityService.update(UID, report.id, { data: { versions } });
      }
      try {
        await getActionRunner(strapi).approve(actionId, { actor, orgId });
      } catch (e) {
        // The action row is now `failed` with the reason; the next send queues a fresh one.
        if (!e?.code) return fail(ctx, 502, 'SEND_FAILED', e?.message || 'Sending failed.');
        throw e;
      }
      await invalidate(orgId);
      return respondOne(ctx, report);
    } catch (err) {
      await invalidate(orgId);
      return handle(ctx, err);
    }
  },

  async discard(ctx) {
    if (!(await gate(ctx))) return ctx.body;
    const actor = actorFromCtx(ctx);
    const orgId = ctx.state.orgId;
    try {
      const report = await loadReport(ctx, ctx.params.id);
      if (!report) return ctx.notFound('Status report not found.');
      if (!(await canSendForProject(strapi, actor, report.project.id))) return fail(ctx, 403, 'FORBIDDEN', 'You cannot discard this update.');
      const audiences = ctx.request.body?.audience ? [String(ctx.request.body.audience)] : sr.AUDIENCES;
      const states = await sr.actionStates(strapi, [report]);
      const versions = { ...(report.versions || {}) };
      for (const a of audiences) {
        const v = versions[a];
        if (!v) continue;
        const state = sr.versionState(v, states.get(Number(v.actionId)));
        if (state === 'sent' || state === 'sending') continue;
        await sr.rejectPending(strapi, v.actionId, { orgId, actor, reason: 'Discarded on the Weekly updates page.' });
        versions[a] = { ...v, state: 'discarded' };
      }
      await strapi.entityService.update(UID, report.id, { data: { versions, status: sr.reportStatus(versions) } });
      await invalidate(orgId);
      return respondOne(ctx, report);
    } catch (err) {
      return handle(ctx, err);
    }
  },
}));
