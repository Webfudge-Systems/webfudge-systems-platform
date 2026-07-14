'use strict';

/**
 * REST routes for Real Estate Project (Strapi 5 content API).
 */
const UID = 'api::real-estate-project.real-estate-project';

const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/real-estate-projects', handler: `${UID}.find`, config: authFalse },
    { method: 'GET', path: '/real-estate-projects/:id/activities', handler: `${UID}.activities`, config: authFalse },
    { method: 'GET', path: '/real-estate-projects/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'POST', path: '/real-estate-projects', handler: `${UID}.create`, config: authFalse },
    { method: 'PUT', path: '/real-estate-projects/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/real-estate-projects/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
