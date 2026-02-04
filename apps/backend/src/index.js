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

    // Check if we should run seeds
    const shouldSeed = process.env.SEED_DATA === 'true';
    
    if (shouldSeed) {
      console.log('🌱 Running database seeds...');
      try {
        await seed();
      } catch (error) {
        console.error('❌ Seeding failed:', error);
      }
    }

    console.log('✅ Bootstrap complete!');
  },
};
