'use strict';

/** CSV/Excel import jobs + duplicate checks (G4). Auth via global jwt-auth middleware. */
const UID = 'api::crm-import.crm-import';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/crm-imports', handler: `${UID}.find`, config: authFalse },
    { method: 'GET', path: '/crm-imports/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'POST', path: '/crm-imports', handler: `${UID}.create`, config: authFalse },
    { method: 'GET', path: '/crm-duplicates', handler: `${UID}.duplicates`, config: authFalse },
    { method: 'POST', path: '/crm-merge/lead', handler: `${UID}.mergeLeads`, config: authFalse },
  ],
};
