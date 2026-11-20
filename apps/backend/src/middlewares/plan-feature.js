'use strict';

/**
 * SaaS only: route middleware that answers 402 PLAN_FEATURE_REQUIRED unless the organization's plan
 * includes the feature. Declare it on a route:
 *
 *   config: { middlewares: [{ name: 'global::plan-feature', config: { feature: 'pm.client_portal' } }] }
 *
 * Feature keys and the plan that unlocks them live in src/utils/saas-plans.js. No-op on Internal.
 */

const { isSaas } = require('../utils/platform');
const { FEATURES, requireFeature } = require('../utils/saas-plans');

module.exports = (config = {}, { strapi }) => {
  const key = config.feature;
  if (!FEATURES[key]) throw new Error(`global::plan-feature: unknown feature "${key}"`);
  return async (ctx, next) => {
    if (!isSaas() || !ctx.state.user || !ctx.state.orgId) return next();
    if (!(await requireFeature(ctx, strapi, key))) return;
    return next();
  };
};
