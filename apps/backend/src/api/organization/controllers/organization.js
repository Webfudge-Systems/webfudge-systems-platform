'use strict';

/**
 * organization controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::organization.organization', ({ strapi }) => ({
  // Custom create with onboarding
  async create(ctx) {
    const user = ctx.state.user;
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { 
      name, 
      companyEmail, 
      companyPhone, 
      website, 
      address, 
      industry, 
      size,
      appId,
      moduleIds,
      userCount,
      invitedEmails 
    } = ctx.request.body;

    try {
      // Call onboarding service
      const result = await strapi.service('api::organization.organization').createWithOnboarding({
        userId: user.id,
        organizationData: { name, companyEmail, companyPhone, website, address, industry, size },
        appId,
        moduleIds,
        userCount: userCount || 1,
        invitedEmails: invitedEmails || []
      });

      return ctx.send({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Organization creation error:', error);
      const msg = error.message || '';
      // Map Strapi unique constraint (slug from name) to the form field
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('already exists')) {
        return ctx.badRequest(
          'Company name already exists. Please choose a different organization name.',
          { field: 'name' }
        );
      }
      return ctx.badRequest(msg || 'Failed to create organization');
    }
  },

  // Get organization with related data
  async findOne(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;

    try {
      // Check user access
      const hasAccess = await strapi.service('api::organization.organization').checkUserAccess(id, user.id);
      if (!hasAccess) {
        return ctx.forbidden('You do not have access to this organization');
      }

      const organization = await strapi.entityService.findOne('api::organization.organization', id, {
        populate: {
          owner: true,
          subscriptions: {
            populate: {
              app: true,
              selectedModules: true
            }
          },
          organizationUsers: {
            populate: {
              user: true
            }
          }
        }
      });

      return ctx.send({
        success: true,
        data: organization
      });
    } catch (error) {
      console.error('Error fetching organization:', error);
      return ctx.badRequest(error.message);
    }
  },

  // Get users in organization
  async getUsers(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;

    try {
      const hasAccess = await strapi.service('api::organization.organization').checkUserAccess(id, user.id);
      if (!hasAccess) {
        return ctx.forbidden('You do not have access to this organization');
      }

      const orgUsers = await strapi.entityService.findMany('api::organization-user.organization-user', {
        filters: { organization: id, isActive: true },
        populate: {
          user: {
            fields: ['id', 'email', 'username', 'firstName', 'lastName']
          }
        }
      });

      return ctx.send({
        success: true,
        data: orgUsers
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      return ctx.badRequest(error.message);
    }
  },

  // Invite users to organization
  async inviteUsers(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    const { emails, role, permissions } = ctx.request.body;

    try {
      const hasAccess = await strapi.service('api::organization.organization').checkUserAccess(id, user.id);
      if (!hasAccess) {
        return ctx.forbidden('You do not have access to this organization');
      }

      const invitations = await strapi.service('api::invitation.invitation').createInvitations(
        id,
        emails,
        user.id,
        role,
        permissions
      );

      return ctx.send({
        success: true,
        data: invitations
      });
    } catch (error) {
      console.error('Error inviting users:', error);
      return ctx.badRequest(error.message);
    }
  },

  // Add app to existing organization
  async addApp(ctx) {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    if (!user) {
      return ctx.unauthorized('You must be logged in');
    }

    const { appId, moduleIds, userCount, invitedEmails } = ctx.request.body;

    try {
      // Check user access
      const hasAccess = await strapi.service('api::organization.organization').checkUserAccess(id, user.id);
      if (!hasAccess) {
        return ctx.forbidden('You do not have access to this organization');
      }

      // Add app subscription to organization
      const result = await strapi.service('api::organization.organization').addAppToOrganization({
        organizationId: id,
        userId: user.id,
        appId,
        moduleIds,
        userCount: userCount || 1,
        invitedEmails: invitedEmails || []
      });

      return ctx.send({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error adding app to organization:', error);
      const msg = error.message || '';
      if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('already exists')) {
        return ctx.badRequest(
          'This app is already added to the selected organization.',
          { field: 'organization' }
        );
      }
      return ctx.badRequest(msg || 'Failed to add app');
    }
  }
}));
