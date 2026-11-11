'use strict';

/**
 * Internal investment manager (apps/invest). Auth via global jwt-auth; access checked in the
 * controller (utils/invest/access) — every route answers 404 when PLATFORM_MODE=saas.
 */
const authFalse = { auth: false, policies: [], middlewares: [] };

module.exports = {
  routes: [
    { method: 'GET', path: '/invest/access', handler: 'invest.access', config: authFalse },
    { method: 'POST', path: '/invest/prices/refresh', handler: 'invest.refreshPrices', config: authFalse },
    { method: 'GET', path: '/invest/lookup', handler: 'invest.lookup', config: authFalse },
    { method: 'GET', path: '/invest/instruments/:id/history', handler: 'invest.history', config: authFalse },
    { method: 'POST', path: '/invest/sips/:id/sync', handler: 'invest.syncSip', config: authFalse },
  ],
};
