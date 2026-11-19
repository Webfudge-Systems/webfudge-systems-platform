'use strict';

/** Grow analytics (G15). Auth via global jwt-auth middleware. */
module.exports = {
  routes: [
    { method: 'GET', path: '/crm-analytics', handler: 'crm-analytics.report', config: { auth: false, policies: [], middlewares: [] } },
  ],
};
