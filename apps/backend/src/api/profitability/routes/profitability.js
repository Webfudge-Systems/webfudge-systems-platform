'use strict';

/** Project profitability (W22, Business plan). Auth via global jwt-auth middleware. */
const authFalse = { auth: false, policies: [], middlewares: [] };

module.exports = {
  routes: [
    { method: 'GET', path: '/profitability/summary', handler: 'profitability.summary', config: authFalse },
    { method: 'GET', path: '/profitability/projects/:id', handler: 'profitability.project', config: authFalse },
    { method: 'PUT', path: '/profitability/projects/:id/target', handler: 'profitability.setProjectTarget', config: authFalse },
    { method: 'GET', path: '/profitability/settings', handler: 'profitability.settings', config: authFalse },
    { method: 'PUT', path: '/profitability/settings/target', handler: 'profitability.setOrgTarget', config: authFalse },
    { method: 'PUT', path: '/profitability/cost-rates/:userId', handler: 'profitability.setCostRate', config: authFalse },
  ],
};
