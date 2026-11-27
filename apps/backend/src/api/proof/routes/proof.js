'use strict';

/**
 * Approvals & proofing (W9).
 *   /proofs/*                       team users in Work (JWT + organization, checked in the controller)
 *   /portal/projects/…/proofs*      client contacts (portal session token, checked in the controller)
 */
const route = (method, path, handler) => ({
  method,
  path,
  handler,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('GET', '/proofs/tasks/:taskId', 'proof.list'),
    route('POST', '/proofs/tasks/:taskId/versions', 'proof.createVersion'),
    route('POST', '/proofs/versions/:id/comments', 'proof.addComment'),
    route('POST', '/proofs/versions/:id/decision', 'proof.decide'),
    route('PUT', '/proofs/comments/:id', 'proof.updateComment'),

    route('GET', '/portal/projects/:id/tasks/:taskId/proofs', 'proof-portal.list'),
    route('POST', '/portal/projects/:id/tasks/:taskId/proofs/:versionId/comments', 'proof-portal.addComment'),
  ],
};
