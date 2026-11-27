'use strict';

/** Scope-creep watcher (W19, SaaS). Auth via the global jwt-auth middleware; plan + access checks in the controller. */
const route = (method, path, handler) => ({ method, path, handler: `scope-watch.${handler}`, config: { auth: false, policies: [], middlewares: [] } });

module.exports = {
  routes: [
    route('GET', '/scope-watch/portfolio', 'portfolio'),
    route('GET', '/scope-watch/projects/:id', 'project'),
    route('PUT', '/scope-watch/projects/:id/sow', 'setSow'),
    route('POST', '/scope-watch/projects/:id/check', 'check'),
    route('POST', '/scope-watch/checks/:checkId/dismiss', 'dismiss'),
  ],
};
