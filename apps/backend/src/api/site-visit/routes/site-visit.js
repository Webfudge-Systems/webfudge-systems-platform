'use strict';

/**
 * REST routes for Site Visit (Strapi 5 content API).
 */
const UID = 'api::site-visit.site-visit';

const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/site-visits', handler: `${UID}.find`, config: authFalse },
    { method: 'GET', path: '/site-visits/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'POST', path: '/site-visits', handler: `${UID}.create`, config: authFalse },
    { method: 'PUT', path: '/site-visits/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/site-visits/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
