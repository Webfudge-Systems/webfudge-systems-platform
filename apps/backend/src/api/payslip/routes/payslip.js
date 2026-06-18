'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');

module.exports = makeCoreRoutes('payslips', 'api::payslip.payslip', [
  { method: 'POST', path: '/payslips/generate', handler: 'api::payslip.payslip.generate', config: { auth: false } },
  { method: 'GET', path: '/payslips/:id/download', handler: 'api::payslip.payslip.download', config: { auth: false } },
]);
