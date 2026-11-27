'use strict';

/**
 * W17: the outbound AI action that sends a weekly status report. Registered on the shared action
 * runner from utils/ai/actions.js. Outbound, so it only runs when a person approves it (one click on
 * the Weekly updates page, or Approve in the AI approval queue); it runs as that person.
 */

const { canAccess, isPmOrgAdminRole, isPmOrgManagerRole } = require('../rbac');

const relId = (v) => (v && typeof v === 'object' ? v.id ?? null : v ?? null);

/** May send a project's updates: org admin/manager, PM projects write, or the project's manager — and can see the project. */
async function canSendForProject(strapi, actor, projectId) {
  if (actor?.system) return true; // the Friday run proposes on behalf of the PM; approval re-checks the approver
  if (!actor?.id || !actor.ctx?.state) return false;
  const ctx = { state: { ...actor.ctx.state, orgId: actor.orgId, user: actor.ctx.state.user || { id: actor.id } } };
  const { loadProjectForAccess } = require('../workspaces');
  const project = await loadProjectForAccess(strapi, ctx, projectId);
  if (!project) return false;
  if (isPmOrgAdminRole(ctx) || isPmOrgManagerRole(ctx) || canAccess(ctx, 'pm', 'projects', 'write')) return true;
  return String(relId(project.projectManager)) === String(actor.id);
}

function register(r, strapi) {
  r.define({
    key: 'work.status_report.send',
    label: 'send a weekly project update',
    outbound: true,
    permission: (actor, input) => canSendForProject(strapi, actor, input.projectId),
    describe: (input) => `Weekly ${input.audience} update "${input.subject}" to ${input.to}`,
    async execute(input, { orgId, actor }) {
      const { REPORT_UID, reportStatus } = require('./index');
      const { getChannel } = require('./channels');
      const report = await strapi.entityService.findOne(REPORT_UID, Number(input.reportId), { populate: { organization: { fields: ['id'] }, project: { fields: ['id', 'name'] } } });
      if (!report || String(relId(report.organization)) !== String(orgId)) throw new Error('Status report not found.');
      const recipients = Array.isArray(input.recipients) ? input.recipients.filter(Boolean) : [];
      if (!recipients.length) throw new Error('Add at least one recipient first.');
      const channel = getChannel(input.channel);
      if (!channel.available) throw Object.assign(new Error(channel.reason), { code: 'CHANNEL_UNAVAILABLE' });

      const out = await channel.send({ to: recipients, subject: input.subject, body: input.body });

      const versions = { ...(report.versions || {}) };
      versions[input.audience] = {
        ...(versions[input.audience] || {}),
        subject: input.subject,
        body: input.body,
        recipients,
        channel: channel.key,
        state: 'sent',
        sentAt: new Date().toISOString(),
        sentById: actor?.id ?? null,
        delivered: out.delivered,
        deliveryNote: out.note || null,
      };
      await strapi.entityService.update(REPORT_UID, report.id, { data: { versions, status: reportStatus(versions) } });
      return {
        result: { delivered: out.delivered, sent: out.sent, failed: out.failed, note: out.note || null, channel: channel.key },
        subject: { type: 'project', id: relId(report.project) },
        summary: `Sent the weekly ${input.audience} update for "${report.project?.name || 'project'}" to ${recipients.length} recipient(s) by ${channel.label.toLowerCase()}`,
      };
    },
  });
}

module.exports = { register, canSendForProject };
