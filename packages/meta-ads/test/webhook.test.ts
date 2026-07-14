import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import {
  extractLeadgenEvents,
  verifyWebhookChallenge,
  verifyWebhookSignature,
} from '../src'

const APP_SECRET = 'test-app-secret'

function sign(body: string, secret = APP_SECRET): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex')
}

describe('verifyWebhookChallenge', () => {
  it('echoes the challenge when mode and verify token match', () => {
    const result = verifyWebhookChallenge(
      { 'hub.mode': 'subscribe', 'hub.verify_token': 'my-token', 'hub.challenge': '12345' },
      'my-token'
    )
    expect(result).toEqual({ ok: true, challenge: '12345' })
  })

  it('rejects a wrong verify token', () => {
    const result = verifyWebhookChallenge(
      { 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong', 'hub.challenge': '12345' },
      'my-token'
    )
    expect(result.ok).toBe(false)
  })

  it('rejects when the expected token is empty (misconfiguration is not open access)', () => {
    const result = verifyWebhookChallenge(
      { 'hub.mode': 'subscribe', 'hub.verify_token': '', 'hub.challenge': '12345' },
      ''
    )
    expect(result.ok).toBe(false)
  })
})

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ object: 'page', entry: [] })

  it('accepts a valid HMAC SHA-256 signature', async () => {
    expect(await verifyWebhookSignature(body, sign(body), APP_SECRET)).toBe(true)
  })

  it('rejects a signature made with the wrong secret', async () => {
    expect(await verifyWebhookSignature(body, sign(body, 'other-secret'), APP_SECRET)).toBe(false)
  })

  it('rejects a tampered body', async () => {
    const signature = sign(body)
    const tampered = body.replace('page', 'evil')
    expect(await verifyWebhookSignature(tampered, signature, APP_SECRET)).toBe(false)
  })

  it('rejects missing header, wrong prefix, and empty secret', async () => {
    expect(await verifyWebhookSignature(body, null, APP_SECRET)).toBe(false)
    expect(await verifyWebhookSignature(body, 'sha1=abc', APP_SECRET)).toBe(false)
    expect(await verifyWebhookSignature(body, sign(body), '')).toBe(false)
  })
})

describe('extractLeadgenEvents', () => {
  it('extracts leadgen ids from a standard payload', () => {
    const events = extractLeadgenEvents({
      object: 'page',
      entry: [
        {
          id: '111',
          changes: [
            {
              field: 'leadgen',
              value: {
                leadgen_id: 999888777,
                form_id: 222,
                page_id: 111,
                ad_id: 333,
                created_time: 1752300000,
              },
            },
            { field: 'feed', value: {} },
          ],
        },
      ],
    })
    expect(events).toHaveLength(1)
    expect(events[0]).toEqual({
      leadgenId: '999888777',
      formId: '222',
      pageId: '111',
      adId: '333',
      createdTime: 1752300000,
    })
  })

  it('returns empty for non-page objects and malformed payloads', () => {
    expect(extractLeadgenEvents({ object: 'user', entry: [] })).toEqual([])
    expect(extractLeadgenEvents(null)).toEqual([])
    expect(extractLeadgenEvents({})).toEqual([])
    expect(extractLeadgenEvents({ object: 'page', entry: [{ changes: [{ field: 'leadgen' }] }] })).toEqual([])
  })
})
