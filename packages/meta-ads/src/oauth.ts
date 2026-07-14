import { DEFAULT_GRAPH_VERSION } from './client'
import { MetaApiError, type TokenExchangeResult } from './types'

export interface OAuthUrlOptions {
  appId: string
  graphVersion?: string
  /** Extra scopes on top of the lead-ads defaults. */
  scopes?: string[]
}

const DEFAULT_SCOPES = [
  'ads_management',
  'ads_read',
  'leads_retrieval',
  'pages_show_list',
  'pages_manage_metadata',
]

/**
 * Build the Facebook Login dialog URL for connecting a client's ad account.
 * `orgId` is carried in `state` so the callback can map the grant back to
 * the right tenant. Callers should also sign/verify state server-side.
 */
export function getOAuthUrl(orgId: string, redirectUri: string, options: OAuthUrlOptions): string {
  if (!options?.appId) throw new Error('getOAuthUrl: appId is required')
  const version = options.graphVersion || DEFAULT_GRAPH_VERSION
  const url = new URL(`https://www.facebook.com/${version}/dialog/oauth`)
  url.searchParams.set('client_id', options.appId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('state', orgId)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', (options.scopes || DEFAULT_SCOPES).join(','))
  return url.toString()
}

export interface TokenExchangeOptions {
  appId: string
  appSecret: string
  redirectUri: string
  graphVersion?: string
  fetchImpl?: typeof fetch
  baseUrl?: string
}

interface TokenResponse {
  access_token?: string
  token_type?: string
  expires_in?: number
  error?: { message?: string; type?: string; code?: number; fbtrace_id?: string }
}

async function tokenRequest(
  url: URL,
  fetchImpl: typeof fetch
): Promise<TokenExchangeResult> {
  const response = await fetchImpl(url.toString())
  const json = (await response.json().catch(() => ({}))) as TokenResponse
  if (!response.ok || json.error || !json.access_token) {
    const err = json.error || {}
    throw new MetaApiError(err.message || `Token exchange failed (HTTP ${response.status})`, {
      status: response.status,
      type: err.type,
      code: err.code,
      fbtraceId: err.fbtrace_id,
    })
  }
  return {
    accessToken: json.access_token,
    tokenType: json.token_type || 'bearer',
    expiresIn: json.expires_in,
  }
}

/**
 * Exchange an OAuth code for a short-lived token, then immediately upgrade
 * it to a long-lived (~60 day) user token. Returns only the long-lived token.
 * The result must be stored encrypted — never log it.
 */
export async function exchangeCodeForToken(
  code: string,
  options: TokenExchangeOptions
): Promise<TokenExchangeResult> {
  if (!code) throw new Error('exchangeCodeForToken: code is required')
  const version = options.graphVersion || DEFAULT_GRAPH_VERSION
  const baseUrl = (options.baseUrl || 'https://graph.facebook.com').replace(/\/$/, '')
  const fetchImpl = options.fetchImpl || fetch

  const shortLivedUrl = new URL(`${baseUrl}/${version}/oauth/access_token`)
  shortLivedUrl.searchParams.set('client_id', options.appId)
  shortLivedUrl.searchParams.set('client_secret', options.appSecret)
  shortLivedUrl.searchParams.set('redirect_uri', options.redirectUri)
  shortLivedUrl.searchParams.set('code', code)
  const shortLived = await tokenRequest(shortLivedUrl, fetchImpl)

  const longLivedUrl = new URL(`${baseUrl}/${version}/oauth/access_token`)
  longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
  longLivedUrl.searchParams.set('client_id', options.appId)
  longLivedUrl.searchParams.set('client_secret', options.appSecret)
  longLivedUrl.searchParams.set('fb_exchange_token', shortLived.accessToken)
  return tokenRequest(longLivedUrl, fetchImpl)
}
