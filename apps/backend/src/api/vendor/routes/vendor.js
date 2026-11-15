'use strict';

// Staff only: the controller checks the caller's email against PLATFORM_ADMIN_EMAILS.
const route = (method, path, handler) => ({
  method,
  path,
  handler: `vendor.${handler}`,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('GET', '/vendor/me', 'me'),
    route('GET', '/vendor/overview', 'overview'),
    route('GET', '/vendor/reports', 'reports'),
    route('GET', '/vendor/organizations', 'organizations'),
    route('GET', '/vendor/organizations/:id', 'organization'),
    route('POST', '/vendor/organizations/:id/suspend', 'suspend'),
    route('POST', '/vendor/organizations/:id/reactivate', 'reactivate'),
    route('GET', '/vendor/subscriptions', 'subscriptions'),
    route('POST', '/vendor/subscriptions/:id/extend-trial', 'extendTrial'),
    route('GET', '/vendor/payments', 'payments'),
    route('GET', '/vendor/users', 'users'),
    route('GET', '/vendor/apps', 'apps'),
  ],
};
