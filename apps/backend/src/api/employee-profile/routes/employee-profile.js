'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');
module.exports = makeCoreRoutes('employee-profiles', 'api::employee-profile.employee-profile');
