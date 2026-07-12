'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');

module.exports = makeCoreRoutes('company-holidays', 'api::company-holiday.company-holiday');
