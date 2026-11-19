'use strict';

const crypto = require('node:crypto');
const { MetaApiError } = require('./errors');
const { DEFAULT_GRAPH_VERSION, DEFAULT_BASE_URL } = require('./client');
const { hmacSha256Hex, timingSafeEqualHex } = require('./hash');

/** Permissions Lead Ads capture needs (Page list, webhook subscription, lead retrieval, ad names). */
const DEFAULT_SCOPES = [
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_ads',
  'leads_retrieval',
  'ads_read',
  'business_management',
];

const b64url = (buf) => Buffer.from(buf).toString('base64url');

/**
 * Signed, expiring OAuth `state` so the callback can trust which org/user started the connect.
 * payload: any JSON-safe object (e.g. { orgId, userId }).
 */
function signState(payload, secret, ttlSeconds = 600) {
  if (!secret) throw new Error('signState: secret is required');
  const body = b64url(JSON.stringify({ ...payload, n: crypto.randomBytes(8).toString('hex'), exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${body}.${hmacSha256Hex(secret, body)}`;
}

/** Returns the payload, or null when the signature is wrong or the state has expired. */
function verifyState(state, secret) {
  if (!state || !secret || typeof state !== 'string') return null;
  const [body, sig] = state.split('.');
  if (!body || !sig || !timingSafeEqualHex(sig, hmacSha256Hex(secret, body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (_) {
    return null;
  }
}

/** Facebook Login dialog URL. `state` should come from signState(). */
function getOAuthUrl(state, redirectUri, options = {}) {
  if (!options.appId) throw new Error('getOAuthUrl: appId is required');
  if (!state) throw new Error('getOAuthUrl: state is required');
  const version = options.graphVersion || DEFAULT_GRAPH_VERSION;
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  url.searchParams.set('client_id', options.appId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', (options.scopes || DEFAULT_SCOPES).join(','));
  return url.toString();
}

async function tokenRequest(url, fetchImpl) {
  const response = await fetchImpl(url.toString());
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error || !json.access_token) {
    const err = json.error || {};
    throw new MetaApiError(err.message || `Token exchange failed (HTTP ${response.status})`, {
      status: response.status,
      type: err.type,
      code: err.code,
      fbtraceId: err.fbtrace_id,
    });
  }
  return { accessToken: json.access_token, tokenType: json.token_type || 'bearer', expiresIn: json.expires_in };
}

/**
 * Exchange the OAuth code for a short-lived user token, then upgrade it to a long-lived (~60 day)
 * one. Only the long-lived token is returned. Store it encrypted, never log it.
 * Page tokens fetched with a long-lived user token do not expire.
 */
async function exchangeCodeForToken(code, options) {
  if (!code) throw new Error('exchangeCodeForToken: code is required');
  const version = options.graphVersion || DEFAULT_GRAPH_VERSION;
  const baseUrl = String(options.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, '');
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  const shortUrl = new URL(`${baseUrl}/${version}/oauth/access_token`);
  shortUrl.searchParams.set('client_id', options.appId);
  shortUrl.searchParams.set('client_secret', options.appSecret);
  shortUrl.searchParams.set('redirect_uri', options.redirectUri);
  shortUrl.searchParams.set('code', code);
  const shortLived = await tokenRequest(shortUrl, fetchImpl);

  const longUrl = new URL(`${baseUrl}/${version}/oauth/access_token`);
  longUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longUrl.searchParams.set('client_id', options.appId);
  longUrl.searchParams.set('client_secret', options.appSecret);
  longUrl.searchParams.set('fb_exchange_token', shortLived.accessToken);
  return tokenRequest(longUrl, fetchImpl);
}

module.exports = { DEFAULT_SCOPES, signState, verifyState, getOAuthUrl, exchangeCodeForToken };
