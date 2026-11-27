'use strict';

/**
 * W13 public intake endpoints. No login: the channel secret (URL or inbound address) identifies the channel.
 * SaaS only. The org must have Fudge Work with full access. Submitted content is untrusted plain text.
 * Env: RESEND_INBOUND_WEBHOOK_SECRET (whsec_…), INTAKE_EMAIL_DOMAIN, RESEND_API_KEY (fetch body/attachments),
 *      INTAKE_FORM_IP_LIMIT_PER_MIN (10), INTAKE_CHANNEL_LIMIT_PER_HOUR (200).
 */

const { isSaas } = require('../../../utils/platform');
const { getOrgAccess } = require('../../../utils/saas-access');
const { hit } = require('../../../utils/lead-capture/rate-limit');
const { normalizeFields, validateSubmission, looksLikeBot, buildFormTaskDraft } = require('../../../utils/intake/forms');
const { verifySvixSignature, extractIntakeSecret, isAutoReply, buildEmailTaskDraft } = require('../../../utils/intake/email');
const { CHANNEL_UID, createTaskFromIntake, storeTaskAttachments, MAX_ATTACHMENT_BYTES } = require('../../../utils/intake/create-task');

const SECRET_RE = /^[a-f0-9]{24}$/;
const POPULATE = {
  organization: { fields: ['id'] },
  project: { fields: ['id', 'name'] },
  taskList: { fields: ['id'] },
  assignee: { fields: ['id'] },
};

function clientIp(ctx) {
  const fwd = String(ctx.request.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return (fwd || ctx.request.ip || '').slice(0, 64);
}

function send(ctx, status, body) {
  ctx.set('Cache-Control', 'no-store');
  ctx.status = status;
  ctx.body = body;
}

async function findChannel(secret, channel) {
  if (!SECRET_RE.test(String(secret || ''))) return null;
  const [row] = await strapi.entityService.findMany(CHANNEL_UID, {
    filters: { secret, channel, enabled: true },
    populate: POPULATE,
    limit: 1,
  });
  if (!row || !row.project?.id || !row.organization?.id) return null;
  const access = await getOrgAccess(strapi, row.organization.id);
  if ((access?.pm?.access || 'none') !== 'full') return null;
  return row;
}

const channelLimit = () => Number(process.env.INTAKE_CHANNEL_LIMIT_PER_HOUR) || 200;
const ipLimit = () => Number(process.env.INTAKE_FORM_IP_LIMIT_PER_MIN) || 10;

async function resend(pathname) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://api.resend.com${pathname}`, { headers: { Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Resend ${pathname} → ${res.status}`);
  return res.json();
}

async function downloadCapped(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  if (Number(res.headers.get('content-length')) > MAX_ATTACHMENT_BYTES) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  return buf.length > MAX_ATTACHMENT_BYTES ? null : buf;
}

module.exports = {
  async getForm(ctx) {
    if (!isSaas()) return ctx.notFound();
    const row = await findChannel(ctx.params.secret, 'form');
    if (!row) return send(ctx, 404, { error: { message: 'This form is not available.' } });
    const s = row.settings || {};
    send(ctx, 200, {
      data: {
        name: row.name,
        projectName: row.project.name,
        intro: String(s.intro || '').slice(0, 2000),
        fields: normalizeFields(row.fields),
      },
    });
  },

  async submitForm(ctx) {
    if (!isSaas()) return ctx.notFound();
    const ip = clientIp(ctx);
    const ipHit = hit(`intake-ip:${ip}`, ipLimit(), 60000);
    if (!ipHit.allowed) {
      ctx.set('Retry-After', String(ipHit.retryAfterSec));
      return send(ctx, 429, { error: { message: 'Too many submissions. Please try again in a minute.' } });
    }
    const row = await findChannel(ctx.params.secret, 'form');
    if (!row) return send(ctx, 404, { error: { message: 'This form is not available.' } });

    const body = ctx.request.body || {};
    // Bots get a normal-looking success so they do not learn to adapt.
    if (looksLikeBot(body)) return send(ctx, 200, { data: { ok: true } });

    const chHit = hit(`intake-ch:${row.id}`, channelLimit(), 3600000);
    if (!chHit.allowed) return send(ctx, 429, { error: { message: 'This form is receiving too many requests. Please try later.' } });

    const fields = normalizeFields(row.fields);
    const v = validateSubmission(fields, body);
    if (!v.ok) return send(ctx, 400, { error: { message: 'Please fix the highlighted fields.', details: { errors: v.errors } } });

    await createTaskFromIntake(strapi, row, buildFormTaskDraft(row, fields, v));
    send(ctx, 200, { data: { ok: true, message: String(row.settings?.successMessage || 'Thanks! Your request was received.').slice(0, 500) } });
  },

  /** Resend inbound (event "email.received"). 2xx for anything we handled or ignore, so Resend does not retry. */
  async resendInbound(ctx) {
    if (!isSaas()) return ctx.notFound();
    const raw = ctx.request.body?.[Symbol.for('unparsedBody')];
    if (!verifySvixSignature(raw, ctx.request.headers, process.env.RESEND_INBOUND_WEBHOOK_SECRET)) {
      strapi.log.warn('[intake] Resend webhook rejected: bad or missing Svix signature');
      return send(ctx, 401, { ok: false });
    }
    let payload;
    try {
      payload = JSON.parse(String(raw));
    } catch (_) {
      return send(ctx, 400, { ok: false });
    }
    if (payload?.type !== 'email.received') return send(ctx, 200, { ok: true, ignored: 'event' });
    const data = payload.data || {};
    const emailId = String(data.email_id || data.id || '');

    const secret = extractIntakeSecret([...(data.to || []), ...(data.cc || [])], process.env.INTAKE_EMAIL_DOMAIN);
    const row = secret && (await findChannel(secret, 'email'));
    if (!row) return send(ctx, 200, { ok: true, ignored: 'no channel' });
    if (emailId && !hit(`intake-email:${emailId}`, 1, 86400000).allowed) return send(ctx, 200, { ok: true, ignored: 'duplicate' });
    if (!hit(`intake-ch:${row.id}`, channelLimit(), 3600000).allowed) return send(ctx, 200, { ok: true, ignored: 'rate limited' });

    let full = null;
    try {
      full = emailId ? await resend(`/emails/receiving/${encodeURIComponent(emailId)}`) : null;
    } catch (err) {
      strapi.log.warn(`[intake] could not fetch email body: ${err.message}`);
    }
    if (isAutoReply(full?.headers || {})) return send(ctx, 200, { ok: true, ignored: 'auto reply' });

    const allowed = (row.settings?.allowedSenderDomains || []).map((d) => String(d).toLowerCase());
    const draft = buildEmailTaskDraft({
      from: data.from || full?.from,
      subject: data.subject ?? full?.subject,
      text: full?.text,
      html: full?.html,
      attachments: data.attachments || [],
    });
    if (allowed.length && !allowed.includes(draft.sender.email.split('@')[1])) {
      return send(ctx, 200, { ok: true, ignored: 'sender not allowed' });
    }

    const task = await createTaskFromIntake(strapi, row, draft);

    if ((data.attachments || []).length && emailId) {
      try {
        const list = await resend(`/emails/receiving/${encodeURIComponent(emailId)}/attachments`);
        const files = (list?.data || [])
          .filter((a) => a.download_url && !(Number(a.size) > MAX_ATTACHMENT_BYTES))
          .map((a) => ({ filename: a.filename, contentType: a.content_type, download: () => downloadCapped(a.download_url) }));
        await storeTaskAttachments(strapi, { orgId: row.organization.id, taskId: task.id, files });
      } catch (err) {
        strapi.log.warn(`[intake] attachments skipped: ${err.message}`);
      }
    }
    send(ctx, 200, { ok: true, taskId: task.id });
  },
};
