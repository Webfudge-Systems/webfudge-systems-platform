'use strict';

/** Per-user saved task views (W3). Auth via global jwt-auth middleware. */
const UID = 'api::saved-view.saved-view';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/saved-views', handler: `${UID}.find`, config: authFalse },
    { method: 'POST', path: '/saved-views', handler: `${UID}.create`, config: authFalse },
    { method: 'PUT', path: '/saved-views/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/saved-views/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
