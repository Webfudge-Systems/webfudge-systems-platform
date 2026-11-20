'use strict';

/**
 * SaaS only: makes sure the public app catalogue and default plans exist.
 * Only creates missing rows, so prices edited in the Strapi admin are never overwritten.
 *
 * Plans per app (G16 Grow, W15 Work) keep the original plan codes so billing and existing
 * subscriptions are untouched: free = Free, standard = Pro, professional = Business.
 * Rows still holding the first catalogue's untouched defaults (Standard ₹499, Professional ₹999,
 * Enterprise ₹1,499, Free with 3 users) are moved onto the new names and prices once.
 */

const { PLAN_LIMITS } = require('./saas-plans');

const APP_UID = 'api::app.app';
const PLAN_UID = 'api::plan.plan';
const SUB_UID = 'api::subscription.subscription';

const APPS = [
  { slug: 'crm', name: 'CRM', tagline: 'Leads, contacts and deals in one pipeline', color: '#F5630F', order: 1, availability: 'available' },
  { slug: 'pm', name: 'Project Management', tagline: 'Tasks, timelines and team workload', color: '#1F4FFF', order: 2, availability: 'available' },
  { slug: 'books', name: 'Books', tagline: 'Invoices, payments and GST-ready accounts', color: '#0E9F6E', order: 3, availability: 'coming_soon' },
  { slug: 'hr', name: 'HR', tagline: 'People, leave and attendance', color: '#7A3FF2', order: 4, availability: 'coming_soon' },
];

const plan = (app, code, rest) => ({ code, ...PLAN_LIMITS[app][code], ...rest });

const PLANS = {
  crm: [
    plan('crm', 'free', { tier: 'free', name: 'Free', pricePerUserMonthly: 0, order: 0, description: 'For a founder and one teammate.', features: ['Up to 2 users', 'Up to 500 contacts', 'Leads, deals and pipeline', 'Email support'] }),
    plan('crm', 'standard', { tier: 'pro', name: 'Pro', pricePerUserMonthly: 599, order: 1, isPopular: true, description: 'For sales teams that are growing.', features: ['Everything in Free', 'Unlimited users and contacts', 'Automations and assignment rules', 'Reports and dashboards'] }),
    plan('crm', 'professional', { tier: 'business', name: 'Business', pricePerUserMonthly: 1199, order: 2, description: 'For teams that sell with AI.', features: ['Everything in Pro', 'AI SDR', 'Call coach', 'Sales forecast'] }),
  ],
  pm: [
    plan('pm', 'free', { tier: 'free', name: 'Free', pricePerUserMonthly: 0, order: 0, description: 'For a small team getting organised.', features: ['Up to 5 users', 'Projects, tasks and timelines', 'Email support'] }),
    plan('pm', 'standard', { tier: 'pro', name: 'Pro', pricePerUserMonthly: 349, order: 1, isPopular: true, description: 'For teams running client work.', features: ['Everything in Free', 'Unlimited users', 'Timesheets and capacity', 'Reports and dashboards'] }),
    plan('pm', 'professional', { tier: 'business', name: 'Business', pricePerUserMonthly: 699, order: 2, description: 'For agencies that bill clients.', features: ['Everything in Pro', 'Client portal', 'Project profitability', 'AI teammates'] }),
  ],
};

// The first catalogue's defaults. A row that still matches is treated as untouched.
const OLD_DEFAULTS = {
  free: { name: 'Free', price: 0 },
  standard: { name: 'Standard', price: 499 },
  professional: { name: 'Professional', price: 999 },
  enterprise: { name: 'Enterprise', price: 1499 },
};

const isUntouched = (row) => {
  const old = OLD_DEFAULTS[row.code];
  if (!old || row.name !== old.name || Number(row.pricePerUserMonthly) !== old.price) return false;
  // Free keeps its name and price, so the old 3-user limit is what marks it as untouched.
  return row.code !== 'free' || row.maxUsers == null || row.maxUsers === 3;
};

/** Brings an app's existing plan rows in line with the G16/W15 tiers without overwriting admin edits. */
async function syncPlans(strapi, app, slug) {
  const rows = await strapi.entityService.findMany(PLAN_UID, { filters: { app: app.id }, limit: 50 });
  for (const row of rows) {
    const def = PLANS[slug].find((p) => p.code === row.code);
    const data = {};
    if (def && isUntouched(row)) {
      Object.assign(data, {
        name: def.name,
        pricePerUserMonthly: def.pricePerUserMonthly,
        description: def.description,
        features: def.features,
        isPopular: Boolean(def.isPopular),
        order: def.order,
      });
      if (row.code === 'free') data.maxUsers = def.maxUsers;
    } else if (row.code === 'enterprise' && isUntouched(row) && row.isActive !== false) {
      // Not part of the new tiers. Hidden unless someone is on it (they keep Business features).
      const inUse = await strapi.entityService.count(SUB_UID, { filters: { plan: row.id } });
      if (!inUse) data.isActive = false;
    }
    // New fields: fill only when empty.
    const limits = PLAN_LIMITS[slug]?.[row.code];
    if (row.tier == null && def) data.tier = def.tier;
    if (row.tier == null && row.code === 'enterprise') data.tier = 'business';
    if (limits && row.maxContacts == null && limits.maxContacts != null) data.maxContacts = limits.maxContacts;
    if (limits && row.aiCreditsMonthly == null) data.aiCreditsMonthly = limits.aiCreditsMonthly;
    if (Object.keys(data).length) {
      await strapi.entityService.update(PLAN_UID, row.id, { data });
      console.log(`💳 Updated ${slug} plan "${row.code}" (${Object.keys(data).join(', ')})`);
    }
  }
}

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

    if (def.availability !== 'available' || !PLANS[def.slug]) continue;
    const existing = await strapi.entityService.findMany(PLAN_UID, { filters: { app: app.id }, limit: 1 });
    if (existing.length) {
      await syncPlans(strapi, app, def.slug);
      continue;
    }
    for (const p of PLANS[def.slug]) {
      await strapi.entityService.create(PLAN_UID, {
        data: { ...p, app: app.id, yearlyDiscountPercent: 15, isActive: true, isPopular: Boolean(p.isPopular) },
      });
    }
    console.log(`💳 Added default plans for "${def.name}"`);
  }
}

module.exports = { ensureSaasCatalog, PLANS };
