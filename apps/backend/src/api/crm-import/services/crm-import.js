'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::crm-import.crm-import');
