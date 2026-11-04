'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::verification-code.verification-code');
