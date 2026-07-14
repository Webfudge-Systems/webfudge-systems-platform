'use strict';

/**
 * REST routes for Lead Activity (Strapi 5 content API).
 * No PUT/DELETE — activities are an immutable timeline.
 */
const UID = 'api::lead-activity.lead-activity';

const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/lead-activities', handler: `${UID}.find`, config: authFalse },
    { method: 'GET', path: '/lead-activities/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'POST', path: '/lead-activities', handler: `${UID}.create`, config: authFalse },
  ],
};
