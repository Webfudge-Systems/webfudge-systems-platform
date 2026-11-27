'use strict';

/** G19 deal health, daily call list and forecast (SaaS). Auth via the global jwt-auth middleware; checks in the controller. */
const route = (method, path, handler) => ({ method, path, handler: `deal-health.${handler}`, config: { auth: false, policies: [], middlewares: [] } });

module.exports = {
  routes: [
    route('GET', '/deal-health/call-list', 'callList'),
    route('POST', '/deal-health/call-list/refresh', 'refreshCallList'),
    route('GET', '/deal-health/deals/:id', 'deal'),
    route('POST', '/deal-health/deals/:id/analyse', 'analyseDeal'),
    route('GET', '/deal-health/forecast', 'forecast'),
    route('POST', '/deal-health/forecast/explain', 'explainForecast'),
  ],
};
