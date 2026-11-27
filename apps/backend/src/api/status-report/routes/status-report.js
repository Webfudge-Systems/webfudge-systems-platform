'use strict';

/** W17 Status Reporter (SaaS, Fudge Work). Auth via the global jwt-auth middleware; checks in the controller. */
const UID = 'api::status-report.status-report';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/status-reports', handler: `${UID}.find`, config: authFalse },
    { method: 'GET', path: '/status-reports/channels', handler: `${UID}.channels`, config: authFalse },
    { method: 'POST', path: '/status-reports/generate', handler: `${UID}.generate`, config: authFalse },
    { method: 'GET', path: '/status-reports/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'PUT', path: '/status-reports/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'POST', path: '/status-reports/:id/send', handler: `${UID}.send`, config: authFalse },
    { method: 'POST', path: '/status-reports/:id/discard', handler: `${UID}.discard`, config: authFalse },
  ],
};
