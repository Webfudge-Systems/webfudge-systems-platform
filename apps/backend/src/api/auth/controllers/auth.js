'use strict';

const jwt = require('jsonwebtoken');
const { normalizeUserUsername, uniqueUsernameFromEmail } = require('../../../utils/user-username');
const { jwtSecret, isSaas } = require('../../../utils/platform');
const {
  ensureActiveOrganizationMembership,
  organizationPayload,
  userPayload,
  signToken,
  sessionPayload,
  normalizeEmail,
  isEmail,
  passwordProblem,
} = require('../../../utils/auth-session');
const { issueCode, consumeCode, CodeError } = require('../../../utils/verification-codes');

const JWT_SECRET = jwtSecret();

const USER_UID = 'plugin::users-permissions.user';

function codeErrorResponse(ctx, error) {
  if (error instanceof CodeError) {
    return ctx.badRequest(error.message, { code: error.code, retryAfter: error.retryAfter });
  }
  throw error;
}

async function findUserByEmail(email) {
  return strapi.query(USER_UID).findOne({ where: { email: normalizeEmail(email) } });
}

async function userFromBearer(ctx) {
  const authHeader = ctx.request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  try {
    const decoded = jwt.verify(authHeader.replace('Bearer ', ''), JWT_SECRET);
    if (!decoded || typeof decoded === 'string' || !decoded.id) return null;
    const user = await strapi.query(USER_UID).findOne({ where: { id: decoded.id } });
    return user && !user.blocked ? user : null;
  } catch (_) {
    return null;
  }
}

module.exports = {
  async signup(ctx) {
    const { email, password, firstName, lastName, phone } = ctx.request.body || {};

    if (!email || !password) {
      return ctx.badRequest('Email and password are required');
    }

    try {
      const normalizedEmail = normalizeEmail(email);
      const existingUser = await findUserByEmail(normalizedEmail);

      if (isSaas()) {
        if (!isEmail(normalizedEmail)) return ctx.badRequest('Enter a valid email address.', { field: 'email' });
        if (!String(firstName || '').trim()) return ctx.badRequest('Enter your name.', { field: 'firstName' });
        const weak = passwordProblem(password);
        if (weak) return ctx.badRequest(weak, { field: 'password' });

        if (existingUser && existingUser.confirmed) {
          return ctx.badRequest('An account with this email already exists. Sign in instead.', {
            field: 'email',
            code: 'EMAIL_TAKEN',
          });
        }

        const profile = {
          password,
          firstName: String(firstName).trim(),
          lastName: String(lastName || '').trim(),
          phone: String(phone || '').replace(/[^\d+]/g, '').slice(0, 20) || null,
        };
        if (existingUser) {
          // Unverified sign-up started earlier: let them start again with the new details.
          await strapi.plugins['users-permissions'].services.user.edit(existingUser.id, profile);
        } else {
          await strapi.plugins['users-permissions'].services.user.add({
            ...profile,
            username: await uniqueUsernameFromEmail(strapi, normalizedEmail),
            email: normalizedEmail,
            confirmed: false,
            blocked: false,
            provider: 'local',
          });
        }

        try {
          await issueCode(strapi, normalizedEmail, 'verify_email');
        } catch (error) {
          if (!(error instanceof CodeError)) throw error;
        }
        return ctx.send({ requiresVerification: true, email: normalizedEmail });
      }

      if (existingUser) {
        return ctx.badRequest('Email already exists');
      }

      const user = await strapi.plugins['users-permissions'].services.user.add({
        username: await uniqueUsernameFromEmail(strapi, normalizedEmail),
        email: normalizedEmail,
        password,
        firstName,
        lastName,
        confirmed: true,
        blocked: false,
        provider: 'local'
      });

      ctx.send(await sessionPayload(user));
    } catch (error) {
      console.error('Signup error:', error);
      ctx.badRequest(error.message);
    }
  },

  async login(ctx) {
    const { identifier, password } = ctx.request.body || {};

    if (!identifier || !password) {
      return ctx.badRequest('Identifier and password are required');
    }

    try {
      // Validate credentials
      let user = await strapi.query(USER_UID).findOne({
        where: {
          $or: [
            { email: String(identifier).toLowerCase() },
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

      if (isSaas() && !user.confirmed) {
        try {
          await issueCode(strapi, user.email, 'verify_email');
        } catch (error) {
          if (!(error instanceof CodeError)) throw error;
        }
        return ctx.badRequest('Confirm your email to continue. We sent you a new code.', {
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        });
      }

      user = await normalizeUserUsername(strapi, user);
      ctx.send(await sessionPayload(user));
    } catch (error) {
      console.error('Login error:', error);
      ctx.badRequest(error.message);
    }
  },

  async me(ctx) {
    try {
      let user = await userFromBearer(ctx);
      if (!user) {
        return ctx.unauthorized('Invalid or expired token');
      }
      user = await normalizeUserUsername(strapi, user);

      const organizations = await ensureActiveOrganizationMembership(user);

      ctx.send({
        user: userPayload(user),
        organizations: organizations.map(organizationPayload)
      });
    } catch (error) {
      console.error('Me error:', error);
      ctx.badRequest(error.message);
    }
  },

  /** SaaS: confirm the sign-up email with the 6-digit code; signs the user in. */
  async verifyEmail(ctx) {
    const { email, code } = ctx.request.body || {};
    const user = await findUserByEmail(email);
    if (!user || user.blocked) return ctx.badRequest('This code has expired. Ask for a new one.', { code: 'CODE_EXPIRED' });
    try {
      await consumeCode(strapi, user.email, 'verify_email', code);
    } catch (error) {
      return codeErrorResponse(ctx, error);
    }
    const confirmed = user.confirmed ? user : await strapi.plugins['users-permissions'].services.user.edit(user.id, { confirmed: true });
    ctx.send(await sessionPayload(confirmed));
  },

  /** SaaS: send a new code. Always answers the same way so it can't be used to discover accounts. */
  async resendCode(ctx) {
    const { email, purpose = 'verify_email' } = ctx.request.body || {};
    if (!['verify_email', 'reset_password'].includes(purpose)) return ctx.badRequest('Unknown purpose');
    const user = await findUserByEmail(email);
    const eligible = user && !user.blocked && (purpose === 'reset_password' || !user.confirmed);
    if (eligible) {
      try {
        await issueCode(strapi, user.email, purpose);
      } catch (error) {
        return codeErrorResponse(ctx, error);
      }
    }
    ctx.send({ ok: true });
  },

  async forgotPassword(ctx) {
    const { email } = ctx.request.body || {};
    if (!isEmail(normalizeEmail(email))) return ctx.badRequest('Enter a valid email address.', { field: 'email' });
    const user = await findUserByEmail(email);
    if (user && !user.blocked) {
      try {
        await issueCode(strapi, user.email, 'reset_password');
      } catch (error) {
        return codeErrorResponse(ctx, error);
      }
    }
    ctx.send({ ok: true });
  },

  async resetPassword(ctx) {
    const { email, code, password } = ctx.request.body || {};
    const weak = passwordProblem(password);
    if (weak) return ctx.badRequest(weak, { field: 'password' });
    const user = await findUserByEmail(email);
    if (!user || user.blocked) return ctx.badRequest('This code has expired. Ask for a new one.', { code: 'CODE_EXPIRED' });
    try {
      await consumeCode(strapi, user.email, 'reset_password', code);
    } catch (error) {
      return codeErrorResponse(ctx, error);
    }
    // Reaching the inbox also proves the email address.
    const updated = await strapi.plugins['users-permissions'].services.user.edit(user.id, { password, confirmed: true });
    ctx.send(await sessionPayload(updated));
  },

  async updateProfile(ctx) {
    const user = await userFromBearer(ctx);
    if (!user) return ctx.unauthorized('Sign in again to continue.');
    const { firstName, lastName, phone } = ctx.request.body || {};
    if (firstName !== undefined && !String(firstName).trim()) return ctx.badRequest('Enter your name.', { field: 'firstName' });
    const data = {};
    if (firstName !== undefined) data.firstName = String(firstName).trim().slice(0, 80);
    if (lastName !== undefined) data.lastName = String(lastName).trim().slice(0, 80);
    if (phone !== undefined) data.phone = String(phone || '').replace(/[^\d+]/g, '').slice(0, 20) || null;
    const updated = await strapi.plugins['users-permissions'].services.user.edit(user.id, data);
    ctx.send({ user: userPayload(updated) });
  },

  async changePassword(ctx) {
    const user = await userFromBearer(ctx);
    if (!user) return ctx.unauthorized('Sign in again to continue.');
    const { currentPassword, newPassword } = ctx.request.body || {};
    const valid = await strapi.plugins['users-permissions'].services.user.validatePassword(
      String(currentPassword || ''),
      user.password
    );
    if (!valid) return ctx.badRequest('Your current password is not right.', { field: 'currentPassword' });
    const weak = passwordProblem(newPassword);
    if (weak) return ctx.badRequest(weak, { field: 'newPassword' });
    await strapi.plugins['users-permissions'].services.user.edit(user.id, { password: newPassword });
    ctx.send({ ok: true, jwt: signToken(user) });
  },
};

