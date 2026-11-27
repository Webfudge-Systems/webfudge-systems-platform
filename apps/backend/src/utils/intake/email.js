'use strict';

/**
 * W13 email-to-task: Resend inbound helpers. Resend signs webhooks with Svix:
 *   HMAC-SHA256(base64decode(secret without "whsec_"), `${svix-id}.${svix-timestamp}.${rawBody}`), base64,
 *   sent as space-separated "v1,<sig>" entries in svix-signature.
 * Email content is untrusted: we only ever keep plain text, capped in length.
 */

const crypto = require('node:crypto');

const TOLERANCE_SEC = 5 * 60;
const MAX_BODY = 20000;
const SECRET_RE = /^[a-f0-9]{24}$/;

function header(headers, name) {
  if (!headers) return '';
  const v = headers[name] ?? headers[name.toLowerCase()] ?? Object.entries(headers).find(([k]) => k.toLowerCase() === name)?.[1];
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
}

function verifySvixSignature(rawBody, headers, secret, nowMs = Date.now()) {
  if (!secret || rawBody == null) return false;
  const id = header(headers, 'svix-id');
  const ts = header(headers, 'svix-timestamp');
  const sigs = header(headers, 'svix-signature');
  if (!id || !ts || !sigs) return false;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(nowMs / 1000 - tsNum) > TOLERANCE_SEC) return false;
  const key = Buffer.from(String(secret).replace(/^whsec_/, ''), 'base64');
  const expected = crypto.createHmac('sha256', key).update(`${id}.${ts}.${String(rawBody)}`).digest();
  return sigs.split(' ').some((entry) => {
    const [version, sig] = entry.split(',');
    if (version !== 'v1' || !sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && crypto.timingSafeEqual(got, expected);
  });
}

function parseFrom(value) {
  const s = String(value || '').trim();
  const m = s.match(/^(.*)<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim().replace(/^"|"$/g, ''), email: m[2].trim().toLowerCase() };
  return { name: '', email: s.toLowerCase() };
}

/** Recipients look like `task-<24 hex>@<INTAKE_EMAIL_DOMAIN>`. */
function extractIntakeSecret(recipients, domain) {
  const dom = String(domain || '').trim().toLowerCase();
  if (!dom) return null;
  for (const r of Array.isArray(recipients) ? recipients : [recipients]) {
    const { email } = parseFrom(r);
    const at = email.lastIndexOf('@');
    if (at < 0 || email.slice(at + 1) !== dom) continue;
    const local = email.slice(0, at);
    if (!local.startsWith('task-')) continue;
    const secret = local.slice(5);
    if (SECRET_RE.test(secret)) return secret;
  }
  return null;
}

const ENTITIES = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };

function htmlToText(html) {
  return String(html || '')
    .replace(/<(script|style|head)[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e])
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isAutoReply(headers) {
  const auto = header(headers, 'auto-submitted').toLowerCase();
  if (auto && auto !== 'no') return true;
  const prec = header(headers, 'precedence').toLowerCase();
  return ['bulk', 'junk', 'list', 'auto_reply'].includes(prec);
}

function buildEmailTaskDraft({ from, subject, text, html, attachments = [] }) {
  const sender = parseFrom(from);
  const subj = String(subject || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  const body = (String(text || '').trim() || htmlToText(html)).slice(0, MAX_BODY);
  const senderLine = sender.name ? `${sender.name} <${sender.email}>` : sender.email;
  const lines = [`From: ${senderLine}`, `Subject: ${subj || '(no subject)'}`, '', body];
  if (attachments.length) lines.push('', `Attachments: ${attachments.map((a) => a.filename || 'file').join(', ')}`);
  return { name: subj || `Email from ${sender.email}`.slice(0, 200), description: lines.join('\n').trim(), tags: ['intake', 'intake:email'], sender };
}

module.exports = { verifySvixSignature, parseFrom, extractIntakeSecret, htmlToText, isAutoReply, buildEmailTaskDraft, header };
