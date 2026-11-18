'use strict';

/** Client retainers (W14). Auth via global jwt-auth middleware. */
const UID = 'api::retainer.retainer';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/retainers', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/retainers', handler: `${UID}.create`, config: authFalse },
    { method: 'GET', path: '/retainers/:id/history', handler: `${UID}.history`, config: authFalse },
    { method: 'PUT', path: '/retainers/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/retainers/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
