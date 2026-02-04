'use strict';

const jwt = require('jsonwebtoken');

// JWT secret - use environment variable or fallback
const JWT_SECRET = process.env.JWT_SECRET || 'myJwtSecret123456789012345678901234567890';

module.exports = (config, { strapi }) => {
  return async (ctx, next) => {
    try {
      // Get token from Authorization header
      const authHeader = ctx.request.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // No token - continue without user (public routes)
        return await next();
      }

      const token = authHeader.replace('Bearer ', '');

      // Verify JWT token
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (err) {
        // Invalid token - continue without user
        return await next();
      }

      // Type guard to ensure 'decoded' is an object with an 'id' property
      if (typeof decoded === 'string' || !decoded || !('id' in decoded)) {
        return await next();
      }

      // Get user from database
      const user = await strapi.query('plugin::users-permissions.user').findOne({
        where: { id: decoded.id }
      });

      if (user && !user.blocked) {
        // Set user in context for controllers to use
        ctx.state.user = user;
      }

      return await next();
    } catch (error) {
      console.error('JWT Auth Middleware Error:', error);
      return await next();
    }
  };
};
