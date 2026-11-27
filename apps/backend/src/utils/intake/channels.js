'use strict';

/**
 * W13 intake channels behind one interface: { key, label, availability(env) → { available, reason } }.
 * Adding a channel = adding an entry here + a route that turns its payload into a task draft and calls
 * createTaskFromIntake (utils/intake/create-task.js).
 */

const CHANNELS = {
  form: {
    key: 'form',
    label: 'Form',
    availability: () => ({ available: true }),
  },
  email: {
    key: 'email',
    label: 'Email',
    availability: (env) =>
      env.INTAKE_EMAIL_DOMAIN && env.RESEND_INBOUND_WEBHOOK_SECRET
        ? { available: true }
        : { available: false, reason: 'Email intake is not configured on this server (INTAKE_EMAIL_DOMAIN, RESEND_INBOUND_WEBHOOK_SECRET).' },
  },
  whatsapp: {
    key: 'whatsapp',
    label: 'WhatsApp',
    // Needs Fudge Connect (WhatsApp Business), which does not exist yet. Do not fake it.
    availability: () => ({ available: false, reason: 'WhatsApp intake is not available yet. It arrives with Fudge Connect.' }),
  },
};

function channelAvailability(key, env = process.env) {
  const c = CHANNELS[key];
  if (!c) return { available: false, reason: 'Unknown channel' };
  return c.availability(env);
}

module.exports = { CHANNELS, channelAvailability };
