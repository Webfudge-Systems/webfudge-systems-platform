'use strict';

const { makeBooksCrudController } = require('../../../utils/books-crud');
const UID = 'api::payroll-line-item.payroll-line-item';

module.exports = makeBooksCrudController(UID, {
  defaultPopulate: {
    organizationUser: {
      populate: ['user', 'departments', 'primaryDepartment'],
    },
    employeeProfile: true,
    salaryStructure: true,
    payrollRun: true,
  },
  extraFilters: (q) => {
    const filters = {};
    if (q.payrollRun) filters.payrollRun = q.payrollRun;
    if (q.organizationUser) filters.organizationUser = q.organizationUser;
    return filters;
  },
});
