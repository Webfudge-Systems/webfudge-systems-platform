'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::status-report.status-report');
