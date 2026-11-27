'use strict';

// Vertical packs (G22, SaaS). Auth via the global jwt-auth middleware; SaaS gate + RBAC in the controller.
const route = (method, path, handler) => ({
  method,
  path,
  handler: `crm-vertical-pack.${handler}`,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('GET', '/crm-vertical-packs', 'list'),
    route('GET', '/crm-vertical-packs/:key/preview', 'preview'),
    route('POST', '/crm-vertical-packs/:key/apply', 'apply'),
  ],
};
