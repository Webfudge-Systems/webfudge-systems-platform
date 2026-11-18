'use strict';

/** Workload & capacity planner (W6). Auth via global jwt-auth middleware. */
module.exports = {
  routes: [
    { method: 'GET', path: '/capacity', handler: 'capacity.plan', config: { auth: false, policies: [], middlewares: [] } },
    { method: 'PUT', path: '/capacity/members/:userId', handler: 'capacity.setMember', config: { auth: false, policies: [], middlewares: [] } },
  ],
};
