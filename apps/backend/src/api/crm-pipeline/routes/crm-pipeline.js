'use strict';

/** Per-org deal pipelines and lead statuses. Auth via global jwt-auth middleware. */
const UID = 'api::crm-pipeline.crm-pipeline';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/crm-pipelines', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/crm-pipelines', handler: `${UID}.create`, config: authFalse },
    { method: 'PUT', path: '/crm-pipelines/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/crm-pipelines/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
