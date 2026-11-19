'use strict';

/**
 * Client portal (W10): CRM contacts with `portalAccess` on a client account sign in with a
 * short-lived, single-use magic link and get an opaque portal session token.
 *
 * Security model
 * - Portal tokens are random opaque strings (`wfp_…`), stored only as HMAC hashes. They are not JWTs,
 *   so the global jwt-auth middleware can never turn one into `ctx.state.user`, and a user JWT can
 *   never resolve to a portal session. Portal contacts are not users and never take a seat.
 * - Every portal request re-reads the contact: `portalAccess` must still be on and the contact must
 *   still belong to a client account of the same organization. Revoking access turns the flag off
 *   and revokes every open session, so the next request fails.
 * - A contact may see a project only when project.organization = contact.organization,
 *   project.clientAccount = contact.clientAccount and project.clientPortalEnabled = true.
 *   Tasks need `clientVisible` and must belong to that project; files need `clientShareable` and
 *   must hang off that project or one of its visible tasks. Anything else answers 404, so ids from
 *   other projects or organizations reveal nothing.
 */

const crypto = require('crypto');
const { jwtSecret, isSaas } = require('./platform');
const { sendMail, layout, escapeHtml } = require('./mailer');
const { orgIdFromRelation } = require('./content-api-helpers');

const SESSION_UID = 'api::portal-session.portal-session';
const CONTACT_UID = 'api::contact.contact';
const PROJECT_UID = 'api::project.project';
const TASK_UID = 'api::task.task';
const ATTACHMENT_UID = 'api::entity-attachment.entity-attachment';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';

const LINK_TTL_MS = 15 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const LINK_COOLDOWN_MS = 45 * 1000;
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;
const LINK_PREFIX = 'wfl_';
const SESSION_PREFIX = 'wfp_';

/**
 * Plan feature key for the portal (Business plan). The plan-gating work (G16 + W15) owns the plan →
 * feature table; until it lands every SaaS organization may use the portal.
 */
const CLIENT_PORTAL_FEATURE = 'work.client_portal';

async function orgHasPortalFeature(strapi, orgId) {
  if (!isSaas()) return true; // Internal deployment has every feature.
  // The portal is part of Work: no Work subscription (or a locked one) means no portal.
  const { getOrgAccess } = require('./saas-access');
  const access = (await getOrgAccess(strapi, orgId))?.pm?.access;
  if (!access || access === 'none' || access === 'locked') return false;
  // TODO(G16/W15): also require planAllows(strapi, orgId, CLIENT_PORTAL_FEATURE) once plan gating merges.
  return true;
}

class PortalError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const hashToken = (token) => crypto.createHmac('sha256', jwtSecret()).update(`portal:${token}`).digest('hex');
const newToken = (prefix) => `${prefix}${crypto.randomBytes(32).toString('base64url')}`;
const relId = (rel) => (rel == null ? null : typeof rel === 'object' ? rel.id ?? null : Number(rel) || null);
const toId = (raw) => {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isInteger(n) && n > 0 && String(n) === String(raw).trim() ? n : null;
};
const contactName = (c) => [c?.firstName, c?.lastName].filter(Boolean).join(' ').trim() || c?.email || 'Client';

function portalAppUrl() {
  return (process.env.PORTAL_APP_URL || process.env.PM_APP_URL || 'http://localhost:3006').replace(/\/+$/, '');
}

/** Loads a contact and checks it may use the portal. Returns null when it may not. */
async function loadEligibleContact(strapi, contactId) {
  if (!contactId) return null;
  const contact = await strapi.entityService.findOne(CONTACT_UID, contactId, {
    fields: ['id', 'firstName', 'lastName', 'email', 'portalAccess'],
    populate: {
      organization: { fields: ['id', 'name'] },
      clientAccount: { fields: ['id', 'companyName'], populate: { organization: { fields: ['id'] } } },
    },
  });
  if (!contact || contact.portalAccess !== true || !contact.email) return null;
  const orgId = orgIdFromRelation(contact.organization);
  const clientAccountId = relId(contact.clientAccount);
  if (!orgId || !clientAccountId) return null;
  if (orgIdFromRelation(contact.clientAccount.organization) !== orgId) return null;
  return { contact, orgId, clientAccountId };
}

/** Filters for the projects a portal contact may see. The only place this rule lives. */
function allowedProjectFilters(portal) {
  return {
    organization: { id: portal.orgId },
    clientAccount: { id: portal.clientAccountId },
    clientPortalEnabled: true,
  };
}

// ── Magic links ──────────────────────────────────────────────────────────────

async function issueMagicLink(strapi, eligible, { invitedBy } = {}) {
  const { contact, orgId } = eligible;
  const recent = await strapi.entityService.findMany(SESSION_UID, {
    filters: { kind: 'magic_link', contact: { id: contact.id }, consumedAt: { $null: true }, revokedAt: { $null: true } },
    sort: { createdAt: 'desc' },
    limit: 10,
  });
  if (recent[0] && Date.now() - new Date(recent[0].createdAt).getTime() < LINK_COOLDOWN_MS) {
    throw new PortalError(429, 'LINK_TOO_SOON', 'A sign-in link was just sent. Please wait a moment.');
  }
  // Only the newest link works.
  for (const row of recent) {
    await strapi.entityService.update(SESSION_UID, row.id, { data: { revokedAt: new Date() } });
  }

  const token = newToken(LINK_PREFIX);
  await strapi.entityService.create(SESSION_UID, {
    data: {
      kind: 'magic_link',
      tokenHash: hashToken(token),
      contact: contact.id,
      organization: orgId,
      expiresAt: new Date(Date.now() + LINK_TTL_MS),
    },
  });

  const orgName = contact.organization?.name || 'your project team';
  const href = `${portalAppUrl()}/portal/auth?token=${encodeURIComponent(token)}`;
  const intro = invitedBy
    ? `${escapeHtml(invitedBy)} at ${escapeHtml(orgName)} invited you to their client portal, where you can follow your projects, approve deliverables and send requests.`
    : `Use this link to sign in to the ${escapeHtml(orgName)} client portal.`;
  await sendMail({
    to: contact.email,
    subject: invitedBy ? `${orgName} invited you to their client portal` : `Your sign-in link for ${orgName}`,
    text: `${intro.replace(/&amp;/g, '&')}\n\nSign in: ${href}\n\nThe link works once and expires in 15 minutes. If you did not expect this email, you can ignore it.`,
    html: layout({
      heading: invitedBy ? 'You have been invited' : 'Sign in to your client portal',
      bodyHtml: `<p>${intro}</p>`,
      cta: { href, label: 'Open the client portal' },
      footnote: 'The link works once and expires in 15 minutes. If you did not expect this email, you can ignore it.',
    }),
  });
  return { expiresInSeconds: LINK_TTL_MS / 1000 };
}

/** Public "email me a link": sends one per eligible contact with that email. Never reveals whether any exist. */
async function requestMagicLink(strapi, rawEmail) {
  const email = String(rawEmail || '').trim().toLowerCase();
  if (!email || !email.includes('@') || email.length > 254) return;
  const rows = await strapi.entityService.findMany(CONTACT_UID, {
    filters: { email: { $eqi: email }, portalAccess: true },
    fields: ['id'],
    limit: 10,
  });
  for (const row of rows) {
    const eligible = await loadEligibleContact(strapi, row.id);
    if (!eligible) continue;
    if (!(await orgHasPortalFeature(strapi, eligible.orgId))) continue;
    try {
      await issueMagicLink(strapi, eligible);
    } catch (e) {
      if (!(e instanceof PortalError)) throw e; // cooldown: stay silent
    }
  }
}

/** Swaps a magic link for a session token. The link is consumed even if the swap then fails. */
async function exchangeMagicLink(strapi, rawToken) {
  const token = String(rawToken || '');
  if (!token.startsWith(LINK_PREFIX)) throw new PortalError(401, 'LINK_INVALID', 'This sign-in link is not valid.');
  const [link] = await strapi.entityService.findMany(SESSION_UID, {
    filters: { kind: 'magic_link', tokenHash: hashToken(token) },
    populate: { contact: { fields: ['id'] } },
    limit: 1,
  });
  if (!link || link.consumedAt || link.revokedAt) {
    throw new PortalError(401, 'LINK_USED', 'This sign-in link has already been used. Ask for a new one.');
  }
  await strapi.entityService.update(SESSION_UID, link.id, { data: { consumedAt: new Date() } });
  if (new Date(link.expiresAt).getTime() <= Date.now()) {
    throw new PortalError(401, 'LINK_EXPIRED', 'This sign-in link has expired. Ask for a new one.');
  }
  const eligible = await loadEligibleContact(strapi, relId(link.contact));
  if (!eligible) throw new PortalError(403, 'PORTAL_ACCESS_REVOKED', 'Portal access is not enabled for you.');

  const sessionToken = newToken(SESSION_PREFIX);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await strapi.entityService.create(SESSION_UID, {
    data: {
      kind: 'session',
      tokenHash: hashToken(sessionToken),
      contact: eligible.contact.id,
      organization: eligible.orgId,
      expiresAt,
      lastUsedAt: new Date(),
    },
  });
  return { token: sessionToken, expiresAt: expiresAt.toISOString() };
}

// ── Sessions ─────────────────────────────────────────────────────────────────

function bearer(ctx) {
  const header = String(ctx.request.headers.authorization || '');
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/** Resolves the portal session on a request, or throws PortalError(401/403). */
async function resolvePortal(strapi, ctx) {
  const token = bearer(ctx);
  if (!token.startsWith(SESSION_PREFIX)) throw new PortalError(401, 'PORTAL_AUTH_REQUIRED', 'Please sign in.');
  const [session] = await strapi.entityService.findMany(SESSION_UID, {
    filters: { kind: 'session', tokenHash: hashToken(token), revokedAt: { $null: true } },
    populate: { contact: { fields: ['id'] }, organization: { fields: ['id'] } },
    limit: 1,
  });
  if (!session || new Date(session.expiresAt).getTime() <= Date.now()) {
    throw new PortalError(401, 'PORTAL_SESSION_EXPIRED', 'Your session has ended. Please sign in again.');
  }
  const eligible = await loadEligibleContact(strapi, relId(session.contact));
  // The session is pinned to the org it was issued for; moving the contact elsewhere ends it.
  if (!eligible || eligible.orgId !== orgIdFromRelation(session.organization)) {
    throw new PortalError(403, 'PORTAL_ACCESS_REVOKED', 'Your portal access has been removed.');
  }
  if (!(await orgHasPortalFeature(strapi, eligible.orgId))) {
    throw new PortalError(403, 'PORTAL_NOT_AVAILABLE', 'The client portal is not available for this organization.');
  }
  if (!session.lastUsedAt || Date.now() - new Date(session.lastUsedAt).getTime() > TOUCH_INTERVAL_MS) {
    await strapi.entityService.update(SESSION_UID, session.id, { data: { lastUsedAt: new Date() } });
  }
  return { sessionId: session.id, ...eligible };
}

async function revokeContactSessions(strapi, contactId) {
  const open = await strapi.entityService.findMany(SESSION_UID, {
    filters: { contact: { id: contactId }, revokedAt: { $null: true } },
    fields: ['id'],
    limit: 1000,
  });
  for (const row of open) {
    await strapi.entityService.update(SESSION_UID, row.id, { data: { revokedAt: new Date() } });
  }
  return open.length;
}

// ── Scoped reads ─────────────────────────────────────────────────────────────

const PROJECT_FIELDS = ['id', 'name', 'description', 'status', 'startDate', 'endDate'];
const TASK_FIELDS = [
  'id', 'name', 'description', 'status', 'taskType', 'scheduledDate', 'startDate', 'completedAt',
  'clientApprovalStatus', 'clientApprovalComment', 'clientApprovalAt', 'createdAt',
];

const pick = (row) => (row ? Object.fromEntries(PROJECT_FIELDS.map((k) => [k, row[k] ?? null])) : null);

async function listPortalProjects(strapi, portal) {
  const rows = await strapi.entityService.findMany(PROJECT_UID, {
    filters: allowedProjectFilters(portal),
    fields: [...PROJECT_FIELDS], // copy: Strapi appends documentId to the array it is given
    sort: { updatedAt: 'desc' },
    limit: 200,
  });
  return rows.map(pick);
}

/** The project when this portal contact may see it, else null. */
async function findPortalProject(strapi, portal, rawProjectId) {
  const id = toId(rawProjectId);
  if (!id) return null;
  const [project] = await strapi.entityService.findMany(PROJECT_UID, {
    filters: { ...allowedProjectFilters(portal), id },
    fields: [...PROJECT_FIELDS], // copy: Strapi appends documentId to the array it is given
    limit: 1,
  });
  return pick(project);
}

async function projectProgress(strapi, projectId) {
  const base = { projects: { id: projectId }, parent: { id: { $null: true } }, status: { $ne: 'CANCELLED' } };
  const total = await strapi.db.query(TASK_UID).count({ where: base });
  const done = await strapi.db.query(TASK_UID).count({ where: { ...base, status: 'COMPLETED' } });
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

async function listVisibleTasks(strapi, portal, projectId) {
  return strapi.entityService.findMany(TASK_UID, {
    filters: { organization: { id: portal.orgId }, projects: { id: projectId }, clientVisible: true },
    fields: [...TASK_FIELDS],
    populate: { clientRequestedBy: { fields: ['id'] } },
    sort: [{ scheduledDate: 'asc' }, { id: 'asc' }],
    limit: 500,
  });
}

/** A client-visible task of a project the contact may see, else null. */
async function findVisibleTask(strapi, portal, projectId, rawTaskId) {
  const id = toId(rawTaskId);
  if (!id) return null;
  const [task] = await strapi.entityService.findMany(TASK_UID, {
    filters: { id, organization: { id: portal.orgId }, projects: { id: projectId }, clientVisible: true },
    fields: [...TASK_FIELDS],
    limit: 1,
  });
  return task || null;
}

async function listShareableFiles(strapi, portal, projectId, taskIds) {
  const or = [{ subjectType: 'project', subjectId: projectId }];
  if (taskIds.length) or.push({ subjectType: 'task', subjectId: { $in: taskIds } });
  const rows = await strapi.entityService.findMany(ATTACHMENT_UID, {
    filters: { organization: { id: portal.orgId }, clientShareable: true, $or: or },
    fields: ['id', 'fileName', 'subjectType', 'subjectId', 'createdAt'],
    populate: { file: { fields: ['url', 'mime', 'size', 'name'] } },
    sort: { createdAt: 'desc' },
    limit: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.fileName || r.file?.name || 'File',
    url: r.file?.url || null,
    mime: r.file?.mime || null,
    size: r.file?.size ?? null,
    taskId: r.subjectType === 'task' ? r.subjectId : null,
    createdAt: r.createdAt,
  }));
}

function serializeTask(t, portal) {
  return {
    id: t.id,
    name: t.name,
    description: t.description || '',
    status: t.status,
    type: t.taskType || 'task',
    dueDate: t.scheduledDate || null,
    startDate: t.startDate || null,
    completedAt: t.completedAt || null,
    approval: t.taskType === 'deliverable'
      ? { status: t.clientApprovalStatus || 'none', comment: t.clientApprovalComment || '', at: t.clientApprovalAt || null }
      : null,
    raisedByYou: portal ? relId(t.clientRequestedBy) === portal.contact.id : false,
    createdAt: t.createdAt,
  };
}

// ── Writes ───────────────────────────────────────────────────────────────────

/** Leaves a comment on the task's thread in Work, attributed to the client contact. */
async function logClientComment(strapi, { orgId, taskId, taskName, contact, comment }) {
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: {
        organization: orgId,
        actor: null,
        action: 'comment',
        subjectType: 'task',
        subjectId: taskId,
        summary: `${contactName(contact)} (client) commented on task "${taskName}"`,
        meta: { comment, source: 'client_portal', clientContactId: contact.id, clientName: contactName(contact) },
      },
    });
  } catch (e) {
    strapi.log.warn(`client-portal: could not log comment on task ${taskId}: ${e?.message || e}`);
  }
}

async function notifyProjectTeam(strapi, { orgId, projectId, title, message, taskId }) {
  try {
    const project = await strapi.entityService.findOne(PROJECT_UID, projectId, {
      fields: ['id'],
      populate: { projectManager: { fields: ['id'] }, teamMembers: { fields: ['id'] } },
    });
    const userIds = [...new Set([relId(project?.projectManager), ...(project?.teamMembers || []).map(relId)].filter(Boolean))];
    const svc = strapi.service('api::notification.notification');
    if (!userIds.length || !svc?.notify) return;
    await svc.notify({
      userIds,
      organizationId: orgId,
      type: 'task_comment',
      title,
      message,
      data: { subjectType: 'task', subjectId: taskId, source: 'client_portal', app: 'pm', href: `/tasks/${taskId}` },
    });
  } catch (e) {
    strapi.log.warn(`client-portal: notify failed: ${e?.message || e}`);
  }
}

module.exports = {
  CLIENT_PORTAL_FEATURE,
  PortalError,
  SESSION_UID,
  LINK_TTL_MS,
  SESSION_TTL_MS,
  orgHasPortalFeature,
  hashToken,
  toId,
  contactName,
  loadEligibleContact,
  allowedProjectFilters,
  issueMagicLink,
  requestMagicLink,
  exchangeMagicLink,
  resolvePortal,
  revokeContactSessions,
  listPortalProjects,
  findPortalProject,
  projectProgress,
  listVisibleTasks,
  findVisibleTask,
  listShareableFiles,
  serializeTask,
  logClientComment,
  notifyProjectTeam,
};
