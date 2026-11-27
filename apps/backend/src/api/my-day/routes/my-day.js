'use strict';

/** My Day (W21 auto-scheduling) + Ask Work. SaaS only. Auth via global jwt-auth middleware. */
module.exports = {
  routes: [
    { method: 'GET', path: '/my-day', handler: 'my-day.getDay', config: { auth: false, policies: [], middlewares: [] } },
    { method: 'POST', path: '/my-day/plan', handler: 'my-day.replan', config: { auth: false, policies: [], middlewares: [] } },
    { method: 'POST', path: '/my-day/ask', handler: 'my-day.ask', config: { auth: false, policies: [], middlewares: [] } },
  ],
};
