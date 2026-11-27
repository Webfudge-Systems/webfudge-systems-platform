'use strict';

/**
 * Agent actions in the backend: @webfudge/ai's action runner wired to Strapi.
 *
 *   - store:  api::ai.ai-action rows (status pending_approval = the approval queue)
 *   - can:    the acting user's org role / module permissions (utils/rbac canAccess)
 *   - audit:  the org activity feed (Accounts → Audit logs and the record timelines), with
 *             meta.actorType = 'ai' and the human the AI acted for as `actor`
 *
 * Add an action with defineAiAction({...}) (see the two below). An actor is `actorFromCtx(ctx)`.
 */

const { createActionRunner } = require('@webfudge/ai');
const { canAccess } = require('../rbac');
const { ACTIVITY_UID } = require('../crm-activity-log');

const ACTION_UID = 'api::ai.ai-action';
const LEAD_UID = 'api::lead-company.lead-company';
const KEY_APP = { grow: 'crm', work: 'pm', connect: 'connect' };

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const toDate = (v) => (v ? new Date(v) : v);

/** The acting user, as the runner sees it. */
function actorFromCtx(ctx) {
  return { id: ctx.state.user?.id ?? null, orgId: ctx.state.orgId, ctx: { state: ctx.state } };
}

function fromDb(row) {
  if (!row) return null;
  return {
    id: row.id,
    orgId: row.orgKey,
    actorId: relId(row.actor),
    actor: row.actor && typeof row.actor === 'object' ? { id: row.actor.id, username: row.actor.username, email: row.actor.email } : null,
    actionKey: row.actionKey,
    label: row.label,
    app: row.app,
    feature: row.feature,
    status: row.status,
    outbound: Boolean(row.outbound),
    undoable: Boolean(row.undoable),
    subjectType: row.subjectType,
    subjectId: row.subjectId,
    summary: row.summary,
    input: row.input,
    result: row.result,
    undoData: row.undoData,
    aiMeta: row.aiMeta,
    error: row.error,
    decidedById: relId(row.decidedBy),
    decidedBy: row.decidedBy && typeof row.decidedBy === 'object' ? { id: row.decidedBy.id, username: row.decidedBy.username, email: row.decidedBy.email } : null,
    decidedAt: row.decidedAt,
    executedAt: row.executedAt,
    undoneAt: row.undoneAt,
    createdAt: row.createdAt,
  };
}

const POPULATE = {
  actor: { fields: ['id', 'username', 'email'] },
  decidedBy: { fields: ['id', 'username', 'email'] },
};

const SCALARS = ['status', 'result', 'undoData', 'error', 'summary', 'subjectType', 'subjectId', 'decidedAt', 'executedAt', 'undoneAt'];

function createStrapiActionStore(strapi) {
  return {
    async create(row) {
      const created = await strapi.entityService.create(ACTION_UID, {
        data: {
          organization: row.orgId,
          orgKey: Number(row.orgId),
          actor: row.actorId,
          actionKey: row.actionKey,
          label: row.label,
          app: KEY_APP[String(row.actionKey).split('.')[0]] || null,
          feature: row.feature,
          status: row.status,
          outbound: row.outbound,
          undoable: row.undoable,
          subjectType: row.subjectType,
          subjectId: row.subjectId != null ? String(row.subjectId) : null,
          summary: row.summary,
          input: row.input,
          result: row.result ?? null,
          undoData: row.undoData ?? null,
          aiMeta: row.aiMeta ?? null,
          error: row.error ?? null,
          executedAt: toDate(row.executedAt) ?? null,
        },
        populate: POPULATE,
      });
      return fromDb(created);
    },
    async get(id) {
      const n = Number(id);
      if (!Number.isInteger(n) || n <= 0) return null;
      return fromDb(await strapi.entityService.findOne(ACTION_UID, n, { populate: POPULATE }));
    },
    /** Compare-and-set on status so two people cannot approve (send) the same item. */
    async transition(id, fromStatus, patch) {
      const data = {};
      for (const k of SCALARS) {
        if (patch[k] === undefined) continue;
        data[k] = k.endsWith('At') ? toDate(patch[k]) : k === 'subjectId' && patch[k] != null ? String(patch[k]) : patch[k];
      }
      const res = await strapi.db.query(ACTION_UID).updateMany({ where: { id: Number(id), status: fromStatus }, data });
      if (!res || !res.count) return null;
      const rel = {};
      if (patch.decidedById !== undefined) rel.decidedBy = patch.decidedById;
      if (patch.undoneById !== undefined) rel.undoneBy = patch.undoneById;
      if (Object.keys(rel).length) await strapi.entityService.update(ACTION_UID, Number(id), { data: rel });
      return this.get(id);
    },
  };
}

function createAudit(strapi) {
  return async ({ event, record, actor, summary }) => {
    const numericSubject = Number(record.subjectId);
    const hasSubject = record.subjectType && Number.isInteger(numericSubject) && numericSubject > 0;
    await strapi.entityService.create(ACTIVITY_UID, {
      data: {
        organization: record.orgId,
        actor: actor?.id ?? null,
        action: event === 'proposed' ? 'create' : 'update',
        subjectType: hasSubject ? record.subjectType : 'ai_action',
        subjectId: hasSubject ? numericSubject : record.id,
        leadCompany: hasSubject && record.subjectType === 'lead_company' ? numericSubject : null,
        summary,
        meta: {
          actorType: 'ai',
          actorLabel: 'Fudge AI',
          onBehalfOfUserId: actor?.id ?? null,
          aiActionId: record.id,
          actionKey: record.actionKey,
          event,
          status: record.status,
          feature: record.feature || null,
        },
      },
    });
  };
}

let runner = null;

function getActionRunner(strapi) {
  if (runner) return runner;
  runner = createActionRunner({
    store: createStrapiActionStore(strapi),
    can: async (actor, perm) => canAccess(actor.ctx, perm.app, perm.module, perm.access),
    audit: createAudit(strapi),
    logger: strapi.log,
  });
  registerBuiltInActions(runner, strapi);
  require('./work-triage').registerWorkTriageActions(runner, strapi); // W20
  return runner;
}

/** Throws AiPermissionError (403) unless the actor may run the action. Call before spending credits. */
async function assertAllowed(strapi, key, actor, input) {
  const r = getActionRunner(strapi);
  const def = r.get(key);
  const ok = typeof def.permission === 'function' ? await def.permission(actor, input, { orgId: actor.orgId }) : canAccess(actor.ctx, def.permission.app, def.permission.module, def.permission.access);
  if (!ok) {
    const { AiPermissionError } = require('@webfudge/ai');
    throw new AiPermissionError(`You do not have permission to ${def.label || key}.`, { action: key });
  }
}

// ---------- built-in actions ----------

async function loadLead(strapi, orgId, leadId) {
  const lead = await strapi.entityService.findOne(LEAD_UID, Number(leadId), { populate: { organization: { fields: ['id'] }, assignedTo: { fields: ['id'] } } });
  if (!lead || String(relId(lead.organization)) !== String(orgId)) return null;
  return lead;
}

/** Same rule as editing a lead: crm.leads write access, or the lead is assigned to you. */
async function canEditLead(strapi, actor, leadId) {
  if (canAccess(actor.ctx, 'crm', 'leads', 'write')) return true;
  const lead = await loadLead(strapi, actor.orgId, leadId);
  return Boolean(lead && actor.id && String(relId(lead.assignedTo)) === String(actor.id));
}

function registerBuiltInActions(r, strapi) {
  r.define({
    key: 'grow.lead.set_ai_score',
    label: 'update the AI lead score',
    permission: (actor, input) => canEditLead(strapi, actor, input.leadId),
    describe: (input) => `Scored lead #${input.leadId} at ${input.score}/100 (${input.label})`,
    async execute(input, { orgId }) {
      const lead = await loadLead(strapi, orgId, input.leadId);
      if (!lead) throw new Error('Lead not found.');
      const previous = { aiScore: lead.aiScore ?? null, aiScoreLabel: lead.aiScoreLabel ?? null, aiScoreReasons: lead.aiScoreReasons ?? null, aiScoredAt: lead.aiScoredAt ?? null };
      const scoredAt = new Date();
      await strapi.entityService.update(LEAD_UID, lead.id, {
        data: { aiScore: input.score, aiScoreLabel: input.label, aiScoreReasons: { reasons: input.reasons, nextStep: input.nextStep, model: input.model, language: input.language }, aiScoredAt: scoredAt },
      });
      return {
        result: { score: input.score, label: input.label, scoredAt: scoredAt.toISOString() },
        undoData: { leadId: lead.id, previous },
        subject: { type: 'lead_company', id: lead.id },
        summary: `Scored lead "${lead.companyName || `#${lead.id}`}" at ${input.score}/100 (${input.label})`,
      };
    },
    async undo({ leadId, previous }, { orgId }) {
      const lead = await loadLead(strapi, orgId, leadId);
      if (!lead) throw new Error('Lead not found.');
      await strapi.entityService.update(LEAD_UID, lead.id, { data: { ...previous, aiScoredAt: previous.aiScoredAt ? new Date(previous.aiScoredAt) : null } });
    },
  });

  // Outbound: never sent by the AI itself. Queued for a person to approve.
  r.define({
    key: 'grow.lead.send_email',
    label: 'send an email to a lead',
    outbound: true,
    permission: (actor, input) => canEditLead(strapi, actor, input.leadId),
    describe: (input) => `Email "${input.subject}" to ${input.to}`,
    async execute(input, { orgId }) {
      const lead = await loadLead(strapi, orgId, input.leadId);
      if (!lead) throw new Error('Lead not found.');
      const { sendMail, escapeHtml } = require('../mailer');
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">${escapeHtml(input.body).replace(/\n/g, '<br>')}</div>`;
      const out = await sendMail({ to: input.to, subject: input.subject, text: input.body, html });
      if (!out.sent && process.env.RESEND_API_KEY) throw new Error('The email provider did not accept the message.');
      return { result: { delivered: Boolean(out.sent) }, subject: { type: 'lead_company', id: lead.id } };
    },
  });
}

module.exports = { ACTION_UID, getActionRunner, actorFromCtx, assertAllowed, fromDb, POPULATE, loadLead, canEditLead, createStrapiActionStore };
