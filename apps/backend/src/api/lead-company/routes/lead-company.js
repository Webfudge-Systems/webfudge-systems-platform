'use strict';

/**
 * lead-company router
 * auth: false so Strapi does not require its own JWT; our global jwt-auth middleware sets ctx.state.user.
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::lead-company.lead-company', {
  config: {
    find: { auth: false },
    findOne: { auth: false },
    create: { auth: false },
    update: { auth: false },
    delete: { auth: false },
  },
});
