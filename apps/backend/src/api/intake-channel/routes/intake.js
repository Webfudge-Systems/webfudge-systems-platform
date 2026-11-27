'use strict';

/**
 * W13 intake (SaaS only; 404 on Internal).
 *  Public (no login; the secret in the URL / address identifies the channel):
 *    GET  /intake/forms/:secret           form definition for the public page
 *    POST /intake/forms/:secret           submit → task (honeypot + timing + rate limit)
 *    POST /intake/email/resend            Resend inbound webhook (Svix signature) → task
 *  Fudge Work project settings (org admin or the project's manager; jwt + app-access):
 *    GET    /pm-intake/projects/:projectId          channels + availability
 *    POST   /pm-intake/projects/:projectId          create { channel, name, taskListId, fields, settings }
 *    PUT    /pm-intake/channels/:id                 update
 *    POST   /pm-intake/channels/:id/rotate          new secret (old link / address stops working)
 *    DELETE /pm-intake/channels/:id
 */
const PUBLIC = 'api::intake-channel.intake-public';
const ADMIN = 'api::intake-channel.intake-admin';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/intake/forms/:secret', handler: `${PUBLIC}.getForm`, config: authFalse },
    { method: 'POST', path: '/intake/forms/:secret', handler: `${PUBLIC}.submitForm`, config: authFalse },
    { method: 'POST', path: '/intake/email/resend', handler: `${PUBLIC}.resendInbound`, config: authFalse },

    { method: 'GET', path: '/pm-intake/projects/:projectId', handler: `${ADMIN}.list`, config: authFalse },
    { method: 'POST', path: '/pm-intake/projects/:projectId', handler: `${ADMIN}.create`, config: authFalse },
    { method: 'PUT', path: '/pm-intake/channels/:id', handler: `${ADMIN}.update`, config: authFalse },
    { method: 'POST', path: '/pm-intake/channels/:id/rotate', handler: `${ADMIN}.rotate`, config: authFalse },
    { method: 'DELETE', path: '/pm-intake/channels/:id', handler: `${ADMIN}.remove`, config: authFalse },
  ],
};
