'use strict';

/**
 * Meta Lead Ads (G6, SaaS only). Auth is checked inside the controller: settings routes need the
 * global jwt-auth user + org; the webhook is verified by X-Hub-Signature-256 and the OAuth
 * callback by its signed state.
 */
const UID = 'api::crm-meta-connection.crm-meta-connection';
const route = (method, path, handler) => ({
  method,
  path,
  handler: `${UID}.${handler}`,
  config: { auth: false, policies: [], middlewares: [] },
});

module.exports = {
  type: 'content-api',
  routes: [
    route('GET', '/crm-meta/webhook', 'webhookVerify'),
    route('POST', '/crm-meta/webhook', 'webhookReceive'),
    route('GET', '/crm-meta/oauth/callback', 'oauthCallback'),
    route('GET', '/crm-meta/connection', 'status'),
    route('DELETE', '/crm-meta/connection', 'disconnect'),
    route('POST', '/crm-meta/connect', 'connect'),
    route('GET', '/crm-meta/pages', 'pages'),
    route('POST', '/crm-meta/page', 'selectPage'),
    route('GET', '/crm-meta/forms', 'forms'),
    route('PUT', '/crm-meta/forms', 'saveForms'),
    route('POST', '/crm-meta/backfill', 'backfill'),
  ],
};
