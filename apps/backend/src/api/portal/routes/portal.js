'use strict';

/**
 * Client portal (W10).
 *   /portal/*        — client contacts, portal session token (checked in the controller)
 *   /client-portal/* — team users in Work, normal JWT + organization (checked in the controller)
 */
const route = (method, path, handler) => ({
  method,
  path,
  handler,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('POST', '/portal/auth/request-link', 'portal.requestLink'),
    route('POST', '/portal/auth/exchange', 'portal.exchange'),
    route('POST', '/portal/auth/logout', 'portal.logout'),
    route('GET', '/portal/me', 'portal.me'),
    route('GET', '/portal/projects/:id', 'portal.project'),
    route('POST', '/portal/projects/:id/tasks/:taskId/approval', 'portal.approval'),
    route('POST', '/portal/projects/:id/requests', 'portal.createRequest'),

    route('GET', '/client-portal/projects/:id', 'portal-team.projectSharing'),
    route('PUT', '/client-portal/projects/:id/sharing', 'portal-team.setProjectSharing'),
    route('PUT', '/client-portal/tasks/:id', 'portal-team.setTaskSharing'),
    route('PUT', '/client-portal/attachments/:id', 'portal-team.setFileSharing'),
    route('POST', '/client-portal/contacts/:id/invite', 'portal-team.invite'),
    route('POST', '/client-portal/contacts/:id/revoke', 'portal-team.revoke'),
  ],
};
