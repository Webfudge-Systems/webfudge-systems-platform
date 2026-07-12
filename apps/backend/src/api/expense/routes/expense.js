'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');

module.exports = makeCoreRoutes('expenses', 'api::expense.expense', [
  { method: 'POST', path: '/expenses/:id/invoice', handler: 'api::expense.expense.addToInvoice', config: { auth: false } },
  { method: 'POST', path: '/expenses/:id/approve', handler: 'api::expense.expense.approve', config: { auth: false } },
  { method: 'POST', path: '/expenses/:id/reject', handler: 'api::expense.expense.reject', config: { auth: false } },
  { method: 'POST', path: '/expenses/:id/reimburse', handler: 'api::expense.expense.reimburse', config: { auth: false } },
]);
