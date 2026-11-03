'use strict';

// Auth is checked inside the controller (our own JWT middleware sets ctx.state.user).
const route = (method, path, handler) => ({
  method,
  path,
  handler: `saas.${handler}`,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  routes: [
    route('GET', '/saas/catalog', 'catalog'),
    route('GET', '/saas/home', 'home'),
    route('GET', '/saas/access', 'access'),
    route('POST', '/saas/organizations', 'createOrganization'),
    route('GET', '/saas/organizations/:id', 'organization'),
    route('POST', '/saas/organizations/:id/trials', 'startTrials'),
    route('POST', '/saas/organizations/:id/onboarding-complete', 'completeOnboarding'),
    route('POST', '/saas/organizations/:id/invitations', 'invite'),
    route('GET', '/saas/organizations/:id/invitations', 'pendingInvitations'),
    route('DELETE', '/saas/organizations/:id/invitations/:invitationId', 'revokeInvitation'),
    route('GET', '/saas/invitations/:token', 'invitation'),
    route('POST', '/saas/invitations/:token/accept', 'acceptInvitation'),
    route('POST', '/saas/invitations/:token/decline', 'declineInvitation'),
    route('POST', '/saas/invitations/:token/register', 'registerFromInvitation'),
  ],
};
