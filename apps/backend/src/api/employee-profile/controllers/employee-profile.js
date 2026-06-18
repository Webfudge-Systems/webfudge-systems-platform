'use strict';

const { makeBooksCrudController } = require('../../../utils/books-crud');
const UID = 'api::employee-profile.employee-profile';

module.exports = makeBooksCrudController(UID, {
  defaultPopulate: ['organizationUser', 'salaryStructure'],
});
