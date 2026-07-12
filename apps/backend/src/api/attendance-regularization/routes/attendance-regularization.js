'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');

module.exports = makeCoreRoutes(
  'attendance-regularizations',
  'api::attendance-regularization.attendance-regularization',
  [
    {
      method: 'POST',
      path: '/attendance-regularizations/:id/approve',
      handler: 'api::attendance-regularization.attendance-regularization.approve',
      config: { auth: false },
    },
    {
      method: 'POST',
      path: '/attendance-regularizations/:id/reject',
      handler: 'api::attendance-regularization.attendance-regularization.reject',
      config: { auth: false },
    },
  ],
);
