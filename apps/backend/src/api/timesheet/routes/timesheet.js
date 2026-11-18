'use strict';

/** Weekly timesheets (W5). Auth via global jwt-auth middleware. */
const UID = 'api::timesheet.timesheet';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/timesheets/week', handler: `${UID}.week`, config: authFalse },
    { method: 'PUT', path: '/timesheets/cell', handler: `${UID}.setCell`, config: authFalse },
    { method: 'PUT', path: '/timesheets/row', handler: `${UID}.setRow`, config: authFalse },
    { method: 'POST', path: '/timesheets/submit', handler: `${UID}.submit`, config: authFalse },
    { method: 'GET', path: '/timesheets/approvals', handler: `${UID}.approvals`, config: authFalse },
    { method: 'GET', path: '/timesheets/report', handler: `${UID}.report`, config: authFalse },
    { method: 'GET', path: '/timesheets/entries', handler: `${UID}.entries`, config: authFalse },
    { method: 'POST', path: '/timesheets/:id/approve', handler: `${UID}.approve`, config: authFalse },
    { method: 'POST', path: '/timesheets/:id/reject', handler: `${UID}.reject`, config: authFalse },
  ],
};
