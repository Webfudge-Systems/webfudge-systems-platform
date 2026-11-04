'use strict';

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::billing-payment.billing-payment');
