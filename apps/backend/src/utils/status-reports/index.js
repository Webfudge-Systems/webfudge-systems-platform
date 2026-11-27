'use strict';

/**
 * W17 Status Reporter (SaaS, Fudge Work): Fudge AI writes each project's weekly update from real
 * task activity, in two versions (internal for the team, client for the client's contacts).
 *
 * Flow
 *   1. Every Friday (config/cron-tasks.js → runWeeklyDrafts) or on demand (POST /status-reports/generate)
 *      the week's activity is collected and one AI call writes both versions (template
 *      work.weekly_status, metered as feature work.weekly_status).
 *   2. The report is stored as a draft and each version with recipients is proposed as an outbound
 *      AI action (work.status_report.send). Nothing is sent by the AI: the actions wait in the
 *      approval queue (Accounts → AI approvals, and the Weekly updates page in Work).
 *   3. One click (POST /status-reports/:id/send, or Approve in the queue) sends it on the chosen
 *      channel (email now; WhatsApp once Fudge Connect ships, see ./channels.js).
 *
 * Gate: PLATFORM_MODE=saas, AI_ENABLED=true and the Work plan feature pm.ai_teammates (Business).
 * Weeks run Monday 00:00 to the time of generation, Asia/Kolkata.
 */

const { renderTemplate, generateObject } = require('@webfudge/ai');
const ai = require('../ai');
const { ACTION_UID } = require('../ai/actions');
const { orgIdFromRelation } = require('../content-api-helpers');

const REPORT_UID = 'api::status-report.status-report';
const PROJECT_UID = 'api::project.project';
const TASK_UID = 'api::task.task';
const CONTACT_UID = 'api::contact.contact';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';

const FEATURE = 'work.weekly_status';
const PLAN_FEATURE = 'pm.ai_teammates';
const SEND_ACTION = 'work.status_report.send';
const AUDIENCES = ['internal', 'client'];

const IST_MS = 330 * 60 * 1000;
const DAY_MS = 864e5;
const CLOSED_TASK = new Set(['COMPLETED', 'CANCELLED']);
const ACTIVE_TASK = new Set(['IN_PROGRESS', 'ACTIVE', 'INTERNAL_REVIEW']);
const CLOSED_PROJECT = new Set(['completed', 'cancelled', 'canceled', 'archived']);

class ReportError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const personName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.username || u.email || null : null);
const istDate = (d) => (d ? new Date(new Date(d).getTime() + IST_MS).toISOString().slice(0, 10) : null);
const uniqEmails = (list) => {
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const e = String(raw || '').trim();
    if (!e || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || seen.has(e.toLowerCase())) continue;
    seen.add(e.toLowerCase());
    out.push(e);
  }
  return out;
};

// ---------- period ----------

/** The reporting week for `now`: Monday 00:00 IST → now, plus next week's range and an ISO week key. */
function reportPeriod(now = new Date()) {
  const local = new Date(now.getTime() + IST_MS); // UTC fields of `local` = IST wall clock
  const dow = (local.getUTCDay() + 6) % 7; // 0 = Monday
  const mondayLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - dow);
  const start = new Date(mondayLocal - IST_MS);
  const thursday = new Date(mondayLocal + 3 * DAY_MS);
  const isoYear = thursday.getUTCFullYear();
  const week = Math.ceil(((thursday - Date.UTC(isoYear, 0, 1)) / DAY_MS + 1) / 7);
  return {
    weekKey: `${isoYear}-W${String(week).padStart(2, '0')}`,
    start,
    end: now,
    nextStart: new Date(start.getTime() + 7 * DAY_MS),
    nextEnd: new Date(start.getTime() + 14 * DAY_MS),
  };
}

function periodLabels(p) {
  return { from: istDate(p.start), to: istDate(p.end), nextFrom: istDate(p.nextStart), nextTo: istDate(new Date(p.nextEnd.getTime() - 1)) };
}

// ---------- project + activity ----------

const PROJECT_POPULATE = {
  organization: { fields: ['id', 'name'] },
  projectManager: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
  teamMembers: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
  clientAccount: { fields: ['id', 'companyName'] },
  customer: { fields: ['id', 'firstName', 'lastName', 'email'] },
};

async function loadProject(strapi, orgId, projectId) {
  const id = Number(projectId);
  if (!Number.isInteger(id) || id <= 0) return null;
  const p = await strapi.entityService.findOne(PROJECT_UID, id, { fields: ['id', 'name', 'status', 'endDate', 'startDate'], populate: PROJECT_POPULATE });
  if (!p || String(orgIdFromRelation(p.organization)) !== String(orgId)) return null;
  return p;
}

function taskItem(t) {
  return {
    name: t.name,
    status: t.status,
    priority: t.priority,
    due: istDate(t.scheduledDate),
    owner: personName(t.assignee),
    clientVisible: Boolean(t.clientVisible),
  };
}

/** What happened on the project this week, grouped for the prompt. Uses only stored task data. */
async function collectActivity(strapi, project, period) {
  const tasks = await strapi.entityService.findMany(TASK_UID, {
    filters: { projects: { id: project.id } },
    fields: ['id', 'name', 'status', 'priority', 'scheduledDate', 'completedAt', 'updatedAt', 'clientVisible'],
    populate: { assignee: { fields: ['id', 'username', 'firstName', 'lastName'] } },
    limit: 1000,
  });
  const start = period.start.getTime();
  const end = period.end.getTime();
  const now = period.end.getTime();
  const inWeek = (d) => d && new Date(d).getTime() >= start && new Date(d).getTime() <= end;

  const done = [];
  const inProgress = [];
  const blocked = [];
  const nextWeek = [];
  for (const t of tasks) {
    const due = t.scheduledDate ? new Date(t.scheduledDate).getTime() : null;
    if (t.status === 'COMPLETED') {
      if (inWeek(t.completedAt) || (!t.completedAt && inWeek(t.updatedAt))) done.push(t);
      continue;
    }
    if (t.status === 'CANCELLED') continue;
    const overdue = due != null && due < now;
    if (t.status === 'ON_HOLD' || t.status === 'OVERDUE' || overdue) blocked.push({ ...t, _overdue: overdue });
    else if (ACTIVE_TASK.has(t.status)) inProgress.push(t);
    if (due != null && due >= period.nextStart.getTime() && due < period.nextEnd.getTime()) nextWeek.push(t);
  }

  let comments = [];
  const ids = tasks.map((t) => t.id);
  if (ids.length) {
    const byId = new Map(tasks.map((t) => [t.id, t.name]));
    const rows = await strapi.entityService.findMany(ACTIVITY_UID, {
      filters: { action: 'comment', subjectType: 'task', subjectId: { $in: ids.slice(0, 500) }, createdAt: { $gte: period.start.toISOString() } },
      fields: ['subjectId', 'meta', 'createdAt'],
      sort: { createdAt: 'desc' },
      limit: 30,
    });
    comments = rows
      .map((r) => ({ task: byId.get(Number(r.subjectId)), comment: String(r.meta?.comment || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300) }))
      .filter((c) => c.task && c.comment);
  }

  const cap = (list) => list.slice(0, 40).map((t) => ({ ...taskItem(t), ...(t._overdue ? { overdue: true } : {}) }));
  return {
    totals: {
      tasks: tasks.length,
      open: tasks.filter((t) => !CLOSED_TASK.has(t.status)).length,
      doneThisWeek: done.length,
      blockedOrOverdue: blocked.length,
    },
    clientVisibleTasksExist: tasks.some((t) => t.clientVisible),
    done: cap(done),
    inProgress: cap(inProgress),
    blocked: cap(blocked),
    nextWeek: cap(nextWeek),
    recentComments: comments,
  };
}

/** Default recipients: client = W10 portal contacts (else primary contacts) of the project's client + its customer contact; internal = PM + team. */
async function defaultRecipients(strapi, project) {
  const orgId = orgIdFromRelation(project.organization);
  const internal = uniqEmails([project.projectManager?.email, ...(project.teamMembers || []).map((u) => u.email)]);
  const client = [];
  const clientAccountId = relId(project.clientAccount);
  if (clientAccountId) {
    const contacts = await strapi.entityService.findMany(CONTACT_UID, {
      filters: { organization: { id: orgId }, clientAccount: { id: clientAccountId }, email: { $notNull: true } },
      fields: ['id', 'email', 'portalAccess', 'isPrimaryContact'],
      limit: 200,
    });
    const portal = contacts.filter((c) => c.portalAccess === true);
    client.push(...(portal.length ? portal : contacts.filter((c) => c.isPrimaryContact)).map((c) => c.email));
  }
  if (project.customer?.email) client.push(project.customer.email);
  return { internal, client: uniqEmails(client) };
}

// ---------- rendering ----------

const HEALTH_LABEL = { on_track: 'On track', at_risk: 'At risk', off_track: 'Off track' };

function section(title, items) {
  const list = (items || []).map((s) => String(s).trim()).filter(Boolean);
  return list.length ? `${title}\n${list.map((s) => `- ${s}`).join('\n')}` : null;
}

/** Turns the AI's structured content into an editable subject + plain-text body. */
function renderVersion(audience, content, { project, period }) {
  const labels = periodLabels(period);
  if (audience === 'internal') {
    const c = content.internal || {};
    const parts = [
      c.headline,
      c.health ? `Health: ${HEALTH_LABEL[c.health] || c.health}` : null,
      section('Done this week', c.done),
      section('In progress', c.inProgress),
      section('Blocked', c.blocked),
      section('Next week', c.nextWeek),
      section('Risks', c.risks),
    ].filter(Boolean);
    return { subject: `[Internal] ${project.name}: week of ${labels.from}`, body: parts.join('\n\n') };
  }
  const c = content.client || {};
  const signer = personName(project.projectManager);
  const orgName = project.organization?.name;
  const subject = c.subject && c.subject.toLowerCase().includes(String(project.name).toLowerCase()) ? c.subject : `${project.name}: ${c.subject || 'weekly update'}`;
  const parts = [
    'Hello,',
    c.summary,
    section('Completed this week', c.done),
    section('In progress', c.inProgress),
    section('Coming up next week', c.nextWeek),
    section('What we need from you', c.needsFromClient),
    ['Regards,', signer, orgName].filter(Boolean).join('\n'),
  ].filter(Boolean);
  return { subject: subject.slice(0, 200), body: parts.join('\n\n') };
}

// ---------- actions (approval queue) ----------

function actionInput(report, project, audience, version) {
  return {
    reportId: report.id,
    projectId: project.id,
    audience,
    channel: version.channel || 'email',
    recipients: version.recipients,
    to: version.recipients.join(', '),
    subject: version.subject,
    body: version.body,
  };
}

/** Cron runs have no signed-in user: the PM (else the generating user) is the actor; permission is re-checked as the approver. */
function systemActor(orgId, userId) {
  return { id: userId ?? null, orgId, system: true, ctx: { state: { orgId } } };
}

async function proposeVersion(strapi, { report, project, audience, version, actor }) {
  const { getActionRunner } = require('../ai/actions');
  const record = await getActionRunner(strapi).propose({
    key: SEND_ACTION,
    actor,
    orgId: orgIdFromRelation(project.organization),
    input: actionInput(report, project, audience, version),
    feature: FEATURE,
    subject: { type: 'project', id: project.id },
    summary: `Weekly ${audience} update for "${project.name}" to ${version.recipients.length} recipient(s) by ${version.channel || 'email'}`,
  });
  return record.id;
}

/** Keeps a pending action's draft (what the approver sees and what gets sent) in step with edits. */
async function syncPendingAction(strapi, actionId, input) {
  if (!actionId) return false;
  const res = await strapi.db.query(ACTION_UID).updateMany({ where: { id: Number(actionId), status: 'pending_approval' }, data: { input } });
  return Boolean(res?.count);
}

async function rejectPending(strapi, actionId, { orgId, actor, reason }) {
  if (!actionId) return;
  const { getActionRunner, createStrapiActionStore } = require('../ai/actions');
  const rec = await createStrapiActionStore(strapi).get(actionId);
  if (!rec || rec.status !== 'pending_approval') return;
  try {
    await getActionRunner(strapi).reject(actionId, { actor, orgId, reason });
  } catch (_) {
    // Fallback for system actors without permissions: close it directly.
    await strapi.db.query(ACTION_UID).updateMany({ where: { id: Number(actionId), status: 'pending_approval' }, data: { status: 'rejected', error: reason, decidedAt: new Date() } });
  }
}

/** pending | sent | discarded | failed | no_recipients, from the version's action row. */
const ACTION_STATE = { pending_approval: 'pending', executing: 'sending', executed: 'sent', rejected: 'discarded', failed: 'failed', undone: 'discarded' };

async function actionStates(strapi, reports) {
  const ids = [];
  for (const r of reports) for (const a of AUDIENCES) if (r.versions?.[a]?.actionId) ids.push(Number(r.versions[a].actionId));
  if (!ids.length) return new Map();
  const rows = await strapi.db.query(ACTION_UID).findMany({ where: { id: { $in: ids } }, select: ['id', 'status', 'result', 'error', 'executedAt'] });
  return new Map(rows.map((r) => [r.id, r]));
}

function versionState(version, action) {
  if (!version) return 'none';
  if (version.state === 'sent' || version.state === 'discarded') return version.state;
  if (action) return ACTION_STATE[action.status] || action.status;
  return version.recipients?.length ? 'draft' : 'no_recipients';
}

function reportStatus(versions) {
  const states = AUDIENCES.map((a) => versions?.[a]?.state).filter(Boolean);
  const sent = states.filter((s) => s === 'sent').length;
  if (sent && sent === states.filter((s) => s !== 'discarded' && s !== 'no_recipients').length) return 'sent';
  if (sent) return 'partially_sent';
  if (states.length && states.every((s) => s === 'discarded' || s === 'no_recipients')) return 'discarded';
  return 'draft';
}

// ---------- generation ----------

/**
 * Generates (or regenerates) this week's report for one project and queues both versions for approval.
 * @param {object} o
 * @param {number} o.orgId
 * @param {number} o.projectId
 * @param {number|null} o.userId    who generated it (null for the Friday run)
 * @param {object} [o.actor]        AI action actor; defaults to a system actor for the PM
 * @param {'scheduled'|'manual'} [o.source]
 * @param {string} [o.language]     en | hi | mr
 * @param {Date} [o.now]
 */
async function generateReport(strapi, { orgId, projectId, userId = null, actor = null, source = 'manual', language = 'en', now = new Date() }) {
  const project = await loadProject(strapi, orgId, projectId);
  if (!project) throw new ReportError(404, 'PROJECT_NOT_FOUND', 'Project not found.');
  const period = reportPeriod(now);

  const [existing] = await strapi.entityService.findMany(REPORT_UID, { filters: { project: { id: project.id }, weekKey: period.weekKey }, limit: 1 });
  if (existing) {
    const states = await actionStates(strapi, [existing]);
    if (AUDIENCES.some((a) => versionState(existing.versions?.[a], states.get(Number(existing.versions?.[a]?.actionId))) === 'sent')) {
      throw new ReportError(409, 'REPORT_ALREADY_SENT', "This week's update has already been sent for this project.");
    }
    if (source === 'scheduled') return existing; // the Friday run never overwrites a draft someone may be editing
  }

  const activity = await collectActivity(strapi, project, period);
  const labels = periodLabels(period);
  const promptProject = {
    name: project.name,
    status: project.status,
    endDate: istDate(project.endDate),
    client: project.clientAccount?.companyName || null,
    projectManager: personName(project.projectManager),
  };
  const t = renderTemplate('work.weekly_status', { project: promptProject, period: labels, activity }, { language });
  const client = ai.clientFor(strapi, { state: {} }, { orgId, userId: userId ?? relId(project.projectManager) ?? null });
  const { object, credits, model } = await generateObject(client, { ...t, feature: FEATURE, metadata: { subjectType: 'project', subjectId: project.id, source } });

  const recipients = await defaultRecipients(strapi, project);
  const versions = {};
  for (const audience of AUDIENCES) {
    const prev = existing?.versions?.[audience];
    versions[audience] = {
      ...renderVersion(audience, object, { project, period }),
      channel: prev?.channel || 'email',
      // Keep recipients someone already edited on a regenerated draft.
      recipients: prev?.recipientsEdited ? prev.recipients : recipients[audience],
      recipientsEdited: Boolean(prev?.recipientsEdited),
      actionId: null,
      state: 'draft',
    };
  }

  const data = {
    organization: orgId,
    orgKey: Number(orgId),
    project: project.id,
    weekKey: period.weekKey,
    periodStart: period.start,
    periodEnd: period.end,
    status: 'draft',
    source,
    language: t.language,
    health: object.internal?.health || null,
    aiContent: object,
    activity,
    versions,
    model,
    creditsUsed: credits || 0,
    generatedAt: new Date(),
    generatedBy: userId,
  };

  let report;
  if (existing) {
    const proposer = actor || systemActor(orgId, userId ?? relId(project.projectManager));
    for (const a of AUDIENCES) await rejectPending(strapi, existing.versions?.[a]?.actionId, { orgId, actor: proposer, reason: 'Replaced by a regenerated draft.' });
    report = await strapi.entityService.update(REPORT_UID, existing.id, { data });
  } else {
    report = await strapi.entityService.create(REPORT_UID, { data });
  }

  const proposer = actor || systemActor(orgId, relId(project.projectManager) ?? userId);
  for (const audience of AUDIENCES) {
    const v = versions[audience];
    if (v.recipients.length) v.actionId = await proposeVersion(strapi, { report, project, audience, version: v, actor: proposer });
  }
  report = await strapi.entityService.update(REPORT_UID, report.id, { data: { versions } });
  return report;
}

/** Applies edits ({ subject, body, recipients, channel }) to a version that has not been sent. */
async function applyVersionEdits(strapi, report, project, audience, edits = {}) {
  if (!AUDIENCES.includes(audience)) throw new ReportError(400, 'BAD_AUDIENCE', 'audience must be "client" or "internal".');
  const versions = { ...(report.versions || {}) };
  const v = { ...(versions[audience] || {}) };
  const states = await actionStates(strapi, [report]);
  const state = versionState(v, states.get(Number(v.actionId)));
  if (state === 'sent' || state === 'sending') throw new ReportError(409, 'VERSION_SENT', `The ${audience} update has already been sent.`);

  let changed = false;
  if (typeof edits.subject === 'string' && edits.subject.trim()) {
    v.subject = edits.subject.trim().slice(0, 200);
    changed = true;
  }
  if (typeof edits.body === 'string' && edits.body.trim()) {
    v.body = edits.body.slice(0, 20000);
    changed = true;
  }
  if (edits.recipients !== undefined) {
    const list = Array.isArray(edits.recipients) ? edits.recipients : String(edits.recipients || '').split(/[,;\s]+/);
    v.recipients = uniqEmails(list).slice(0, 50);
    v.recipientsEdited = true;
    changed = true;
  }
  if (edits.channel !== undefined) {
    const { getChannel } = require('./channels');
    v.channel = getChannel(edits.channel).key;
    changed = true;
  }
  if (!changed) return report;
  versions[audience] = v;
  await syncPendingAction(strapi, v.actionId, actionInput(report, project, audience, v));
  return strapi.entityService.update(REPORT_UID, report.id, { data: { versions } });
}

// ---------- Friday run ----------

/** Orgs with a live Work subscription whose plan includes the Status Reporter. */
async function eligibleOrgIds(strapi) {
  const { hasFeature } = require('../saas-plans');
  const subs = await strapi.entityService.findMany('api::subscription.subscription', {
    filters: { status: { $in: ['trial', 'active'] }, app: { slug: 'pm' } },
    fields: ['id'],
    populate: { organization: { fields: ['id'] } },
    limit: 5000,
  });
  const ids = [...new Set(subs.map((s) => relId(s.organization)).filter(Boolean))];
  const out = [];
  for (const id of ids) {
    try {
      if (await hasFeature(strapi, id, PLAN_FEATURE)) out.push(id);
    } catch (e) {
      strapi.log.warn(`[status-reports] plan check failed for org ${id}: ${e?.message || e}`);
    }
  }
  return out;
}

/**
 * Friday job: a draft per active project (with at least one task) in every eligible org.
 * Stops an org's run when its AI credits run out. Returns counts for the log.
 */
async function runWeeklyDrafts(strapi, { now = new Date(), orgIds = null } = {}) {
  const counts = { orgs: 0, created: 0, skipped: 0, failed: 0 };
  if (!ai.aiEnabled()) return counts;
  const orgs = orgIds || (await eligibleOrgIds(strapi));
  const period = reportPeriod(now);
  for (const orgId of orgs) {
    counts.orgs += 1;
    const projects = await strapi.entityService.findMany(PROJECT_UID, { filters: { organization: { id: orgId } }, fields: ['id', 'status'], limit: 2000 });
    for (const p of projects) {
      if (CLOSED_PROJECT.has(String(p.status || '').toLowerCase())) {
        counts.skipped += 1;
        continue;
      }
      const [already] = await strapi.entityService.findMany(REPORT_UID, { filters: { project: { id: p.id }, weekKey: period.weekKey }, fields: ['id'], limit: 1 });
      const taskCount = await strapi.entityService.count(TASK_UID, { filters: { projects: { id: p.id } } });
      if (already || !taskCount) {
        counts.skipped += 1;
        continue;
      }
      try {
        await generateReport(strapi, { orgId, projectId: p.id, source: 'scheduled', now });
        counts.created += 1;
      } catch (err) {
        if (err?.code === 'AI_CREDITS_EXHAUSTED') {
          strapi.log.warn(`[status-reports] org ${orgId}: AI credits used up, stopping this week's drafts.`);
          counts.failed += 1;
          break;
        }
        counts.failed += 1;
        strapi.log.error(`[status-reports] project ${p.id}: ${err?.message || err}`);
      }
    }
    try {
      await require('../cache').invalidateOrg(orgId);
    } catch (_) {
      /* cache is optional */
    }
  }
  return counts;
}

module.exports = {
  REPORT_UID,
  FEATURE,
  PLAN_FEATURE,
  SEND_ACTION,
  AUDIENCES,
  ReportError,
  reportPeriod,
  periodLabels,
  loadProject,
  collectActivity,
  defaultRecipients,
  renderVersion,
  actionInput,
  generateReport,
  applyVersionEdits,
  actionStates,
  versionState,
  reportStatus,
  proposeVersion,
  rejectPending,
  runWeeklyDrafts,
  uniqEmails,
};
