'use strict';

/**
 * organization custom router
 */

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/organizations/:id/users',
      handler: 'organization.getUsers',
      config: {
        auth: false, // Use custom JWT middleware
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'POST',
      path: '/organizations/:id/invite-users',
      handler: 'organization.inviteUsers',
      config: {
        auth: false, // Use custom JWT middleware
        policies: [],
        middlewares: [],
      }
    },
    {
      method: 'POST',
      path: '/organizations/:id/add-app',
      handler: 'organization.addApp',
      config: {
        auth: false, // Use custom JWT middleware
        policies: [],
        middlewares: [],
      }
    }
  ]
};
