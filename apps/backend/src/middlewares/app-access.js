'use strict';

/**
 * SaaS only: blocks app data APIs when the organization has no subscription for that app,
 * makes them read-only after a trial or paid period ends, and locks them after the grace period.
 * Runs after jwt-auth (needs ctx.state.orgId). Internal deployments skip it entirely.
 */

const { isSaas } = require('../utils/platform');
const { getOrgAccess } = require('../utils/saas-access');

// API prefix → apps that unlock it. Shared resources open with any of the listed apps.
const RESOURCE_APPS = {
  'lead-companies': ['crm'],
  contacts: ['crm'],
  deals: ['crm'],
  proposals: ['crm'],
  meetings: ['crm'],
  'crm-activities': ['crm'],
  'client-accounts': ['crm', 'pm'],
  invoices: ['crm'],
  projects: ['crm', 'pm'],
  tasks: ['crm', 'pm'],
  documents: ['crm', 'pm'],
};

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const RANK = { full: 3, read_only: 2, locked: 1, none: 0 };

function deny(ctx, status, code, message, apps) {
  ctx.status = status;
  ctx.body = { data: null, error: { status, name: 'AppAccessError', message, details: { code, apps } } };
}

module.exports = (_config, { strapi }) => {
  const saas = isSaas();
  return async (ctx, next) => {
    if (!saas || !ctx.path.startsWith('/api/')) return next();
    const resource = ctx.path.slice(5).split('/')[0];
    const apps = RESOURCE_APPS[resource];
    if (!apps || !ctx.state.user) return next();

    const orgId = ctx.state.orgId;
    if (!orgId) return deny(ctx, 403, 'NO_ORGANIZATION', 'Create or join an organization first.', apps);

    const access = await getOrgAccess(strapi, orgId);
    const best = apps
      .map((slug) => access[slug]?.access || 'none')
      .sort((a, b) => RANK[b] - RANK[a])[0];

    if (best === 'none') {
      return deny(ctx, 403, 'APP_NOT_SUBSCRIBED', 'Your organization has not added this app yet.', apps);
    }
    if (best === 'locked') {
      return deny(ctx, 402, 'APP_LOCKED', 'This app is locked. Choose a plan in Webfudge Accounts to unlock it.', apps);
    }
    if (best === 'read_only' && !READ_METHODS.has(ctx.method)) {
      return deny(ctx, 402, 'APP_READ_ONLY', 'This app is read-only until you choose a plan.', apps);
    }
    return next();
  };
};
