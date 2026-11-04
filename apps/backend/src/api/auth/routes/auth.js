'use strict';

// Password routes live under /auth/password/* so they never clash with users-permissions' own /auth/* routes.
// Auth is handled by our own JWT (see middlewares/jwt-auth.js), so Strapi's route auth is off.
const route = (method, path, handler) => ({
  method,
  path,
  handler,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('POST', '/auth/signup', 'auth.signup'),
    route('POST', '/auth/login', 'auth.login'),
    route('GET', '/auth/me', 'auth.me'),
    route('POST', '/auth/verify-email', 'auth.verifyEmail'),
    route('POST', '/auth/resend-code', 'auth.resendCode'),
    route('POST', '/auth/password/forgot', 'auth.forgotPassword'),
    route('POST', '/auth/password/reset', 'auth.resetPassword'),
    route('PUT', '/auth/profile', 'auth.updateProfile'),
    route('POST', '/auth/password/change', 'auth.changePassword'),
  ],
};
