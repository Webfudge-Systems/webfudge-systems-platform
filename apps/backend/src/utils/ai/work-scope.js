'use strict';

/**
 * Scope-creep watcher (ticket W19, SaaS, plan feature pm.scope_watch), built on the P5 foundation.
 *
 * SOW      = the project's statement of work: pasted text, or a file attached to the project
 *            (Files tab → entity-attachment). Text files are read as text; PDFs are sent to the
 *            model as a document. Stored per project in api::scope-watch.project-scope.
 * Requests = what the client asked for:
 *              - tasks raised from the client portal (W10, task.clientRequestedBy) or tagged
 *                client-request / intake
 *              - client comments from the portal (crm-activity comments with meta.source client_portal,
 *                including "request changes" on deliverables)
 *              - any task a team member asks to check
 * Check    = one classify call for a batch of unchecked requests (work.scope_check). Each verdict is
 *            stored in api::scope-watch.scope-check. For out_of_scope ones a change order email is
 *            drafted (work.change_order) and proposed as the outbound action
 *            work.project.send_change_order, so it waits in the AI approval queue until a person
 *            approves (then it is emailed to the client) or rejects it.
 */

const fs = require('node:fs/promises');
const path = require('node:path');
const { renderTemplate, generateObject, normalizeLanguage, AiError } = require('@webfudge/ai');
const ai = require('./index');
const { canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../rbac');

const PROJECT_UID = 'api::project.project';
const TASK_UID = 'api::task.task';
const SCOPE_UID = 'api::scope-watch.project-scope';
const CHECK_UID = 'api::scope-watch.scope-check';
const ATTACHMENT_UID = 'api::entity-attachment.entity-attachment';
const ACTIVITY_UID = 'api::crm-activity.crm-activity';
const ACTION_KEY = 'work.project.send_change_order';
const MAX_BATCH = 10;
const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;
const TEXT_TYPES = /^(text\/|application\/(json|xml|markdown|x-markdown|csv|rtf))/i;
const TEXT_EXT = /\.(txt|md|markdown|csv|json|xml|html?|rtf)$/i;

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);
const clip = (s, n) => String(s || '').trim().slice(0, n);
const contactName = (c) => [c?.firstName, c?.lastName].filter(Boolean).join(' ').trim() || c?.email || 'Client';

function scopeError(message, code = 'SCOPE_SOW_MISSING', status = 400) {
  return new AiError(message, { code, status });
}

/** Same rule as editing a project in Work: PM admin / manager, projects write or manage, or its project manager. */
async function canEditProject(strapi, actor, projectId) {
  const ctx = actor.ctx;
  if (isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'pm', 'projects', 'write')) return true;
  const p = await strapi.entityService.findOne(PROJECT_UID, Number(projectId), { fields: ['id'], populate: { organization: { fields: ['id'] }, projectManager: { fields: ['id'] } } });
  return Boolean(p && String(relId(p.organization)) === String(actor.orgId) && actor.id && String(relId(p.projectManager)) === String(actor.id));
}

// ---------- SOW ----------

async function getScopeRow(strapi, orgId, projectId) {
  const rows = await strapi.entityService.findMany(SCOPE_UID, { filters: { organization: orgId, project: projectId }, sort: { id: 'desc' }, limit: 1 });
  return rows[0] || null;
}

async function projectAttachment(strapi, orgId, projectId, attachmentId) {
  const row = await strapi.entityService.findOne(ATTACHMENT_UID, Number(attachmentId), { populate: { file: true, organization: { fields: ['id'] } } });
  if (!row || String(relId(row.organization)) !== String(orgId) || row.subjectType !== 'project' || Number(row.subjectId) !== Number(projectId)) return null;
  return row;
}

async function readFileBytes(strapi, file) {
  const url = file?.url;
  if (!url) throw scopeError('The SOW file has no address.');
  if (/^https?:\/\//i.test(url)) {
    const res = await fetch(url);
    if (!res.ok) throw scopeError(`Could not download the SOW file (${res.status}).`, 'SCOPE_SOW_UNREADABLE');
    return Buffer.from(await res.arrayBuffer());
  }
  const publicDir = strapi.dirs?.static?.public || path.join(process.cwd(), 'public');
  const full = path.resolve(publicDir, `.${url.startsWith('/') ? url : `/${url}`}`);
  if (!full.startsWith(path.resolve(publicDir))) throw scopeError('Invalid SOW file path.', 'SCOPE_SOW_UNREADABLE');
  return fs.readFile(full);
}

/**
 * Resolves the SOW for the model: { kind: 'text', text, label } or { kind: 'pdf', base64, label }.
 * Pasted text wins over the file when both are set (the person typed it on purpose).
 */
async function loadSow(strapi, orgId, projectId) {
  const row = await getScopeRow(strapi, orgId, projectId);
  if (row?.sowText && row.sowText.trim()) return { kind: 'text', text: row.sowText, label: 'Pasted SOW text', row };
  if (!row?.sowAttachmentId) throw scopeError('Add the statement of work first: paste its text or pick a file from the project files.');
  const att = await projectAttachment(strapi, orgId, projectId, row.sowAttachmentId);
  if (!att?.file) throw scopeError('The SOW file was removed from the project. Pick it again or paste the text.');
  const file = att.file;
  const name = att.fileName || file.name || 'SOW';
  const mime = String(file.mime || '');
  const sizeBytes = Number(file.size || 0) * 1024; // Strapi stores size in KB
  if (mime === 'application/pdf' || /\.pdf$/i.test(name)) {
    if (sizeBytes > MAX_PDF_BYTES) throw scopeError('The SOW PDF is larger than 10 MB. Paste the relevant text instead.', 'SCOPE_SOW_UNREADABLE');
    const bytes = await readFileBytes(strapi, file);
    return { kind: 'pdf', base64: bytes.toString('base64'), label: name, row };
  }
  if (TEXT_TYPES.test(mime) || TEXT_EXT.test(name)) {
    if (sizeBytes > MAX_TEXT_BYTES) throw scopeError('The SOW file is too large. Paste the relevant text instead.', 'SCOPE_SOW_UNREADABLE');
    const bytes = await readFileBytes(strapi, file);
    return { kind: 'text', text: bytes.toString('utf8'), label: name, row };
  }
  throw scopeError(`Fudge AI can read SOWs as PDF or text files. "${name}" is neither: upload a PDF or paste the text.`, 'SCOPE_SOW_UNREADABLE');
}

// ---------- requests ----------

/**
 * Client requests in the project that have not been checked yet (or the given task, always).
 * Returns [{ sourceKey, sourceType, taskId, requestedBy, title, text, raisedAt }]
 */
async function collectRequests(strapi, orgId, projectId, { taskId, force = false } = {}) {
  const checked = new Set(
    (await strapi.entityService.findMany(CHECK_UID, { filters: { organization: orgId, project: projectId }, fields: ['sourceKey'], limit: 5000 })).map((c) => c.sourceKey)
  );
  const out = [];

  if (taskId) {
    const t = await strapi.entityService.findOne(TASK_UID, Number(taskId), {
      fields: ['id', 'name', 'description', 'createdAt'],
      populate: { organization: { fields: ['id'] }, projects: { fields: ['id'] }, clientRequestedBy: { fields: ['id', 'firstName', 'lastName', 'email'] } },
    });
    if (!t || String(relId(t.organization)) !== String(orgId) || !(t.projects || []).some((p) => Number(p.id) === Number(projectId))) {
      throw new AiError('Task not found in this project.', { code: 'AI_SUBJECT_NOT_FOUND', status: 404 });
    }
    const key = `task:${t.id}`;
    if (force || !checked.has(key)) {
      out.push({ sourceKey: key, sourceType: t.clientRequestedBy ? 'client_request' : 'task', taskId: t.id, requestedBy: t.clientRequestedBy || null, title: t.name, text: clip(t.description, 3000), raisedAt: t.createdAt });
    }
    return out;
  }

  const tasks = await strapi.entityService.findMany(TASK_UID, {
    filters: { organization: orgId, projects: { id: projectId }, status: { $ne: 'CANCELLED' } },
    fields: ['id', 'name', 'description', 'tags', 'createdAt'],
    populate: { clientRequestedBy: { fields: ['id', 'firstName', 'lastName', 'email'] } },
    sort: { createdAt: 'desc' },
    limit: 2000,
  });
  const taskById = new Map(tasks.map((t) => [Number(t.id), t]));
  for (const t of tasks) {
    const tags = Array.isArray(t.tags) ? t.tags.map((x) => String(x).toLowerCase()) : [];
    const isRequest = Boolean(t.clientRequestedBy) || tags.includes('client-request') || tags.includes('intake');
    const key = `task:${t.id}`;
    if (!isRequest || checked.has(key)) continue;
    out.push({ sourceKey: key, sourceType: 'client_request', taskId: t.id, requestedBy: t.clientRequestedBy || null, title: t.name, text: clip(t.description, 3000), raisedAt: t.createdAt });
  }

  if (taskById.size) {
    const comments = await strapi.entityService.findMany(ACTIVITY_UID, {
      filters: { organization: orgId, action: 'comment', subjectType: 'task', subjectId: { $in: [...taskById.keys()] } },
      fields: ['id', 'subjectId', 'summary', 'meta', 'createdAt'],
      sort: { createdAt: 'desc' },
      limit: 500,
    });
    for (const c of comments) {
      if (c.meta?.source !== 'client_portal' || !c.meta?.comment) continue;
      const key = `comment:${c.id}`;
      if (checked.has(key)) continue;
      const t = taskById.get(Number(c.subjectId));
      out.push({
        sourceKey: key,
        sourceType: 'change_request',
        taskId: t?.id || null,
        requestedBy: c.meta.clientContactId ? { id: c.meta.clientContactId, firstName: c.meta.clientName || null } : null,
        title: `Comment on "${t?.name || `task #${c.subjectId}`}"`,
        text: clip(c.meta.comment, 3000),
        raisedAt: c.createdAt,
      });
    }
  }

  return out.sort((a, b) => String(b.raisedAt).localeCompare(String(a.raisedAt))).slice(0, MAX_BATCH);
}

// ---------- check ----------

function messagesFor(sow, prompt) {
  if (sow.kind !== 'pdf') return null;
  return [
    {
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: sow.base64 }, title: sow.label },
        { type: 'text', text: prompt },
      ],
    },
  ];
}

async function clientEmail(strapi, orgId, requestedBy) {
  const id = relId(requestedBy);
  if (!id) return null;
  const c = await strapi.entityService.findOne('api::contact.contact', Number(id), { fields: ['id', 'email', 'firstName', 'lastName'], populate: { organization: { fields: ['id'] } } });
  if (!c || String(relId(c.organization)) !== String(orgId)) return null;
  return c;
}

/**
 * Checks unchecked client requests (or one task) against the SOW and drafts change orders for the
 * out-of-scope ones. Returns { checked: [...scope-check rows], drafted, creditsUsed }.
 */
async function checkProjectScope(strapi, ctx, projectId, { taskId, force, language } = {}) {
  const { getActionRunner, actorFromCtx, assertAllowed } = require('./actions');
  const orgId = ctx.state.orgId;
  const actor = actorFromCtx(ctx);
  const project = await strapi.entityService.findOne(PROJECT_UID, Number(projectId), {
    fields: ['id', 'name', 'hourlyRate', 'currency'],
    populate: { clientAccount: { fields: ['id', 'companyName'] } },
  });
  if (!project) throw new AiError('Project not found.', { code: 'AI_SUBJECT_NOT_FOUND', status: 404 });
  // Drafting change orders needs project edit rights; check before spending credits.
  await assertAllowed(strapi, ACTION_KEY, actor, { projectId: project.id });

  const sow = await loadSow(strapi, orgId, project.id);
  const requests = await collectRequests(strapi, orgId, project.id, { taskId, force });
  if (!requests.length) return { checked: [], drafted: 0, creditsUsed: 0, message: 'No new client requests to check.' };

  const lang = normalizeLanguage(language);
  const projectInfo = { name: project.name, client: project.clientAccount?.companyName || null };
  const t = renderTemplate(
    'work.scope_check',
    { project: projectInfo, sowText: sow.kind === 'text' ? sow.text : null, requests: requests.map((r) => ({ requestId: r.sourceKey, title: r.title, details: r.text || '' })) },
    { language: lang }
  );
  const client = ai.clientFor(strapi, ctx);
  const messages = messagesFor(sow, t.prompt);
  const out = await generateObject(client, { ...t, ...(messages ? { messages, prompt: undefined } : {}), feature: 'work.scope_check', metadata: { subjectType: 'project', subjectId: project.id } });
  let creditsUsed = out.credits || 0;
  const verdicts = new Map((out.object.results || []).map((r) => [String(r.requestId), r]));

  const rate = project.hourlyRate ? { amount: Number(project.hourlyRate), currency: project.currency || 'INR' } : null;
  const checked = [];
  let drafted = 0;
  for (const req of requests) {
    const v = verdicts.get(req.sourceKey) || { verdict: 'unclear', confidence: 'low', reason: 'Fudge AI did not return a verdict for this request.', sowReference: '', estimateHours: 0 };
    // A re-check replaces the earlier verdict for the same source (only possible with force).
    const old = await strapi.entityService.findMany(CHECK_UID, { filters: { organization: orgId, project: project.id, sourceKey: req.sourceKey }, fields: ['id'], limit: 5 });
    for (const o of old) await strapi.entityService.delete(CHECK_UID, o.id);
    let row = await strapi.entityService.create(CHECK_UID, {
      data: {
        organization: orgId,
        project: project.id,
        task: req.taskId || null,
        requestedBy: relId(req.requestedBy) || null,
        sourceType: req.sourceType,
        sourceKey: req.sourceKey,
        requestTitle: clip(req.title, 250),
        requestText: req.text || null,
        verdict: v.verdict,
        confidence: v.confidence,
        reason: clip(v.reason, 2000),
        sowReference: clip(v.sowReference, 2000) || null,
        estimateHours: Number.isFinite(Number(v.estimateHours)) && Number(v.estimateHours) > 0 ? Math.round(Number(v.estimateHours) * 10) / 10 : null,
        model: out.model || null,
        checkedBy: actor.id,
      },
    });

    if (v.verdict === 'out_of_scope') {
      const contact = await clientEmail(strapi, orgId, req.requestedBy);
      const ct = renderTemplate(
        'work.change_order',
        { project: projectInfo, request: { title: req.title, details: req.text, from: contact ? contactName(contact) : null }, check: v, rate, senderName: ctx.state.user?.firstName || ctx.state.user?.username },
        { language: lang }
      );
      const draft = await generateObject(client, { ...ct, feature: 'work.change_order', metadata: { subjectType: 'project', subjectId: project.id } });
      creditsUsed += draft.credits || 0;
      const action = await getActionRunner(strapi).propose({
        key: ACTION_KEY,
        actor,
        orgId,
        input: {
          projectId: project.id,
          taskId: req.taskId || null,
          scopeCheckId: row.id,
          to: contact?.email || null,
          subject: draft.object.subject,
          body: draft.object.body,
          title: draft.object.title,
          estimateHours: draft.object.estimateHours || row.estimateHours || null,
          language: ct.language,
        },
        feature: 'work.change_order',
        subject: req.taskId ? { type: 'task', id: req.taskId } : { type: 'project', id: project.id },
        aiMeta: { model: draft.model, credits: draft.credits },
      });
      row = await strapi.entityService.update(CHECK_UID, row.id, { data: { aiActionId: action.id } });
      drafted += 1;
    }
    checked.push(row);
  }
  if (sow.row) await strapi.entityService.update(SCOPE_UID, sow.row.id, { data: { lastCheckedAt: new Date() } });
  return { checked, drafted, creditsUsed };
}

// ---------- action ----------

function registerScopeActions(r, strapi) {
  // Outbound: the change order goes to the client, so it always waits for a person to approve it.
  r.define({
    key: ACTION_KEY,
    label: 'send a change order to the client',
    outbound: true,
    permission: (actor, input) => canEditProject(strapi, actor, input.projectId),
    describe: (input) => `Change order: ${input.title || input.subject}${input.to ? ` → ${input.to}` : ''}`,
    async execute(input, { orgId, actor }) {
      const project = await strapi.entityService.findOne(PROJECT_UID, Number(input.projectId), { fields: ['id', 'name'], populate: { organization: { fields: ['id'] } } });
      if (!project || String(relId(project.organization)) !== String(orgId)) throw new Error('Project not found.');
      let delivered = false;
      if (input.to) {
        const { sendMail, escapeHtml } = require('../mailer');
        const html = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6">${escapeHtml(input.body).replace(/\n/g, '<br>')}</div>`;
        const sent = await sendMail({ to: input.to, subject: input.subject, text: input.body, html });
        if (!sent.sent && process.env.RESEND_API_KEY) throw new Error('The email provider did not accept the message.');
        delivered = Boolean(sent.sent);
      }
      if (input.taskId) {
        try {
          await strapi.entityService.create(ACTIVITY_UID, {
            data: {
              organization: orgId,
              actor: actor?.id ?? null,
              action: 'comment',
              subjectType: 'task',
              subjectId: Number(input.taskId),
              summary: `Change order "${input.title || input.subject}" approved${input.to ? ` and sent to ${input.to}` : ''}`,
              meta: { comment: input.body, source: 'scope_watch', changeOrder: true, estimateHours: input.estimateHours ?? null },
            },
          });
        } catch (err) {
          strapi.log.warn(`[scope-watch] could not log change order on task ${input.taskId}: ${err.message}`);
        }
      }
      return {
        result: { delivered, to: input.to || null, needsManualSend: !input.to },
        subject: input.taskId ? { type: 'task', id: Number(input.taskId) } : { type: 'project', id: project.id },
        summary: `Change order "${input.title || input.subject}" for ${project.name}${input.to ? ` sent to ${input.to}` : ' approved (no client email on file)'}`,
      };
    },
  });
}

module.exports = { checkProjectScope, loadSow, collectRequests, registerScopeActions, canEditProject, getScopeRow, projectAttachment, SCOPE_UID, CHECK_UID, ACTION_KEY };
