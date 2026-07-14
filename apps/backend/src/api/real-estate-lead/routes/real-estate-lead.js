'use strict';

/**
 * REST routes for Real Estate Lead (Strapi 5 content API).
 * Same pattern as deal / contact — explicit routes, auth via global jwt-auth middleware.
 */
const UID = 'api::real-estate-lead.real-estate-lead';

const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/real-estate-leads', handler: `${UID}.find`, config: authFalse },
    { method: 'GET', path: '/real-estate-leads/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'POST', path: '/real-estate-leads', handler: `${UID}.create`, config: authFalse },
    { method: 'PUT', path: '/real-estate-leads/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/real-estate-leads/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
