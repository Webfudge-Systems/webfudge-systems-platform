'use strict';

const { makeBooksCrudController } = require('../../../utils/books-crud');
const UID = 'api::salary-structure.salary-structure';

module.exports = makeBooksCrudController(UID, {
  defaultPopulate: ['components'],
});
