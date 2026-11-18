'use strict';

/** Portfolio dashboard (W11). Auth via global jwt-auth middleware. */
module.exports = {
  routes: [{ method: 'GET', path: '/portfolio', handler: 'portfolio.overview', config: { auth: false, policies: [], middlewares: [] } }],
};
