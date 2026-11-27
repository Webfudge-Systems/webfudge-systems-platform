'use strict';

/**
 * CRM cadences (G14): multi-step outreach by day — call / task steps create CRM tasks, email steps
 * go out through the mailer (Resend), WhatsApp steps go through the channel interface (not
 * available until Fudge Connect ships, so the step is recorded as unavailable and a manual task is
 * created instead). A cadence stops as soon as the lead replies: an inbound activity on the lead
 * (crm-activity with meta.inbound = true or meta.kind = 'reply', written after enrolment) or the
 * manual "replied" action (markReplied). The cron (config/cron-tasks.js → crmCadences) calls
 * processDueEnrollments every 15 minutes.
 *
 * Inbound integrations that learn about a reply (e.g. an email webhook) should call markReplied.
 */

const { getChannel } = require('./status-reports/channels');

const CADENCE_UID = 'api::crm-cadence.crm-cadence';
const ENROLLMENT_UID = 'api::crm-cadence.crm-cadence-enrollment';
const TASK_UID = 'api::task.task';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';
const LEAD_UID = 'api::lead-company.lead-company';
const CONTACT_UID = 'api::contact.contact';

const STEP_TYPES = ['call', 'task', 'email', 'whatsapp'];
const MAX_STEPS = 20;
const MAX_DAY = 90;
const DAY_MS = 24 * 3600 * 1000;

const relId = (v) => (v == null ? null : typeof v === 'object' ? v.id ?? null : Number(v));
const str = (v, max) => String(v ?? '').trim().slice(0, max);

/** Validate and sort steps. @returns {{ steps: object[], error: string|null }} */
function normalizeSteps(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return { steps: [], error: 'Add at least one step.' };
  if (raw.length > MAX_STEPS) return { steps: [], error: `A cadence can have at most ${MAX_STEPS} steps.` };
  const steps = [];
  for (const [i, s] of raw.entries()) {
    const type = String(s?.type || '');
    if (!STEP_TYPES.includes(type)) return { steps: [], error: `Step ${i + 1}: unknown type "${type}".` };
    const day = parseInt(s.day, 10);
    if (!Number.isInteger(day) || day < 1 || day > MAX_DAY) return { steps: [], error: `Step ${i + 1}: day must be between 1 and ${MAX_DAY}.` };
    const step = { day, type, title: str(s.title, 200), subject: str(s.subject, 200), body: String(s.body ?? '').slice(0, 5000) };
    if (type === 'email' && !step.subject) return { steps: [], error: `Step ${i + 1}: an email step needs a subject.` };
    if (type === 'email' && !step.body.trim()) return { steps: [], error: `Step ${i + 1}: an email step needs a message.` };
    steps.push(step);
  }
  steps.sort((a, b) => a.day - b.day);
  return { steps, error: null };
}

/** Day 1 runs at enrolment; day N runs N-1 days later. */
function stepDueAt(enrolledAt, day) {
  return new Date(new Date(enrolledAt).getTime() + (Math.max(1, day) - 1) * DAY_MS);
}

/** {{var}} placeholders; unknown ones render empty. */
function renderTemplate(text, vars) {
  return String(text || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] == null ? '' : String(vars[k])));
}

const personName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ') || u.username || u.email || '' : '');

function templateVars({ lead, contact, owner }) {
  return {
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    fullName: [contact?.firstName, contact?.lastName].filter(Boolean).join(' '),
    company: lead?.companyName || '',
    ownerName: personName(owner),
  };
}

function stepTitle(step, vars) {
  const base = renderTemplate(step.title || '', vars) || (step.type === 'call' ? `Call ${vars.fullName || vars.company}` : `Follow up with ${vars.company}`);
  if (step.type === 'call') return `Call: ${base}`.slice(0, 250);
  if (step.type === 'whatsapp') return `WhatsApp: ${vars.fullName || vars.company}`.slice(0, 250);
  return base.slice(0, 250);
}

async function logLeadActivity(strapi, { orgId, leadId, actorUserId = null, summary, meta }) {
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: { organization: orgId, actor: actorUserId, action: 'create', subjectType: 'lead_company', subjectId: leadId, leadCompany: leadId, summary, meta },
    });
  } catch (e) {
    strapi.log.warn(`[cadences] activity log failed for lead ${leadId}: ${e?.message || e}`);
  }
}

async function createTask(strapi, { orgId, leadId, ownerId, name, description, dueAt }) {
  return strapi.entityService.create(TASK_UID, {
    data: {
      name,
      description,
      status: 'SCHEDULED',
      priority: 'medium',
      scheduledDate: dueAt,
      leadCompany: leadId,
      organization: orgId,
      ...(ownerId ? { assignee: ownerId } : {}),
      tags: ['cadence'],
    },
  });
}

/** Run one step. Returns the history entry. */
async function executeStep(strapi, { enrollment, cadence, step, index, lead, contact, owner, now }) {
  const orgId = relId(enrollment.organization);
  const leadId = lead.id;
  const ownerId = owner?.id || null;
  const vars = templateVars({ lead, contact, owner });
  const entry = { index, day: step.day, type: step.type, at: now.toISOString() };
  const dueAt = stepDueAt(enrollment.enrolledAt, step.day);

  if (step.type === 'call' || step.type === 'task') {
    const task = await createTask(strapi, { orgId, leadId, ownerId, name: stepTitle(step, vars), description: renderTemplate(step.body, vars) || `Cadence "${cadence.name}", day ${step.day}.`, dueAt });
    Object.assign(entry, { status: 'task_created', taskId: task.id });
  } else if (step.type === 'whatsapp') {
    const channel = getChannel('whatsapp');
    const text = renderTemplate(step.body, vars);
    if (!channel.available) {
      const task = await createTask(strapi, {
        orgId, leadId, ownerId, name: stepTitle(step, vars), dueAt,
        description: `WhatsApp is not available yet (${channel.reason}) Send this yourself${contact?.phone ? ` to ${contact.phone}` : ''}:\n\n${text}`,
      });
      Object.assign(entry, { status: 'unavailable', reason: channel.reason, taskId: task.id });
    } else {
      const out = await channel.send({ to: [contact?.phone].filter(Boolean), subject: '', body: text });
      Object.assign(entry, { status: out.delivered ? 'sent' : 'not_sent', note: out.note || null });
    }
  } else if (step.type === 'email') {
    const to = contact?.email || lead.email;
    const subject = renderTemplate(step.subject, vars);
    if (!to) {
      Object.assign(entry, { status: 'skipped', reason: 'The lead has no email address.' });
    } else {
      try {
        const out = await getChannel('email').send({ to: [to], subject, body: renderTemplate(step.body, vars) });
        Object.assign(entry, { status: out.delivered ? 'sent' : 'not_sent', to, subject, note: out.note || null });
      } catch (e) {
        Object.assign(entry, { status: 'failed', to, subject, note: e?.message || String(e) });
      }
    }
  }

  const what = { call: 'call task created', task: 'task created', whatsapp: entry.status === 'unavailable' ? 'WhatsApp not available yet, manual task created' : `WhatsApp ${entry.status}`, email: `email ${entry.status.replace('_', ' ')}${entry.to ? ` to ${entry.to}` : ''}` }[step.type];
  await logLeadActivity(strapi, {
    orgId, leadId,
    summary: `Cadence "${cadence.name}" day ${step.day}: ${what}`,
    meta: { kind: 'cadence_step', type: step.type, status: entry.status, cadenceId: cadence.id, enrollmentId: enrollment.id },
  });
  return entry;
}

/** True when the lead replied after enrolment (inbound activity or a manual "replied"). */
async function hasReplied(strapi, enrollment) {
  const leadId = relId(enrollment.leadCompany);
  if (!leadId) return false;
  const rows = await strapi.entityService.findMany(ACTIVITY_UID, {
    filters: { leadCompany: { id: leadId }, createdAt: { $gt: new Date(enrollment.enrolledAt).toISOString() } },
    fields: ['id', 'meta'],
    sort: [{ id: 'desc' }],
    limit: 200,
  });
  return rows.some((r) => r.meta && (r.meta.inbound === true || r.meta.kind === 'reply'));
}

async function stopEnrollment(strapi, id, reason, now = new Date()) {
  return strapi.entityService.update(ENROLLMENT_UID, id, { data: { status: 'stopped', stopReason: reason, stoppedAt: now, nextRunAt: null } });
}

const ENROLLMENT_POPULATE = {
  cadence: true,
  leadCompany: true,
  contact: true,
  owner: { fields: ['id', 'username', 'firstName', 'lastName', 'email'] },
  organization: { fields: ['id'] },
};

/** Run every due step of one enrolment (in order), then schedule the next one. */
async function runEnrollment(strapi, enrollmentId, now = new Date()) {
  let enr = await strapi.entityService.findOne(ENROLLMENT_UID, enrollmentId, { populate: ENROLLMENT_POPULATE });
  if (!enr || enr.status !== 'active') return enr;
  const cadence = enr.cadence;
  if (!cadence || !enr.leadCompany) return stopEnrollment(strapi, enr.id, 'lead_or_cadence_deleted', now);
  if (cadence.status === 'archived') return stopEnrollment(strapi, enr.id, 'cadence_archived', now);
  if (cadence.status === 'paused') return enr;
  if (await hasReplied(strapi, enr)) return stopEnrollment(strapi, enr.id, 'replied', now);

  const steps = Array.isArray(cadence.steps) ? cadence.steps : [];
  const history = Array.isArray(enr.history) ? [...enr.history] : [];
  let index = enr.nextStepIndex || 0;
  while (index < steps.length && stepDueAt(enr.enrolledAt, steps[index].day).getTime() <= now.getTime()) {
    const entry = await executeStep(strapi, { enrollment: enr, cadence, step: steps[index], index, lead: enr.leadCompany, contact: enr.contact, owner: enr.owner, now });
    history.push(entry);
    index += 1;
  }
  const done = index >= steps.length;
  return strapi.entityService.update(ENROLLMENT_UID, enr.id, {
    data: {
      history,
      nextStepIndex: index,
      status: done ? 'completed' : 'active',
      nextRunAt: done ? null : stepDueAt(enr.enrolledAt, steps[index].day),
    },
  });
}

/** Cron entry point: run all active enrolments whose next step is due. Returns how many ran. */
async function processDueEnrollments(strapi, now = new Date()) {
  const due = await strapi.entityService.findMany(ENROLLMENT_UID, {
    filters: { status: 'active', nextRunAt: { $lte: now.toISOString() } },
    fields: ['id'],
    sort: [{ nextRunAt: 'asc' }],
    limit: 500,
  });
  let n = 0;
  for (const row of due) {
    try {
      await runEnrollment(strapi, row.id, now);
      n += 1;
    } catch (e) {
      strapi.log.error(`[cadences] enrolment ${row.id} failed: ${e?.message || e}`);
    }
  }
  return n;
}

/** Enrol leads of the cadence's org. Leads from other orgs are reported as not_found. */
async function enrollLeads(strapi, { orgId, cadence, leadIds, actorUserId, now = new Date() }) {
  const enrolled = [];
  const skipped = [];
  for (const leadId of leadIds) {
    const [lead] = await strapi.entityService.findMany(LEAD_UID, {
      filters: { id: leadId, organization: { id: orgId } },
      populate: { assignedTo: { fields: ['id'] } },
      limit: 1,
    });
    if (!lead) {
      skipped.push({ leadCompanyId: leadId, reason: 'not_found' });
      continue;
    }
    const existing = await strapi.entityService.findMany(ENROLLMENT_UID, {
      filters: { status: 'active', cadence: { id: cadence.id }, leadCompany: { id: leadId } },
      fields: ['id'],
      limit: 1,
    });
    if (existing.length) {
      skipped.push({ leadCompanyId: leadId, reason: 'already_enrolled' });
      continue;
    }
    const contacts = await strapi.entityService.findMany(CONTACT_UID, {
      filters: { leadCompany: { id: leadId } },
      fields: ['id', 'isPrimaryContact', 'email'],
      sort: [{ id: 'asc' }],
      limit: 20,
    });
    const contact = contacts.find((c) => c.isPrimaryContact) || contacts.find((c) => c.email) || contacts[0] || null;
    const enr = await strapi.entityService.create(ENROLLMENT_UID, {
      data: {
        status: 'active',
        enrolledAt: now,
        nextStepIndex: 0,
        nextRunAt: now,
        history: [],
        cadence: cadence.id,
        leadCompany: leadId,
        contact: contact?.id || null,
        owner: relId(lead.assignedTo) || actorUserId,
        enrolledBy: actorUserId,
        organization: orgId,
      },
    });
    await logLeadActivity(strapi, { orgId, leadId, actorUserId, summary: `Enrolled in cadence "${cadence.name}"`, meta: { kind: 'cadence_enrolled', cadenceId: cadence.id, enrollmentId: enr.id } });
    const after = await runEnrollment(strapi, enr.id, now);
    enrolled.push({ id: enr.id, leadCompanyId: leadId, status: after?.status || 'active' });
  }
  return { enrolled, skipped };
}

/** Manual (or integration) "the lead replied": log it and stop every active enrolment for the lead. */
async function markReplied(strapi, { orgId, leadCompanyId, actorUserId = null, note = '' }) {
  const active = await strapi.entityService.findMany(ENROLLMENT_UID, {
    filters: { status: 'active', leadCompany: { id: leadCompanyId }, organization: { id: orgId } },
    fields: ['id'],
    limit: 100,
  });
  await logLeadActivity(strapi, {
    orgId, leadId: leadCompanyId, actorUserId,
    summary: note ? `Lead replied: ${String(note).slice(0, 300)}` : 'Lead replied',
    meta: { kind: 'reply', inbound: true },
  });
  for (const row of active) await stopEnrollment(strapi, row.id, 'replied');
  return { stopped: active.length };
}

module.exports = {
  CADENCE_UID,
  ENROLLMENT_UID,
  STEP_TYPES,
  normalizeSteps,
  stepDueAt,
  renderTemplate,
  templateVars,
  hasReplied,
  runEnrollment,
  processDueEnrollments,
  enrollLeads,
  markReplied,
  stopEnrollment,
  relId,
};
