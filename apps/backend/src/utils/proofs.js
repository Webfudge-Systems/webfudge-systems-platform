'use strict';

/**
 * Approvals & proofing (W9): versions (v1, v2, …) of a creative or video on a deliverable task,
 * review comments pinned to a point of the image (x/y in % of the frame) and/or a video timestamp
 * (seconds), and approve / request-changes decisions per version.
 *
 * Files reuse entity attachments: every version is an `entity-attachment` on the task, so it also
 * shows in the task's Files tab. The version row only adds the number, status and decision.
 *
 * Who sees what
 * - Team: anyone who may view the task (org admin, assignee / reporter / collaborator, or a viewer
 *   of one of its projects, workspace rules included). Uploading and deciding need PM tasks "write".
 * - Client portal contacts: only versions of client-visible tasks in projects shared with their own
 *   client account (checked by the portal controller through utils/client-portal). Internal team
 *   comments are never sent to the portal.
 */

const { isPmOrgAdminRole } = require('./rbac');
const { userCanViewProject, PROJECT_ACCESS_POPULATE } = require('./workspaces');
const { createEntityAttachment } = require('./entity-attachments');
const { taskStakeholderIds, projectStakeholderIds, notifyUsers, emitCommentNotifications } = require('./notification-emitter');

const VERSION_UID = 'api::proof.proof-version';
const COMMENT_UID = 'api::proof.proof-comment';
const TASK_UID = 'api::task.task';
const ATTACHMENT_UID = 'api::entity-attachment.entity-attachment';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';

const MAX_COMMENT = 5000;
const MAX_NOTE = 2000;
const MAX_VERSIONS = 100;
const MAX_COMMENTS = 2000;

const relId = (rel) => (rel == null ? null : typeof rel === 'object' ? rel.id ?? null : Number(rel) || null);
const toId = (raw) => {
  const n = Number.parseInt(String(raw ?? ''), 10);
  return Number.isInteger(n) && n > 0 && String(n) === String(raw).trim() ? n : null;
};
const text = (v, max) => String(v ?? '').trim().slice(0, max);
const userName = (u) => u?.username || u?.email || 'Team member';
const contactName = (c) => [c?.firstName, c?.lastName].filter(Boolean).join(' ').trim() || c?.email || 'Client';

class ProofError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function kindFromMime(mime) {
  const m = String(mime || '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m.startsWith('video/')) return 'video';
  if (m === 'application/pdf') return 'pdf';
  return 'file';
}

/** A number in [min, max], or null when absent. Throws on junk so bad pins are not saved silently. */
function boundedNumber(raw, min, max, label) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < min || n > max) throw new ProofError(400, `${label} must be between ${min} and ${max}`);
  return Math.round(n * 1000) / 1000;
}

// ── Team access ──────────────────────────────────────────────────────────────

/**
 * The task when the signed-in team user may view it, else null. Mirrors the task API's
 * single-task rule (org, assignee / reporter / collaborators, or a visible project).
 */
async function loadTaskForTeam(strapi, ctx, rawTaskId) {
  const id = toId(rawTaskId);
  if (!id) return null;
  const task = await strapi.entityService.findOne(TASK_UID, id, {
    fields: ['id', 'name', 'taskType', 'clientVisible', 'clientApprovalStatus'],
    populate: {
      organization: { fields: ['id'] },
      assignee: { fields: ['id'] },
      assigner: { fields: ['id'] },
      collaborators: { fields: ['id'] },
      pendingCollaborators: { fields: ['id'] },
      projects: { fields: ['id', 'name', 'isPrivate'], populate: PROJECT_ACCESS_POPULATE },
    },
  });
  if (!task || relId(task.organization) !== Number(ctx.state.orgId)) return null;
  const uid = Number(ctx.state.user?.id);
  if (isPmOrgAdminRole(ctx)) return task;
  if (taskStakeholderIds(task).includes(uid)) return task;
  for (const p of task.projects || []) {
    if (userCanViewProject(ctx, p, uid)) return task;
  }
  return null;
}

// ── Reads ────────────────────────────────────────────────────────────────────

const VERSION_POPULATE = {
  attachment: { fields: ['id', 'fileName'], populate: { file: { fields: ['id', 'name', 'url', 'mime', 'size', 'width', 'height'] } } },
  uploadedBy: { fields: ['id', 'username', 'email'] },
  decidedByUser: { fields: ['id', 'username', 'email'] },
  decidedByContact: { fields: ['id', 'firstName', 'lastName', 'email'] },
};

const COMMENT_POPULATE = {
  proofVersion: { fields: ['id'] },
  authorUser: { fields: ['id', 'username', 'email'] },
  authorContact: { fields: ['id', 'firstName', 'lastName', 'email'] },
};

function serializeComment(c, viewer = {}) {
  const isClient = Boolean(c.authorContact);
  return {
    id: c.id,
    versionId: relId(c.proofVersion),
    body: c.body || '',
    x: c.x == null ? null : Number(c.x),
    y: c.y == null ? null : Number(c.y),
    timestamp: c.timestamp == null ? null : Number(c.timestamp),
    internal: c.internal === true,
    resolved: c.resolved === true,
    resolvedAt: c.resolvedAt || null,
    createdAt: c.createdAt,
    author: {
      kind: isClient ? 'client' : 'team',
      name: isClient ? contactName(c.authorContact) : userName(c.authorUser),
      isYou: isClient
        ? viewer.contactId != null && relId(c.authorContact) === viewer.contactId
        : viewer.userId != null && relId(c.authorUser) === viewer.userId,
    },
  };
}

function serializeVersion(v, comments, viewer = {}) {
  const file = v.attachment?.file || null;
  const decider = v.decidedByContact
    ? { kind: 'client', name: contactName(v.decidedByContact) }
    : v.decidedByUser
      ? { kind: 'team', name: userName(v.decidedByUser) }
      : null;
  return {
    id: v.id,
    version: v.version,
    label: `v${v.version}`,
    kind: v.kind || kindFromMime(file?.mime),
    note: v.note || '',
    status: v.status || 'in_review',
    decision: v.decidedAt ? { at: v.decidedAt, comment: v.decisionComment || '', by: decider } : null,
    file: file
      ? { name: v.attachment.fileName || file.name, url: file.url || null, mime: file.mime || null, size: file.size ?? null, width: file.width ?? null, height: file.height ?? null }
      : null,
    attachmentId: viewer.forClient ? undefined : relId(v.attachment),
    uploadedBy: viewer.forClient ? undefined : v.uploadedBy ? { id: v.uploadedBy.id, name: userName(v.uploadedBy) } : null,
    createdAt: v.createdAt,
    comments: comments.map((c) => serializeComment(c, viewer)),
  };
}

/** All versions of a task, newest first, each with its comments (oldest first). */
async function listTaskProofs(strapi, { orgId, taskId, viewer = {} }) {
  const versions = await strapi.entityService.findMany(VERSION_UID, {
    filters: { organization: { id: orgId }, task: { id: taskId } },
    populate: VERSION_POPULATE,
    sort: { version: 'desc' },
    limit: MAX_VERSIONS,
  });
  const commentFilters = { organization: { id: orgId }, task: { id: taskId } };
  if (viewer.forClient) commentFilters.internal = { $ne: true };
  const comments = versions.length
    ? await strapi.entityService.findMany(COMMENT_UID, {
        filters: commentFilters,
        populate: COMMENT_POPULATE,
        sort: [{ createdAt: 'asc' }, { id: 'asc' }],
        limit: MAX_COMMENTS,
      })
    : [];
  const byVersion = new Map();
  for (const c of comments) {
    const vid = relId(c.proofVersion);
    if (!byVersion.has(vid)) byVersion.set(vid, []);
    byVersion.get(vid).push(c);
  }
  return versions.map((v) => serializeVersion(v, byVersion.get(v.id) || [], viewer));
}

async function findTaskVersion(strapi, { orgId, taskId, versionId }) {
  const id = toId(versionId);
  if (!id) return null;
  const [row] = await strapi.entityService.findMany(VERSION_UID, {
    filters: { id, organization: { id: orgId }, task: { id: taskId } },
    populate: VERSION_POPULATE,
    limit: 1,
  });
  return row || null;
}

async function latestVersion(strapi, { orgId, taskId }) {
  const [row] = await strapi.entityService.findMany(VERSION_UID, {
    filters: { organization: { id: orgId }, task: { id: taskId } },
    fields: ['id', 'version', 'status'],
    sort: { version: 'desc' },
    limit: 1,
  });
  return row || null;
}

/** Version row + the task id it belongs to, scoped to the org. */
async function loadVersion(strapi, orgId, rawId) {
  const id = toId(rawId);
  if (!id) return null;
  const row = await strapi.entityService.findOne(VERSION_UID, id, {
    populate: { ...VERSION_POPULATE, organization: { fields: ['id'] }, task: { fields: ['id'] } },
  });
  if (!row || relId(row.organization) !== Number(orgId)) return null;
  return row;
}

// ── Activity + notifications ─────────────────────────────────────────────────

async function logTaskActivity(strapi, { orgId, taskId, actorUserId = null, summary, comment, meta = {} }) {
  try {
    await strapi.entityService.create(ACTIVITY_UID, {
      data: {
        organization: orgId,
        actor: actorUserId,
        action: 'comment',
        subjectType: 'task',
        subjectId: taskId,
        summary,
        meta: { comment, source: 'proofing', ...meta },
      },
    });
  } catch (e) {
    strapi.log.warn(`proofs: could not log activity on task ${taskId}: ${e?.message || e}`);
  }
}

/** Assignee, reporter and collaborators of the task; the project team when the task has none. */
async function proofRecipients(strapi, taskId) {
  const task = await strapi.entityService.findOne(TASK_UID, taskId, {
    fields: ['id'],
    populate: {
      assignee: { fields: ['id'] },
      assigner: { fields: ['id'] },
      collaborators: { fields: ['id'] },
      pendingCollaborators: { fields: ['id'] },
      projects: { fields: ['id'], populate: { projectManager: { fields: ['id'] }, teamMembers: { fields: ['id'] } } },
    },
  });
  const ids = taskStakeholderIds(task);
  if (ids.length) return ids;
  return [...new Set((task?.projects || []).flatMap((p) => projectStakeholderIds(p)))];
}

const proofHref = (taskId) => ({ app: 'pm', href: `/tasks/${taskId}?tab=proofs` });

async function notifyRequestChanges(strapi, { orgId, taskId, taskName, versionLabel, who, comment, actorUserId = null, skipUserIds = [] }) {
  const skip = new Set([Number(actorUserId), ...skipUserIds.map(Number)]);
  const userIds = (await proofRecipients(strapi, taskId)).filter((id) => !skip.has(Number(id)));
  await notifyUsers(strapi, {
    userIds,
    organizationId: orgId,
    type: 'task_updated',
    title: `${who} requested changes on ${versionLabel} of "${taskName}"`,
    message: comment || 'Open the proof to see the pinned comments.',
    data: { subjectType: 'task', subjectId: taskId, source: 'proofing', actorId: actorUserId, priority: 'urgent', ...proofHref(taskId) },
  });
}

// ── Writes ───────────────────────────────────────────────────────────────────

/**
 * Adds the next version to a task. Either `fileId` (fresh upload from /api/upload) or
 * `attachmentId` (a file already on the task) is required.
 * A new version of a client-visible deliverable asks the client to review again.
 */
async function createVersion(strapi, { orgId, task, userId, fileId, attachmentId, note }) {
  let attachment = null;
  if (attachmentId != null) {
    const id = toId(attachmentId);
    const row = id
      ? await strapi.entityService.findOne(ATTACHMENT_UID, id, { populate: { organization: { fields: ['id'] }, file: { fields: ['id', 'mime'] } } })
      : null;
    if (!row || relId(row.organization) !== Number(orgId) || row.subjectType !== 'task' || Number(row.subjectId) !== task.id) {
      throw new ProofError(404, 'File not found on this task');
    }
    attachment = row;
  } else if (fileId != null) {
    attachment = await createEntityAttachment(strapi, { organizationId: orgId, userId, subjectType: 'task', subjectId: task.id, fileId });
    if (!attachment) throw new ProofError(400, 'Invalid fileId');
  } else {
    throw new ProofError(400, 'fileId or attachmentId is required');
  }

  const last = await latestVersion(strapi, { orgId, taskId: task.id });
  const version = (last?.version || 0) + 1;
  const created = await strapi.entityService.create(VERSION_UID, {
    data: {
      version,
      kind: kindFromMime(attachment.file?.mime),
      note: text(note, MAX_NOTE) || null,
      status: 'in_review',
      task: task.id,
      attachment: attachment.id,
      uploadedBy: userId,
      organization: orgId,
    },
  });

  if (task.taskType === 'deliverable' && task.clientVisible === true) {
    await strapi.entityService.update(TASK_UID, task.id, {
      data: { clientApprovalStatus: 'pending', clientApprovalComment: null },
    });
  }

  const actor = await strapi.entityService.findOne('plugin::users-permissions.user', userId, { fields: ['username', 'email'] });
  const label = `v${version}`;
  await logTaskActivity(strapi, {
    orgId,
    taskId: task.id,
    actorUserId: userId,
    summary: `${userName(actor)} uploaded ${label} for review on task "${task.name}"`,
    comment: `Uploaded ${label} for review${note ? `: ${text(note, MAX_NOTE)}` : '.'}`,
    meta: { proofVersionId: created.id },
  });
  const recipients = (await proofRecipients(strapi, task.id)).filter((id) => id !== Number(userId));
  await notifyUsers(strapi, {
    userIds: recipients,
    organizationId: orgId,
    type: 'task_updated',
    title: `${label} of "${task.name}" is ready for review`,
    message: `${userName(actor)} uploaded a new version.`,
    data: { subjectType: 'task', subjectId: task.id, source: 'proofing', actorId: userId, ...proofHref(task.id) },
  });
  return created;
}

function readPin(input) {
  return {
    x: boundedNumber(input.x, 0, 100, 'x'),
    y: boundedNumber(input.y, 0, 100, 'y'),
    timestamp: boundedNumber(input.timestamp, 0, 24 * 60 * 60, 'timestamp'),
  };
}

/** A comment by a team user (`userId`) or a portal contact (`contact`). */
async function addComment(strapi, { orgId, taskId, taskName, version, input, userId = null, contact = null }) {
  const body = text(input.body, MAX_COMMENT);
  if (!body) throw new ProofError(400, 'Write a comment');
  const pin = readPin(input);
  if ((pin.x == null) !== (pin.y == null)) throw new ProofError(400, 'A pin needs both x and y');
  const internal = !contact && input.internal === true;

  const created = await strapi.entityService.create(COMMENT_UID, {
    data: {
      body,
      ...pin,
      internal,
      proofVersion: version.id,
      task: taskId,
      authorUser: contact ? null : userId,
      authorContact: contact ? contact.id : null,
      organization: orgId,
    },
    populate: COMMENT_POPULATE,
  });

  const label = `v${version.version}`;
  const where = pin.timestamp != null ? ` at ${formatTime(pin.timestamp)}` : '';
  const who = contact ? `${contactName(contact)} (client)` : userName(created.authorUser);
  await emitCommentNotifications(strapi, {
    organizationId: orgId,
    actorUserId: contact ? null : userId,
    actorName: who,
    subjectType: 'task',
    subjectId: taskId,
    entityName: `${label} of "${taskName}"${where}`,
    comment: body,
    stakeholderIds: await proofRecipients(strapi, taskId),
  });
  return created;
}

function formatTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Records approve / request-changes on a version. Only the latest version can be decided. */
async function decideVersion(strapi, { orgId, taskId, taskName, version, decision, comment, userId = null, contact = null, notify = true }) {
  if (!['approve', 'request_changes'].includes(decision)) throw new ProofError(400, 'decision must be approve or request_changes');
  const note = text(comment, MAX_COMMENT);
  if (decision === 'request_changes' && !note) throw new ProofError(400, 'Say what should change');
  const last = await latestVersion(strapi, { orgId, taskId });
  if (!last || last.id !== version.id) throw new ProofError(409, 'Only the latest version can be approved or sent back');

  const status = decision === 'approve' ? 'approved' : 'changes_requested';
  await strapi.entityService.update(VERSION_UID, version.id, {
    data: {
      status,
      decisionComment: note || null,
      decidedAt: new Date(),
      decidedByUser: contact ? null : userId,
      decidedByContact: contact ? contact.id : null,
    },
  });

  const label = `v${version.version}`;
  if (!contact) {
    const actor = await strapi.entityService.findOne('plugin::users-permissions.user', userId, { fields: ['username', 'email'] });
    const who = userName(actor);
    await logTaskActivity(strapi, {
      orgId,
      taskId,
      actorUserId: userId,
      summary: `${who} ${status === 'approved' ? 'approved' : 'requested changes on'} ${label} of task "${taskName}"`,
      comment: `${status === 'approved' ? 'Approved' : 'Requested changes on'} ${label}${note ? `: ${note}` : '.'}`,
      meta: { proofVersionId: version.id },
    });
    if (notify && status === 'changes_requested') {
      await notifyRequestChanges(strapi, { orgId, taskId, taskName, versionLabel: label, who, comment: note, actorUserId: userId });
    }
  }
  return status;
}

module.exports = {
  VERSION_UID,
  COMMENT_UID,
  ProofError,
  toId,
  kindFromMime,
  boundedNumber,
  formatTime,
  loadTaskForTeam,
  listTaskProofs,
  findTaskVersion,
  latestVersion,
  loadVersion,
  createVersion,
  addComment,
  decideVersion,
  notifyRequestChanges,
  proofRecipients,
  serializeComment,
};
