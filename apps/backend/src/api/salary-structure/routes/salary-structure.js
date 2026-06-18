'use strict';

const { makeCoreRoutes } = require('../../../utils/books-crud');
module.exports = makeCoreRoutes('salary-structures', 'api::salary-structure.salary-structure');
