'use strict';

/**
 * W13: the one place every intake channel turns a draft ({ name, description, tags }) into a task, plus
 * (email) storing attachments as task files. Attachments are untrusted: size-capped, kept as files only.
 */

const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const TASK_UID = 'api::task.task';
const CHANNEL_UID = 'api::intake-channel.intake-channel';
const ATTACHMENT_UID = 'api::entity-attachment.entity-attachment';
const PRIORITIES = ['low', 'medium', 'high'];

const MAX_ATTACHMENTS = 10;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const rel = (v) => (v && typeof v === 'object' ? v.id : v) || undefined;

async function createTaskFromIntake(strapi, channel, draft, at = new Date()) {
  const priority = PRIORITIES.includes(channel.settings?.priority) ? channel.settings.priority : 'medium';
  const data = {
    name: String(draft.name || 'Intake request').slice(0, 255),
    description: draft.description || '',
    status: 'SCHEDULED',
    priority,
    tags: draft.tags || ['intake'],
    organization: rel(channel.organization),
    projects: rel(channel.project) ? [rel(channel.project)] : [],
    taskList: rel(channel.taskList),
  };
  const assignee = rel(channel.assignee);
  if (assignee) data.assignee = assignee;
  const task = await strapi.entityService.create(TASK_UID, { data });
  await strapi.entityService.update(CHANNEL_UID, channel.id, {
    data: { submissionCount: (Number(channel.submissionCount) || 0) + 1, lastSubmissionAt: at.toISOString() },
  });
  return task;
}

function safeFileName(name) {
  const base = path.basename(String(name || 'attachment')).replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  return base || 'attachment';
}

/**
 * files: [{ filename, contentType, download: async () => Buffer }]. Returns how many were stored.
 * Failures are logged and skipped: a broken attachment must not lose the task.
 */
async function storeTaskAttachments(strapi, { orgId, taskId, files }) {
  let stored = 0;
  const uploader = strapi.plugin('upload').service('upload');
  for (const f of (files || []).slice(0, MAX_ATTACHMENTS)) {
    const name = safeFileName(f.filename);
    const tmp = path.join(os.tmpdir(), `intake-${crypto.randomBytes(8).toString('hex')}`);
    try {
      const buf = await f.download();
      if (!buf || buf.length > MAX_ATTACHMENT_BYTES) continue;
      await fs.writeFile(tmp, buf);
      const [file] = await uploader.upload({
        data: { fileInfo: { name, caption: 'Email intake attachment' } },
        files: { filepath: tmp, originalFilename: name, mimetype: String(f.contentType || 'application/octet-stream'), size: buf.length },
      });
      if (!file) continue;
      await strapi.entityService.create(ATTACHMENT_UID, {
        data: { subjectType: 'task', subjectId: taskId, file: file.id, fileName: name, organization: orgId, source: 'files_tab' },
      });
      stored += 1;
    } catch (err) {
      strapi.log.warn(`[intake] attachment "${name}" skipped: ${err.message}`);
    } finally {
      fs.unlink(tmp).catch(() => {});
    }
  }
  return stored;
}

module.exports = { TASK_UID, CHANNEL_UID, createTaskFromIntake, storeTaskAttachments, MAX_ATTACHMENT_BYTES };
