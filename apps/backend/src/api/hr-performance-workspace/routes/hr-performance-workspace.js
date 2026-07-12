'use strict';

module.exports = {
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/hr-performance-workspace/current',
      handler: 'hr-performance-workspace.getCurrent',
      config: { auth: false },
    },
    {
      method: 'PUT',
      path: '/hr-performance-workspace/current',
      handler: 'hr-performance-workspace.upsertCurrent',
      config: { auth: false },
    },
  ],
};
