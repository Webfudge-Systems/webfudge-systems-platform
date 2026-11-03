'use strict';

const jwt = require('jsonwebtoken');
const { membershipSummary } = require('../utils/rbac');
const { jwtSecret } = require('../utils/platform');

const JWT_SECRET = jwtSecret();

module.exports = (config, { strapi }) => {
  // Resolves ctx.state.user / org first, then calls next() exactly once. Errors thrown further down
  // the chain must propagate (calling next() again from a catch would run the route twice).
  async function resolveAuth(ctx) {
    try {
      // Get token from Authorization header
      const authHeader = ctx.request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return;
      }

      const token = authHeader.replace('Bearer ', '');

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return;
      }

      if (typeof decoded === 'string' || !decoded || !('id' in decoded)) {
        return;
      }

      // Get user from database
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: decoded.id },
      });

      if (user && !user.blocked) {
        ctx.state.user = user;

        // Resolve active organization from X-Organization-Id header
        const orgIdHeader = ctx.request.headers['x-organization-id'];
        if (orgIdHeader) {
          const orgId = parseInt(orgIdHeader, 10);
          if (!isNaN(orgId) && orgId > 0) {
            // Verify the user actually belongs to this org and is active
            const membership = await strapi.entityService.findMany(
              'api::organization-user.organization-user',
              {
                filters: { user: user.id, organization: orgId, isActive: true },
                limit: 1,
                populate: { role: true },
              }
            );
            if (membership.length > 0) {
              const summary = membershipSummary(membership[0]);
              ctx.state.orgId = orgId;
              ctx.state.orgRole = summary.role;
              ctx.state.orgRoleCode = summary.roleCode;
              ctx.state.orgRoleDetails = membership[0]?.role || null;
              ctx.state.orgMembership = membership[0];
              ctx.state.orgPermissions = summary.permissions;
              ctx.state.effectivePermissions = summary.permissions;
            }
          }
        }

        // Fallback: if no org header, auto-pick the first active org for this user
        if (!ctx.state.orgId) {
          const firstMembership = await strapi.entityService.findMany(
            'api::organization-user.organization-user',
            {
              filters: { user: user.id, isActive: true },
              sort: { joinedAt: 'ASC' },
              limit: 1,
              populate: { organization: true, role: true },
            }
          );
          if (firstMembership.length > 0 && firstMembership[0].organization) {
            const summary = membershipSummary(firstMembership[0]);
            ctx.state.orgId = firstMembership[0].organization.id;
            ctx.state.orgRole = summary.role;
            ctx.state.orgRoleCode = summary.roleCode;
            ctx.state.orgRoleDetails = firstMembership[0]?.role || null;
            ctx.state.orgMembership = firstMembership[0];
            ctx.state.orgPermissions = summary.permissions;
            ctx.state.effectivePermissions = summary.permissions;
          }
        }
      }

      return;
    } catch (error) {
      console.error('JWT Auth Middleware Error:', error);
    }
  }

  return async (ctx, next) => {
    await resolveAuth(ctx);
    return next();
  };
};
