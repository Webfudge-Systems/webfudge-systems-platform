'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::timesheet.time-entry');
