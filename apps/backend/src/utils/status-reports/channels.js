'use strict';

/**
 * Delivery channels for weekly status reports (W17). One interface per channel:
 *
 *   { key, label, available, reason?, send({ to: string[], subject, body }) → { delivered, sent, failed, note? } }
 *
 * Email works today (Resend through utils/mailer). WhatsApp is listed so the UI can show it, but
 * it stays unavailable until Fudge Connect ships: sending on it throws CHANNEL_UNAVAILABLE. When
 * Connect lands, implement `send` here and flip `available`.
 */

const { sendMail, layout, escapeHtml } = require('../mailer');

class ChannelError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

function emailHtml(subject, body) {
  const paragraphs = String(body || '')
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
  return layout({ heading: subject, bodyHtml: paragraphs });
}

const email = {
  key: 'email',
  label: 'Email',
  available: true,
  /** One message per recipient so client contacts never see each other's addresses. */
  async send({ to, subject, body }) {
    const html = emailHtml(subject, body);
    let sent = 0;
    const failed = [];
    for (const address of to) {
      const out = await sendMail({ to: address, subject, text: body, html });
      if (out.sent) sent += 1;
      else failed.push(address);
    }
    const configured = Boolean(process.env.RESEND_API_KEY);
    if (configured && failed.length === to.length) {
      throw new ChannelError('DELIVERY_FAILED', 'The email provider did not accept the message.', 502);
    }
    return {
      delivered: configured && sent > 0,
      sent,
      failed,
      note: configured ? (failed.length ? `Not delivered to: ${failed.join(', ')}` : null) : 'Email is not configured on this server (RESEND_API_KEY unset), so nothing was delivered.',
    };
  },
};

const whatsapp = {
  key: 'whatsapp',
  label: 'WhatsApp',
  available: false,
  reason: 'WhatsApp sending arrives with Fudge Connect. Use email for now.',
  async send() {
    throw new ChannelError('CHANNEL_UNAVAILABLE', whatsapp.reason);
  },
};

const CHANNELS = { email, whatsapp };

function getChannel(key) {
  const ch = CHANNELS[String(key || 'email')];
  if (!ch) throw new ChannelError('CHANNEL_UNKNOWN', `Unknown channel "${key}".`);
  return ch;
}

function listChannels() {
  return Object.values(CHANNELS).map((c) => ({ key: c.key, label: c.label, available: c.available, reason: c.reason || null }));
}

module.exports = { CHANNELS, ChannelError, getChannel, listChannels, emailHtml };
