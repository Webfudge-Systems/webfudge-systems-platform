'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');
module.exports = makeCoreRoutes('invoices', 'api::invoice.invoice', [
  { method: 'PUT',  path: '/invoices/:id/status',    handler: 'api::invoice.invoice.updateStatus', config: { auth: false } },
  { method: 'POST', path: '/invoices/from-time',     handler: 'api::invoice.invoice.fromTime',     config: { auth: false } },
]);
