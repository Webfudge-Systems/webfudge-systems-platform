'use strict';

/** Per-org custom field definitions (G1). Auth via global jwt-auth middleware. */
const UID = 'api::crm-custom-field.crm-custom-field';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/crm-custom-fields', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/crm-custom-fields', handler: `${UID}.create`, config: authFalse },
    { method: 'PUT', path: '/crm-custom-fields/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/crm-custom-fields/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
