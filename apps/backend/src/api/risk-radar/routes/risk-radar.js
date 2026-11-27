'use strict';

/** Risk radar (W19, SaaS). Auth via the global jwt-auth middleware; plan + access checks in the controller. */
const route = (method, path, handler) => ({ method, path, handler: `risk-radar.${handler}`, config: { auth: false, policies: [], middlewares: [] } });

module.exports = {
  routes: [
    route('GET', '/risk-radar/portfolio', 'portfolio'),
    route('GET', '/risk-radar/projects/:id', 'project'),
    route('POST', '/risk-radar/projects/:id/explain', 'explain'),
  ],
};
