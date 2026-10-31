'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'health.status',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/health/redis',
      handler: 'health.redis',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
