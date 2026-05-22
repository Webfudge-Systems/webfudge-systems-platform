const { seed } = require('../database/seeds/apps-and-modules');
const rbac = require('./constants/rbac-app-matrix');
const {
  resolveOrganizationRoleId,
  assignMembershipRole,
  ORG_ROLE_UID,
  ORG_MEMBERSHIP_UID,
} = require('./utils/organization-role');
const redis = require('./utils/redis');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    console.log('🚀 Strapi is bootstrapping...');

    if (redis.isRedisConfigured()) {
      const hostHint = (redis.resolveRedisUrl() || '').replace(/:[^:@]+@/, ':****@');
      try {
        const ok = await redis.ping();
        console.log(ok ? `✅ Redis connected (${hostHint})` : '⚠️ Redis configured but ping failed');
      } catch (e) {
        console.warn('⚠️ Redis unavailable — API will run without cache:', e?.message || e);
      }
    } else {
      console.log('ℹ️ Redis not configured (optional). Set REDIS_URL to enable caching.');
    }

    const forceSeed = process.env.SEED_DATA === 'true';
    let runSeed = forceSeed;
    if (!runSeed) {
      const anyApp = await strapi.entityService.findMany('api::app.app', { limit: 1 });
      runSeed = !anyApp?.length;
    }

    if (runSeed) {
      console.log(
        forceSeed
          ? '🌱 Running database seeds (SEED_DATA=true)...'
          : '🌱 No apps in database — running default app/module seeds...'
      );
      try {
        await seed(strapi);
      } catch (error) {
        console.error('❌ Seeding failed:', error);
      }
    }

    // Seed default organization roles for membership templates
    try {
      const defaultOrgRoles = [
        {
          name: 'Admin',
          code: 'admin',
          accessLevel: 'high',
          description: 'Full organization administration access.',
          isSystem: true,
        },
        {
          name: 'Manager',
          code: 'manager',
          accessLevel: 'medium',
          description: 'Operational management access with limited administration.',
          isSystem: true,
        },
        {
          name: 'Member',
          code: 'member',
          accessLevel: 'basic',
          description: 'Standard member access to assigned workspace features.',
          isSystem: true,
        },
      ];

      for (const role of defaultOrgRoles) {
        const perms = rbac.defaultPermissionsForSystemCode(role.code);
        const existing = await strapi.entityService.findMany(ORG_ROLE_UID, {
          filters: {
            $and: [{ name: role.name }, { organization: { $null: true } }],
          },
          limit: 1,
        });
        if (existing.length === 0) {
          await strapi.entityService.create(ORG_ROLE_UID, {
            data: { ...role, permissions: perms },
          });
        } else {
          /** @type {any} */
          const row = existing[0];
          const empty =
            !row.permissions ||
            (typeof row.permissions === 'object' && Object.keys(row.permissions).length === 0);
          if (empty) {
            await strapi.entityService.update(ORG_ROLE_UID, row.id, {
              data: { permissions: perms },
            });
          }
        }
      }

      const memberRoleId = await resolveOrganizationRoleId(strapi, 'Member');
      const memberships = await strapi.entityService.findMany(ORG_MEMBERSHIP_UID, {
        populate: {
          role: true,
          user: { fields: ['id'] },
          organization: { populate: { owner: { fields: ['id'] } } },
        },
        limit: 1000,
      });

      for (const membership of memberships) {
        /** @type {any} */
        const row = membership;
        const userId = typeof row.user === 'object' ? row.user?.id : row.user;
        const org = row.organization;
        const ownerId = typeof org?.owner === 'object' ? org.owner?.id : org?.owner;
        const isOwner = userId && ownerId && String(userId) === String(ownerId);
        const roleCode = String(row.role?.code || '').toLowerCase();
        const hasRole = Boolean(row.role?.id || row.role);

        if (isOwner) {
          if (!hasRole || roleCode === 'member') {
            await assignMembershipRole(strapi, row.id, 'Admin');
          }
          continue;
        }

        if (!hasRole) {
          await assignMembershipRole(strapi, row.id, memberRoleId);
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not seed organization roles:', e?.message || e);
    }

    // Allow REST access to direct-messages (custom JWT in middleware; Strapi sees unauthenticated)
    try {
      const roleTypes = ['public', 'authenticated'];
      const actions = [
        'api::direct-message.direct-message.find',
        'api::direct-message.direct-message.findOne',
        'api::direct-message.direct-message.create',
      ];
      for (const type of roleTypes) {
        const role = await strapi.db.query('plugin::users-permissions.role').findOne({
          where: { type },
        });
        if (!role) continue;
        for (const action of actions) {
          const existing = await strapi.db.query('plugin::users-permissions.permission').findOne({
            where: { action, role: role.id },
          });
          if (existing) continue;
          await strapi.db.query('plugin::users-permissions.permission').create({
            data: { action, role: role.id, enabled: true },
          });
        }
      }
    } catch (e) {
      console.warn('⚠️ Could not auto-grant direct-message permissions:', e?.message || e);
    }

    console.log('✅ Bootstrap complete!');
  },

  async destroy() {
    await redis.disconnect();
  },
};
