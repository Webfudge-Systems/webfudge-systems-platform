'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');
module.exports = makeCoreRoutes('payroll-line-items', 'api::payroll-line-item.payroll-line-item');
