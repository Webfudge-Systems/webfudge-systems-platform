'use strict';

/**
 * invitation service
 */

const { createCoreService } = require('@strapi/strapi').factories;
const crypto = require('crypto');

module.exports = createCoreService('api::invitation.invitation', ({ strapi }) => ({
  async createInvitations(organizationId, emails, invitedById, role = 'User', permissions = {}) {
    const invitations = [];

    for (const email of emails) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await strapi.entityService.create('api::invitation.invitation', {
        data: {
          email,
          organization: organizationId,
          invitedBy: invitedById,
          role,
          permissions,
          token,
          status: 'pending',
          expiresAt,
          publishedAt: new Date()
        }
      });

      invitations.push(invitation);

      // TODO: Send invitation email
      console.log(`Invitation sent to ${email} with token: ${token}`);
    }

    return invitations;
  },

  async acceptInvitation(token, password) {
    const invitation = await strapi.entityService.findMany('api::invitation.invitation', {
      filters: { token, status: 'pending' },
      populate: {
        organization: true
      },
      limit: 1
    });

    if (!invitation || invitation.length === 0) {
      throw new Error('Invalid or expired invitation');
    }

    const inv = invitation[0];
    
    // Check if expired
    if (new Date(inv.expiresAt) < new Date()) {
      throw new Error('Invitation has expired');
    }

    // Check if user already exists
    let user = await strapi.query('plugin::users-permissions.user').findOne({
      where: { email: inv.email }
    });

    // If user doesn't exist, create one
    if (!user && password) {
      user = await strapi.plugins['users-permissions'].services.user.add({
        username: inv.email,
        email: inv.email,
        password,
        confirmed: true,
        blocked: false
      });
    } else if (!user) {
      throw new Error('User not found and no password provided');
    }

    // Add user to organization
    await strapi.entityService.create('api::organization-user.organization-user', {
      data: {
        user: user.id,
        organization: inv.organization.id,
        role: inv.role,
        customPermissions: inv.permissions,
        isActive: true,
        joinedAt: new Date(),
        publishedAt: new Date()
      }
    });

    // Update invitation status
    await strapi.entityService.update('api::invitation.invitation', inv.id, {
      data: {
        status: 'accepted',
        acceptedAt: new Date()
      }
    });

    // Generate JWT
    const jwt = strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id });

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      organization: inv.organization,
      token: jwt
    };
  }
}));
