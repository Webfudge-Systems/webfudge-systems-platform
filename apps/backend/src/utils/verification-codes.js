'use strict';

const crypto = require('crypto');
const { sendMail, layout } = require('./mailer');
const { jwtSecret } = require('./platform');

const UID = 'api::verification-code.verification-code';
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 45 * 1000;
const MAX_ATTEMPTS = 5;

class CodeError extends Error {
  constructor(code, message, extra = {}) {
    super(message);
    this.code = code;
    Object.assign(this, extra);
  }
}

function hashCode(email, purpose, code) {
  return crypto.createHmac('sha256', jwtSecret()).update(`${purpose}:${email}:${code}`).digest('hex');
}

const EMAILS = {
  verify_email: (code) => ({
    subject: `${code} is your Webfudge verification code`,
    heading: 'Confirm your email',
    body: 'Enter this code to finish creating your Webfudge account:',
  }),
  reset_password: (code) => ({
    subject: `${code} is your Webfudge password reset code`,
    heading: 'Reset your password',
    body: 'Enter this code to choose a new password:',
  }),
};

/** Creates a fresh 6-digit code for the email and sends it. Older codes for the same purpose stop working. */
async function issueCode(strapi, rawEmail, purpose) {
  const email = String(rawEmail || '').trim().toLowerCase();
  const previous = await strapi.entityService.findMany(UID, {
    filters: { email, purpose, consumedAt: { $null: true } },
    sort: { createdAt: 'desc' },
    limit: 5,
  });
  const last = previous[0];
  if (last?.lastSentAt && Date.now() - new Date(last.lastSentAt).getTime() < RESEND_COOLDOWN_MS) {
    const retryAfter = Math.ceil((RESEND_COOLDOWN_MS - (Date.now() - new Date(last.lastSentAt).getTime())) / 1000);
    throw new CodeError('RESEND_TOO_SOON', `Please wait ${retryAfter} seconds before asking for a new code.`, { retryAfter });
  }
  for (const row of previous) {
    await strapi.entityService.update(UID, row.id, { data: { consumedAt: new Date() } });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await strapi.entityService.create(UID, {
    data: {
      email,
      purpose,
      codeHash: hashCode(email, purpose, code),
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
      attempts: 0,
      lastSentAt: new Date(),
    },
  });

  const copy = EMAILS[purpose](code);
  await sendMail({
    to: email,
    subject: copy.subject,
    text: `${copy.body} ${code}\n\nThe code expires in 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: layout({
      heading: copy.heading,
      bodyHtml: `<p>${copy.body}</p><p style="font-size:34px;letter-spacing:8px;font-weight:700;margin:20px 0;color:#0F0F0F">${code}</p>`,
      footnote: "The code expires in 10 minutes. If you didn't ask for it, you can ignore this email.",
    }),
  });
  return { email, expiresInSeconds: CODE_TTL_MS / 1000, resendInSeconds: RESEND_COOLDOWN_MS / 1000 };
}

/** Checks a code and marks it used. Throws CodeError on any failure. */
async function consumeCode(strapi, rawEmail, purpose, rawCode) {
  const email = String(rawEmail || '').trim().toLowerCase();
  const code = String(rawCode || '').replace(/\D/g, '');
  const [row] = await strapi.entityService.findMany(UID, {
    filters: { email, purpose, consumedAt: { $null: true } },
    sort: { createdAt: 'desc' },
    limit: 1,
  });
  if (!row || new Date(row.expiresAt).getTime() < Date.now()) {
    throw new CodeError('CODE_EXPIRED', 'This code has expired. Ask for a new one.');
  }
  if ((row.attempts || 0) >= MAX_ATTEMPTS) {
    throw new CodeError('TOO_MANY_ATTEMPTS', 'Too many wrong attempts. Ask for a new code.');
  }
  const expected = Buffer.from(row.codeHash, 'hex');
  const actual = Buffer.from(hashCode(email, purpose, code), 'hex');
  if (code.length !== 6 || expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
    await strapi.entityService.update(UID, row.id, { data: { attempts: (row.attempts || 0) + 1 } });
    throw new CodeError('INVALID_CODE', "That code isn't right. Check the email and try again.");
  }
  await strapi.entityService.update(UID, row.id, { data: { consumedAt: new Date() } });
  return true;
}

module.exports = { issueCode, consumeCode, CodeError };
