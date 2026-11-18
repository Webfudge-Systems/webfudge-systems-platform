'use strict';

/** Org-level Grow settings (GF4): industries, lead sources, notification preferences. Auth via global jwt-auth. */
const UID = 'api::crm-org-setting.crm-org-setting';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/crm-settings', handler: `${UID}.find`, config: authFalse },
    { method: 'PUT', path: '/crm-settings/:key', handler: `${UID}.update`, config: authFalse },
  ],
};
