'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');

module.exports = makeCoreRoutes('leave-requests', 'api::leave-request.leave-request', [
  {
    method: 'POST',
    path: '/leave-requests/:id/approve',
    handler: 'api::leave-request.leave-request.approve',
    config: { auth: false },
  },
  {
    method: 'POST',
    path: '/leave-requests/:id/reject',
    handler: 'api::leave-request.leave-request.reject',
    config: { auth: false },
  },
]);
