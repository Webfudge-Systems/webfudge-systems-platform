'use strict';

const { createMetaClient, DEFAULT_GRAPH_VERSION, DEFAULT_BASE_URL, LEAD_FIELDS } = require('./client');
const { DEFAULT_SCOPES, signState, verifyState, getOAuthUrl, exchangeCodeForToken } = require('./oauth');
const { verifyWebhookChallenge, verifyWebhookSignature, extractLeadgenEvents } = require('./webhook');
const fieldMapping = require('./fieldMapping');
const { sha256Hex, appSecretProof } = require('./hash');
const { MetaApiError } = require('./errors');

module.exports = {
  createMetaClient,
  DEFAULT_GRAPH_VERSION,
  DEFAULT_BASE_URL,
  LEAD_FIELDS,
  DEFAULT_SCOPES,
  signState,
  verifyState,
  getOAuthUrl,
  exchangeCodeForToken,
  verifyWebhookChallenge,
  verifyWebhookSignature,
  extractLeadgenEvents,
  ...fieldMapping,
  sha256Hex,
  appSecretProof,
  MetaApiError,
};
