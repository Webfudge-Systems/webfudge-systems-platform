'use strict';

/**
 * SaaS only: makes sure the public app catalogue and default plans exist.
 * Only creates missing rows, so prices edited in the Strapi admin are never overwritten.
 */

const APP_UID = 'api::app.app';
const PLAN_UID = 'api::plan.plan';

const APPS = [
  { slug: 'crm', name: 'CRM', tagline: 'Leads, contacts and deals in one pipeline', color: '#F5630F', order: 1, availability: 'available' },
  { slug: 'pm', name: 'Project Management', tagline: 'Tasks, timelines and team workload', color: '#1F4FFF', order: 2, availability: 'available' },
  { slug: 'books', name: 'Books', tagline: 'Invoices, payments and GST-ready accounts', color: '#0E9F6E', order: 3, availability: 'coming_soon' },
  { slug: 'hr', name: 'HR', tagline: 'People, leave and attendance', color: '#7A3FF2', order: 4, availability: 'coming_soon' },
];

const PLANS = [
  { code: 'free', name: 'Free', pricePerUserMonthly: 0, maxUsers: 3, order: 0, description: 'Try an app with a very small team.', features: ['Up to 3 users', 'Core features', 'Email support'] },
  { code: 'standard', name: 'Standard', pricePerUserMonthly: 499, order: 1, description: 'For small teams getting organised.', features: ['Everything in Free', 'Unlimited records', 'Roles and permissions', 'Email and chat support'] },
  { code: 'professional', name: 'Professional', pricePerUserMonthly: 999, order: 2, isPopular: true, description: 'For growing teams that need control.', features: ['Everything in Standard', 'Automations', 'Reports and dashboards', 'Links between your apps'] },
  { code: 'enterprise', name: 'Enterprise', pricePerUserMonthly: 1499, order: 3, description: 'For larger teams with stricter needs.', features: ['Everything in Professional', 'Audit logs and security controls', 'Priority support', 'Onboarding help'] },
];

async function ensureSaasCatalog(strapi) {
  for (const def of APPS) {
    let [app] = await strapi.entityService.findMany(APP_UID, { filters: { slug: def.slug }, limit: 1 });
    if (!app) {
      app = await strapi.entityService.create(APP_UID, { data: { ...def, description: def.tagline, isActive: true, basePrice: 0 } });
      console.log(`🧩 Added app "${def.name}" to the catalogue`);
    } else if (!app.availability || !app.tagline) {
      app = await strapi.entityService.update(APP_UID, app.id, {
        data: { availability: app.availability || def.availability, tagline: app.tagline || def.tagline },
      });
    }

    if (def.availability !== 'available') continue;
    const existing = await strapi.entityService.findMany(PLAN_UID, { filters: { app: app.id }, limit: 1 });
    if (existing.length) continue;
    for (const plan of PLANS) {
      await strapi.entityService.create(PLAN_UID, {
        data: { ...plan, app: app.id, yearlyDiscountPercent: 15, isActive: true, isPopular: Boolean(plan.isPopular) },
      });
    }
    console.log(`💳 Added default plans for "${def.name}"`);
  }
}

module.exports = { ensureSaasCatalog };
