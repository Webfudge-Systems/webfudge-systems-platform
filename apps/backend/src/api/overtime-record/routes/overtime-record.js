'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');

module.exports = makeCoreRoutes('overtime-records', 'api::overtime-record.overtime-record', [
  {
    method: 'POST',
    path: '/overtime-records/:id/approve',
    handler: 'api::overtime-record.overtime-record.approve',
    config: { auth: false },
  },
]);
