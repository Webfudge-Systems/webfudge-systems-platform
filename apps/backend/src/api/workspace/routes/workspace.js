'use strict';

/** Workspaces (W1). Auth via global jwt-auth middleware. */
const UID = 'api::workspace.workspace';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/workspaces', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/workspaces', handler: `${UID}.create`, config: authFalse },
    { method: 'GET', path: '/workspaces/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'PUT', path: '/workspaces/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/workspaces/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
