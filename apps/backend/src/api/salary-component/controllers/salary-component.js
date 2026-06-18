'use strict';

const { makeBooksCrudController } = require('../../../utils/books-crud');
const UID = 'api::salary-component.salary-component';

module.exports = makeBooksCrudController(UID, {
  defaultPopulate: ['salaryStructure'],
});
