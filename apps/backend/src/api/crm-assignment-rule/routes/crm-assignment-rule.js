'use strict';

/** Lead assignment rules + SLA settings/summary (G5). Auth via global jwt-auth middleware. */
const UID = 'api::crm-assignment-rule.crm-assignment-rule';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/crm-assignment-rules', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/crm-assignment-rules', handler: `${UID}.create`, config: authFalse },
    { method: 'POST', path: '/crm-assignment-rules/test', handler: `${UID}.test`, config: authFalse },
    { method: 'PUT', path: '/crm-assignment-rules/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/crm-assignment-rules/:id', handler: `${UID}.delete`, config: authFalse },
    { method: 'GET', path: '/crm-lead-sla', handler: `${UID}.getSla`, config: authFalse },
    { method: 'PUT', path: '/crm-lead-sla', handler: `${UID}.setSla`, config: authFalse },
    { method: 'GET', path: '/crm-lead-sla/summary', handler: `${UID}.slaSummary`, config: authFalse },
  ],
};
