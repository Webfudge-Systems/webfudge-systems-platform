'use strict';

/**
 * Transactional email via Resend's HTTP API (no SDK needed).
 *
 *   RESEND_API_KEY   — enables sending
 *   MAIL_FROM        — e.g. "Webfudge <no-reply@webfudgesystems.in>" (domain must be verified in Resend)
 *   MAIL_REPLY_TO    — optional
 *
 * Without RESEND_API_KEY nothing is sent. Outside production the message is printed to the
 * console so sign-up codes can still be used locally.
 */

const BRAND_ORANGE = '#F5630F';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Wraps body HTML in the shared Webfudge email layout. */
function layout({ heading, bodyHtml, cta, footnote }) {
  const button = cta
    ? `<p style="margin:28px 0"><a href="${escapeHtml(cta.href)}" style="background:#0F0F0F;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:600;display:inline-block">${escapeHtml(cta.label)}</a></p>`
    : '';
  return `<!doctype html><html><body style="margin:0;background:#F4F4F2;font-family:Arial,Helvetica,sans-serif;color:#0F0F0F">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:20px;padding:36px">
<tr><td>
<p style="margin:0 0 24px;font-size:18px;font-weight:700">Webfudge<span style="color:${BRAND_ORANGE}">.</span></p>
<h1 style="margin:0 0 12px;font-size:24px;line-height:1.25">${escapeHtml(heading)}</h1>
<div style="font-size:15px;line-height:1.6;color:#3A3A3A">${bodyHtml}</div>
${button}
${footnote ? `<p style="margin:24px 0 0;font-size:13px;color:#6B6B6B">${footnote}</p>` : ''}
</td></tr></table>
<p style="margin:16px 0 0;font-size:12px;color:#8A8A8A">Webfudge Systems · Pune, India</p>
</td></tr></table></body></html>`;
}

async function sendMail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n✉️  [mail not sent: RESEND_API_KEY unset]\nTo: ${to}\nSubject: ${subject}\n${text || ''}\n`);
    } else {
      console.warn(`✉️  RESEND_API_KEY is not set — email "${subject}" to ${to} was not sent.`);
    }
    return { sent: false };
  }

  const from = process.env.MAIL_FROM || 'Webfudge <no-reply@webfudgesystems.in>';
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        text,
        ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`✉️  Resend rejected "${subject}" to ${to}: ${res.status} ${await res.text()}`);
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    console.error(`✉️  Failed to send "${subject}" to ${to}:`, error?.message || error);
    return { sent: false };
  }
}

module.exports = { sendMail, layout, escapeHtml };
