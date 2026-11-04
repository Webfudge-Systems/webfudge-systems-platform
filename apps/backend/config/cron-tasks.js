'use strict';

/**
 * Daily SaaS billing reminders (no-op on Internal). Each reminder is recorded in
 * subscription.remindersSent so it is sent once.
 */

const { isSaas } = require('../src/utils/platform');
const { computeAccess } = require('../src/utils/saas-access');
const { sendMail, layout, escapeHtml } = require('../src/utils/mailer');

const SUB_UID = 'api::subscription.subscription';

function reminderFor(sub, access) {
  const end = access.endsAt ? new Date(access.endsAt).toISOString().slice(0, 10) : 'none';
  if (sub.status === 'trial') {
    if (access.access === 'full' && access.daysLeft <= 1) return { key: 'trial_1', subject: 'Your trial ends tomorrow', line: 'ends tomorrow' };
    if (access.access === 'full' && access.daysLeft <= 4) return { key: 'trial_4', subject: 'Your trial ends in 4 days', line: 'ends in 4 days' };
    if (access.access === 'read_only') return { key: 'trial_ended', subject: 'Your trial has ended', line: 'has ended. The app is now read-only for 7 days' };
    if (access.access === 'locked') return { key: 'trial_locked', subject: 'Your app is now locked', line: 'is now locked. Your data is kept for 90 days' };
    return null;
  }
  if (sub.planCode === 'free' || sub.status !== 'active') return null;
  if (access.access === 'full' && access.daysLeft <= 1) return { key: `renew_1_${end}`, subject: 'Your plan ends tomorrow', line: sub.cancelAtPeriodEnd ? 'ends tomorrow as you asked' : 'ends tomorrow. Renew to keep working without a break' };
  if (access.access === 'full' && access.daysLeft <= 7 && !sub.cancelAtPeriodEnd) return { key: `renew_7_${end}`, subject: 'Your plan renews in 7 days', line: 'ends in 7 days. Renew in advance to keep working without a break' };
  if (access.access === 'read_only') return { key: `expired_${end}`, subject: 'Your plan has ended', line: 'has ended. The app is read-only for 7 days' };
  if (access.access === 'locked') return { key: `locked_${end}`, subject: 'Your app is now locked', line: 'is now locked. Your data is kept for 90 days' };
  return null;
}

async function sendBillingReminders({ strapi }) {
  if (!isSaas()) return;
  const accountsUrl = (process.env.ACCOUNTS_URL || '').replace(/\/+$/, '');
  const subs = await strapi.entityService.findMany(SUB_UID, {
    filters: { status: { $in: ['trial', 'active'] } },
    populate: { app: true, organization: { populate: { owner: { fields: ['email', 'firstName'] } } } },
    limit: 5000,
  });

  for (const sub of subs) {
    const owner = sub.organization?.owner;
    if (!owner?.email || !sub.app) continue;
    const access = computeAccess(sub);
    const reminder = reminderFor(sub, access);
    const sent = sub.remindersSent || {};
    if (!reminder || sent[reminder.key]) continue;

    const what = `${sub.app.name} ${sub.status === 'trial' ? 'trial' : 'plan'} for ${sub.organization.name}`;
    await sendMail({
      to: owner.email,
      subject: `${reminder.subject} — ${sub.app.name}`,
      text: `Hi ${owner.firstName || 'there'}, your ${what} ${reminder.line}. Choose a plan: ${accountsUrl}/billing`,
      html: layout({
        heading: reminder.subject,
        bodyHtml: `<p>Hi ${escapeHtml(owner.firstName || 'there')},</p><p>Your ${escapeHtml(what)} ${escapeHtml(reminder.line)}.</p>`,
        cta: accountsUrl ? { href: `${accountsUrl}/billing?app=${sub.app.slug}`, label: 'Choose a plan' } : null,
      }),
    });
    await strapi.entityService.update(SUB_UID, sub.id, { data: { remindersSent: { ...sent, [reminder.key]: new Date().toISOString() } } });
  }
}

module.exports = {
  billingReminders: {
    task: sendBillingReminders,
    options: { rule: '30 9 * * *', tz: 'Asia/Kolkata' },
  },
};
