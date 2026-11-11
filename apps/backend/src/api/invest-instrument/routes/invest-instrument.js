'use strict';

/**
 * Internal investment manager (apps/invest). Auth via global jwt-auth; access checked in the
 * controller (utils/invest/access) — answers 404 when PLATFORM_MODE=saas.
 */
const UID = 'api::invest-instrument.invest-instrument';
const authFalse = { auth: false };

module.exports = {
  type: 'content-api',
  routes: [
    { method: 'GET', path: '/invest/instruments', handler: `${UID}.find`, config: authFalse },
    { method: 'GET', path: '/invest/instruments/:id', handler: `${UID}.findOne`, config: authFalse },
    { method: 'POST', path: '/invest/instruments', handler: `${UID}.create`, config: authFalse },
    { method: 'PUT', path: '/invest/instruments/:id', handler: `${UID}.update`, config: authFalse },
    { method: 'DELETE', path: '/invest/instruments/:id', handler: `${UID}.delete`, config: authFalse },
  ],
};
