'use strict';

// AI auto-capture (G10). Auth, org, RBAC and the AI gate are checked in the controller.
const route = (method, path, handler) => ({
  method,
  path,
  handler: `ai-capture.${handler}`,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('GET', '/ai-capture/settings', 'getSettings'),
    route('PUT', '/ai-capture/settings', 'putSettings'),
    route('GET', '/ai-capture/:type/:id', 'show'),
    route('POST', '/ai-capture/:type/:id/run', 'run'),
    route('POST', '/ai-capture/:type/:id/apply', 'apply'),
    route('POST', '/ai-capture/:type/:id/dismiss', 'dismiss'),
  ],
};
