'use strict';

/** Task lists / sections inside a project (W1). Auth via global jwt-auth middleware. */
const UID = 'api::task-list.task-list';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/task-lists', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/task-lists', handler: `${UID}.create`, config: authFalse },
    { method: 'POST', path: '/task-lists/reorder', handler: `${UID}.reorder`, config: authFalse },
    { method: 'PUT', path: '/task-lists/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/task-lists/:id', handler: `${UID}.delete`, config: authFalse },
    { method: 'POST', path: '/task-lists/:id/tasks', handler: `${UID}.moveTasks`, config: authFalse },
  ],
};
