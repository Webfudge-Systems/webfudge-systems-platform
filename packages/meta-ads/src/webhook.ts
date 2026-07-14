/**
 * Meta webhook helpers: GET verification challenge + X-Hub-Signature-256
 * (HMAC SHA-256) validation for POST payloads. Uses Web Crypto so it works
 * in Node and edge runtimes alike.
 */

export interface WebhookVerification {
  ok: boolean
  /** Echo this back with HTTP 200 when ok. */
  challenge?: string
}

/** GET verification: echo hub.challenge when hub.verify_token matches. */
export function verifyWebhookChallenge(
  query: { 'hub.mode'?: string | null; 'hub.verify_token'?: string | null; 'hub.challenge'?: string | null },
  expectedVerifyToken: string
): WebhookVerification {
  if (
    query['hub.mode'] === 'subscribe' &&
    !!expectedVerifyToken &&
    query['hub.verify_token'] === expectedVerifyToken &&
    typeof query['hub.challenge'] === 'string'
  ) {
    return { ok: true, challenge: query['hub.challenge'] }
  }
  return { ok: false }
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await globalThis.crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payload))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

/** Constant-time string comparison to avoid timing side channels. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/**
 * Validate X-Hub-Signature-256 against the RAW request body string.
 * MANDATORY on every webhook POST — never trust an unverified payload.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null | undefined,
  appSecret: string
): Promise<boolean> {
  if (!signatureHeader || !appSecret) return false
  const expectedPrefix = 'sha256='
  if (!signatureHeader.startsWith(expectedPrefix)) return false
  const provided = signatureHeader.slice(expectedPrefix.length).toLowerCase()
  const computed = await hmacSha256Hex(appSecret, rawBody)
  return timingSafeEqual(provided, computed)
}

/** One leadgen change extracted from a webhook payload. */
export interface LeadgenEvent {
  leadgenId: string
  formId?: string
  pageId?: string
  adId?: string
  createdTime?: number
}

/** Extract all leadgen events from a Meta webhook POST body (already parsed). */
export function extractLeadgenEvents(payload: unknown): LeadgenEvent[] {
  const events: LeadgenEvent[] = []
  const body = payload as {
    object?: string
    entry?: Array<{
      changes?: Array<{
        field?: string
        value?: {
          leadgen_id?: string | number
          form_id?: string | number
          page_id?: string | number
          ad_id?: string | number
          created_time?: number
        }
      }>
    }>
  }
  if (!body || body.object !== 'page' || !Array.isArray(body.entry)) return events

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      if (change.field !== 'leadgen' || !change.value?.leadgen_id) continue
      events.push({
        leadgenId: String(change.value.leadgen_id),
        formId: change.value.form_id != null ? String(change.value.form_id) : undefined,
        pageId: change.value.page_id != null ? String(change.value.page_id) : undefined,
        adId: change.value.ad_id != null ? String(change.value.ad_id) : undefined,
        createdTime: change.value.created_time,
      })
    }
  }
  return events
}
