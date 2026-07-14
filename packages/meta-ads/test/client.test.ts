import { describe, expect, it, vi } from 'vitest'
import { createMetaClient, MetaApiError } from '../src'

function mockFetch(responses: Array<{ status?: number; body: unknown }>) {
  const calls: Array<{ url: string; init?: RequestInit }> = []
  let i = 0
  const fetchImpl = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init })
    const next = responses[Math.min(i++, responses.length - 1)]!
    return new Response(JSON.stringify(next.body), {
      status: next.status ?? 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as unknown as typeof fetch
  return { fetchImpl, calls }
}

describe('createMetaClient', () => {
  it('requires an access token', () => {
    expect(() => createMetaClient('')).toThrow()
  })

  it('fetches a lead with field_data', async () => {
    const { fetchImpl, calls } = mockFetch([
      {
        body: {
          id: '123',
          campaign_id: 'c1',
          field_data: [{ name: 'email', values: ['a@b.com'] }],
        },
      },
    ])
    const client = createMetaClient('tok', { fetchImpl })
    const lead = await client.fetchLeadById('123')
    expect(lead.id).toBe('123')
    expect(lead.field_data).toHaveLength(1)
    expect(calls[0]!.url).toContain('/123')
    expect(calls[0]!.url).toContain('field_data')
  })

  it('throws MetaApiError with Graph error details on failure', async () => {
    const { fetchImpl } = mockFetch([
      {
        status: 400,
        body: { error: { message: 'Unsupported get request', type: 'GraphMethodException', code: 100, fbtrace_id: 'tr1' } },
      },
    ])
    const client = createMetaClient('tok', { fetchImpl })
    await expect(client.fetchLeadById('nope')).rejects.toMatchObject({
      name: 'MetaApiError',
      status: 400,
      code: 100,
      fbtraceId: 'tr1',
    })
  })

  it('computes cost per lead from insights actions', async () => {
    const { fetchImpl } = mockFetch([
      {
        body: {
          data: [
            {
              spend: '1500.50',
              impressions: '100000',
              clicks: '2400',
              actions: [
                { action_type: 'lead', value: '30' },
                { action_type: 'link_click', value: '2400' },
              ],
            },
          ],
        },
      },
    ])
    const client = createMetaClient('tok', { fetchImpl })
    const insights = await client.fetchCampaignInsights('c1')
    expect(insights.spend).toBe(1500.5)
    expect(insights.leads).toBe(30)
    expect(insights.costPerLead).toBeCloseTo(50.0167, 3)
  })

  it('returns null cost per lead when there are no leads', async () => {
    const { fetchImpl } = mockFetch([{ body: { data: [{ spend: '100', actions: [] }] } }])
    const client = createMetaClient('tok', { fetchImpl })
    const insights = await client.fetchCampaignInsights('c1')
    expect(insights.leads).toBe(0)
    expect(insights.costPerLead).toBeNull()
  })

  it('prefixes ad account ids with act_ when listing campaigns', async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { data: [{ id: 'c1', name: 'Launch' }] } }])
    const client = createMetaClient('tok', { fetchImpl })
    const campaigns = await client.listCampaigns('1234567890')
    expect(campaigns).toHaveLength(1)
    expect(calls[0]!.url).toContain('act_1234567890/campaigns')
  })

  it('hashes email and phone before sending a CAPI conversion event (no raw PII on the wire)', async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { events_received: 1, fbtrace_id: 'tr2' } }])
    const client = createMetaClient('tok', { fetchImpl })
    const result = await client.sendConversionEvent({
      pixelId: 'px1',
      leadgenId: 'lg1',
      email: 'Asha@Example.com ',
      phone: '+91 98765-43210',
      score: 82,
      tier: 'hot',
    })
    expect(result.eventsReceived).toBe(1)

    const sentBody = String(calls[0]!.init?.body)
    expect(sentBody).not.toContain('Asha')
    expect(sentBody).not.toContain('asha@example.com')
    expect(sentBody).not.toContain('98765')
    const parsed = JSON.parse(sentBody)
    const userData = parsed.data[0].user_data
    expect(userData.em[0]).toMatch(/^[0-9a-f]{64}$/)
    expect(userData.ph[0]).toMatch(/^[0-9a-f]{64}$/)
    expect(userData.lead_id).toBe('lg1')
    expect(parsed.data[0].custom_data).toEqual({ lead_score: 82, lead_tier: 'hot' })
    expect(parsed.data[0].event_id).toBe('lg1')
  })
})

describe('MetaApiError', () => {
  it('is an Error with structured fields', () => {
    const err = new MetaApiError('boom', { status: 500, code: 1 })
    expect(err).toBeInstanceOf(Error)
    expect(err.status).toBe(500)
  })
})
