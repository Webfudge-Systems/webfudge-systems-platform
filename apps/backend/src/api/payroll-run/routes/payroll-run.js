'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');

module.exports = makeCoreRoutes('payroll-runs', 'api::payroll-run.payroll-run', [
  { method: 'POST', path: '/payroll-runs/:id/recalculate', handler: 'api::payroll-run.payroll-run.recalculate', config: { auth: false } },
  { method: 'POST', path: '/payroll-runs/:id/review', handler: 'api::payroll-run.payroll-run.review', config: { auth: false } },
  { method: 'POST', path: '/payroll-runs/:id/lock', handler: 'api::payroll-run.payroll-run.lock', config: { auth: false } },
  { method: 'POST', path: '/payroll-runs/:id/disburse', handler: 'api::payroll-run.payroll-run.disburse', config: { auth: false } },
]);
