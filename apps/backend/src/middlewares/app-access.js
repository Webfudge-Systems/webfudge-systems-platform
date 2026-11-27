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
  // Grow configuration + data tools (G2, G1, G4): same plan rules as the CRM data they change.
  'crm-pipelines': ['crm'],
  'crm-custom-fields': ['crm'],
  'crm-imports': ['crm'],
  'crm-duplicates': ['crm'],
  'crm-merge': ['crm'],
  // Grow: assignment / SLA (G5), settings (GF4, read by Work for industries), analytics (G15),
  // catalogue + quotes (G13)
  'crm-assignment-rules': ['crm'],
  'crm-lead-sla': ['crm'],
  'crm-settings': ['crm', 'pm'],
  'crm-analytics': ['crm'],
  'crm-products': ['crm'],
  'crm-price-books': ['crm'],
  'crm-quotes': ['crm'],
  // Meta Lead Ads settings (G6). The webhook carries no user, so this middleware lets it through.
  'crm-meta': ['crm'],
  // Lead capture settings (G7); the public /lead-capture endpoints check access themselves.
  'crm-lead-capture': ['crm'],
  // Saved views are used by both apps (W3 tasks, G3 Grow lists)
  'saved-views': ['crm', 'pm'],
  // Work: timesheets (W5), capacity (W6), portfolio (W11), retainers (W14), sprints (W7)
  timesheets: ['pm'],
  capacity: ['pm'],
  portfolio: ['pm'],
  retainers: ['pm'],
  sprints: ['pm'],
  // Client portal controls (W10). The client-facing /api/portal/* has no team user and checks the
  // portal session and plan feature itself.
  'client-portal': ['pm'],
  // Work hierarchy (W1)
  workspaces: ['pm'],
  'task-lists': ['pm'],
  // Project docs (W8)
  'project-docs': ['pm'],
  // Approvals & proofing (W9); the client side lives under /api/portal/*
  proofs: ['pm'],
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
