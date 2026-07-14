'use strict';

/**
 * Internal webhook routes — auth is a shared secret header checked in the
 * controller (X-Webhook-Secret vs RE_WEBHOOK_SECRET), not a user JWT.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/re-webhooks/project-by-campaign/:campaignId',
      handler: 'real-estate-webhook.projectByCampaign',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'GET',
      path: '/re-webhooks/leads/:id',
      handler: 'real-estate-webhook.leadById',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'POST',
      path: '/re-webhooks/leads',
      handler: 'real-estate-webhook.ingestLead',
      config: { auth: false, policies: [], middlewares: [] },
    },
    {
      method: 'PUT',
      path: '/re-webhooks/leads/:id/enrich',
      handler: 'real-estate-webhook.enrichLead',
      config: { auth: false, policies: [], middlewares: [] },
    },
  ],
};
