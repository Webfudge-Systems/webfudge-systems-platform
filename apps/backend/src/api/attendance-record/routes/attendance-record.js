'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');

module.exports = makeCoreRoutes('attendance-records', 'api::attendance-record.attendance-record');
