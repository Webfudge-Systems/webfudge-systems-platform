const { seed } = require('../database/seeds/apps-and-modules');

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
};
