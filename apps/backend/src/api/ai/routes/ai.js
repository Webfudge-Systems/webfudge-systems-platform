'use strict';

// Fudge AI (P5). Auth, org and the AI_ENABLED / SaaS gate are checked in the controller.
const route = (method, path, handler) => ({
  method,
  path,
  handler: `ai.${handler}`,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('GET', '/ai/usage', 'usage'),
    route('GET', '/ai/actions', 'actions'),
    route('POST', '/ai/actions/:id/approve', 'approve'),
    route('POST', '/ai/actions/:id/reject', 'reject'),
    route('POST', '/ai/actions/:id/undo', 'undo'),
    route('POST', '/ai/memory/search', 'memorySearch'),
  ],
};
