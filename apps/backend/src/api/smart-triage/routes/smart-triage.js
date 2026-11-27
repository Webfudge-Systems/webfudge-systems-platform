'use strict';

// Smart triage + meeting → tasks (W20). Auth, org, RBAC and the AI gate are checked in the controller.
const route = (method, path, handler) => ({
  method,
  path,
  handler: `smart-triage.${handler}`,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('GET', '/smart-triage/tasks', 'inbox'),
    route('POST', '/smart-triage/suggest', 'suggest'),
    route('POST', '/smart-triage/apply', 'apply'),
    route('GET', '/smart-triage/meetings', 'meetings'),
    route('POST', '/smart-triage/meetings/:id/extract', 'extract'),
    route('POST', '/smart-triage/meetings/:id/tasks', 'createTasks'),
  ],
};
