'use strict';

/** Sprints (W7). Auth via global jwt-auth middleware. */
const UID = 'api::sprint.sprint';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/sprints', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/sprints', handler: `${UID}.create`, config: authFalse },
    { method: 'GET', path: '/sprints/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'PUT', path: '/sprints/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/sprints/:id', handler: `${UID}.delete`, config: authFalse },
    { method: 'PUT', path: '/sprints/:id/tasks', handler: `${UID}.setTasks`, config: authFalse },
    { method: 'POST', path: '/sprints/:id/start', handler: `${UID}.start`, config: authFalse },
    { method: 'POST', path: '/sprints/:id/complete', handler: `${UID}.complete`, config: authFalse },
  ],
};
