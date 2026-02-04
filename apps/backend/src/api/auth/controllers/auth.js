'use strict';

const jwt = require('jsonwebtoken');

// JWT secret - use environment variable or fallback to default
const JWT_SECRET = process.env.JWT_SECRET || 'myJwtSecret123456789012345678901234567890';

module.exports = {
  async signup(ctx) {
    const { email, password, firstName, lastName } = ctx.request.body;

    if (!email || !password) {
      return ctx.badRequest('Email and password are required');
    }

    try {
      // Check if user exists
      const existingUser = await strapi.query('plugin::users-permissions.user').findOne({
        where: { email: email.toLowerCase() }
      });

      if (existingUser) {
        return ctx.badRequest('Email already exists');
      }

      // Create user
      const user = await strapi.plugins['users-permissions'].services.user.add({
        username: email,
        email: email.toLowerCase(),
        password,
        firstName,
        lastName,
        confirmed: true,
        blocked: false,
        provider: 'local'
      });

      // Generate JWT manually
      const token = jwt.sign(
        { id: user.id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Get user organizations
      const organizations = await strapi.entityService.findMany('api::organization-user.organization-user', {
        filters: { user: user.id, isActive: true },
        populate: {
          organization: true
        }
      });

      ctx.send({
        jwt: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        organizations: organizations.map(ou => ou.organization)
      });
    } catch (error) {
      console.error('Signup error:', error);
      ctx.badRequest(error.message);
    }
  },

  async login(ctx) {
    const { identifier, password } = ctx.request.body;

    if (!identifier || !password) {
      return ctx.badRequest('Identifier and password are required');
    }

    try {
      // Validate credentials
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: {
          $or: [
            { email: identifier.toLowerCase() },
            { username: identifier }
          ]
        }
      });

      if (!user) {
        return ctx.badRequest('Invalid credentials');
      }

      // Validate password
      const validPassword = await strapi.plugins['users-permissions'].services.user.validatePassword(
        password,
        user.password
      );

      if (!validPassword) {
        return ctx.badRequest('Invalid credentials');
      }

      if (user.blocked) {
        return ctx.badRequest('Your account has been blocked');
      }

      // Generate JWT manually
      const token = jwt.sign(
        { id: user.id },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      // Get user organizations
      const organizations = await strapi.entityService.findMany('api::organization-user.organization-user', {
        filters: { user: user.id, isActive: true },
        populate: {
          organization: {
            populate: {
              subscriptions: {
                populate: {
                  app: true
                }
              }
            }
          }
        }
      });

      ctx.send({
        jwt: token,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        organizations: organizations.map(ou => ou.organization)
      });
    } catch (error) {
      console.error('Login error:', error);
      ctx.badRequest(error.message);
    }
  },

  async me(ctx) {
    try {
      // Get token from Authorization header
      const authHeader = ctx.request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return ctx.unauthorized('Missing or invalid authorization header');
      }

      const token = authHeader.replace('Bearer ', '');

      // Verify JWT token manually
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        return ctx.unauthorized('Invalid or expired token');
      }

      // Ensure decoded is an object with id property
      if (typeof decoded === 'string' || !decoded || !decoded.id) {
        return ctx.unauthorized('Invalid token format');
      }

      // Get user from database
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: decoded.id }
      });

      if (!user || user.blocked) {
        return ctx.unauthorized('User not found or blocked');
      }

      // Get user organizations
      const organizations = await strapi.entityService.findMany('api::organization-user.organization-user', {
        filters: { user: user.id, isActive: true },
        populate: {
          organization: {
            populate: {
              subscriptions: {
                populate: {
                  app: true,
                  selectedModules: true
                }
              }
            }
          }
        }
      });

      ctx.send({
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName
        },
        organizations: organizations.map(ou => ({
          ...ou.organization,
          role: ou.role,
          joinedAt: ou.joinedAt
        }))
      });
    } catch (error) {
      console.error('Me error:', error);
      ctx.badRequest(error.message);
    }
  }
};
