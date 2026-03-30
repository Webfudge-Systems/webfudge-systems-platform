'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::project.project', {
  config: {
    find:    { auth: false },
    findOne: { auth: false },
    create:  { auth: false },
    update:  { auth: false },
    delete:  { auth: false },
  },
});
