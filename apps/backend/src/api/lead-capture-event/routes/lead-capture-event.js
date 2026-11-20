'use strict';

/**
 * G7 lead capture.
 *  Public (no login; authenticated by the secret in the URL token, SaaS only):
 *    POST /lead-capture/:source/:token        webhook / website form
 *    GET  /lead-capture/:source/:token        JustDial (pushes with GET) and portals
 *    POST /lead-capture/:source/:token/email  JustDial / 99acres / MagicBricks lead email → parser
 *  Grow Settings → Lead sources (CRM settings managers; jwt-auth + app-access):
 *    GET  /crm-lead-capture                   sources, endpoint URLs, recent events
 *    GET  /crm-lead-capture/events            event log (?source=&limit=)
 *    PUT  /crm-lead-capture/:source           enable/disable + options
 *    POST /crm-lead-capture/:source/rotate    new secret (old URL stops working)
 *    POST /crm-lead-capture/indiamart/pull    pull IndiaMART now
 */
const PUBLIC = 'api::lead-capture-event.lead-capture';
const ADMIN = 'api::lead-capture-event.lead-capture-admin';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'POST', path: '/lead-capture/:source/:token/email', handler: `${PUBLIC}.captureEmail`, config: authFalse },
    { method: 'POST', path: '/lead-capture/:source/:token', handler: `${PUBLIC}.capture`, config: authFalse },
    { method: 'GET', path: '/lead-capture/:source/:token', handler: `${PUBLIC}.capture`, config: authFalse },

    { method: 'GET', path: '/crm-lead-capture', handler: `${ADMIN}.overview`, config: authFalse },
    { method: 'GET', path: '/crm-lead-capture/events', handler: `${ADMIN}.events`, config: authFalse },
    { method: 'POST', path: '/crm-lead-capture/indiamart/pull', handler: `${ADMIN}.pullIndiaMart`, config: authFalse },
    { method: 'PUT', path: '/crm-lead-capture/:source', handler: `${ADMIN}.update`, config: authFalse },
    { method: 'POST', path: '/crm-lead-capture/:source/rotate', handler: `${ADMIN}.rotate`, config: authFalse },
  ],
};
