'use strict';

/** Project docs (W8). Auth via the global jwt-auth middleware; the controller checks access. */
const UID = 'api::project-doc.project-doc';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/project-docs', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/project-docs', handler: `${UID}.create`, config: authFalse },
    { method: 'GET', path: '/project-docs/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'PUT', path: '/project-docs/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/project-docs/:id', handler: `${UID}.delete`, config: authFalse },
    { method: 'GET', path: '/project-docs/:id/versions', handler: `${UID}.versions`, config: authFalse },
    { method: 'POST', path: '/project-docs/:id/versions', handler: `${UID}.saveVersion`, config: authFalse },
    { method: 'GET', path: '/project-docs/:id/versions/:versionId', handler: `${UID}.version`, config: authFalse },
    { method: 'POST', path: '/project-docs/:id/versions/:versionId/restore', handler: `${UID}.restore`, config: authFalse },
  ],
};
