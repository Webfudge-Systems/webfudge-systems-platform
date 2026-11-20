'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { createMetaClient, MetaApiError, appSecretProof } = require('../src');

function mockFetch(responses) {
  const calls = [];
  let i = 0;
  const fetchImpl = async (url, init) => {
    calls.push({ url: String(url), init });
    const next = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(next.body), { status: next.status || 200, headers: { 'Content-Type': 'application/json' } });
  };
  return { fetchImpl, calls };
}

describe('createMetaClient', () => {
  it('requires an access token', () => {
    assert.throws(() => createMetaClient(''));
  });

  it('fetches a lead with field_data and campaign/ad names', async () => {
    const { fetchImpl, calls } = mockFetch([
      { body: { id: '123', campaign_id: 'c1', campaign_name: 'Diwali', field_data: [{ name: 'email', values: ['a@b.com'] }] } },
    ]);
    const lead = await createMetaClient('tok', { fetchImpl }).fetchLeadById('123');
    assert.equal(lead.id, '123');
    assert.equal(lead.field_data.length, 1);
    assert.match(calls[0].url, /\/v25\.0\/123\?/);
    assert.match(calls[0].url, /field_data/);
    assert.match(calls[0].url, /campaign_name/);
  });

  it('adds appsecret_proof when an app secret is given', async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { id: '1', field_data: [] } }]);
    await createMetaClient('tok', { fetchImpl, appSecret: 'shh' }).fetchLeadById('1');
    const url = new URL(calls[0].url);
    assert.equal(url.searchParams.get('appsecret_proof'), appSecretProof('tok', 'shh'));
  });

  it('throws MetaApiError with Graph error details on failure', async () => {
    const { fetchImpl } = mockFetch([
      { status: 400, body: { error: { message: 'Unsupported get request', type: 'GraphMethodException', code: 100, fbtrace_id: 'tr1' } } },
    ]);
    await assert.rejects(createMetaClient('tok', { fetchImpl }).fetchLeadById('nope'), (err) => {
      assert.ok(err instanceof MetaApiError);
      assert.equal(err.status, 400);
      assert.equal(err.code, 100);
      assert.equal(err.fbtraceId, 'tr1');
      assert.equal(err.isAuthError, false);
      return true;
    });
  });

  it('flags expired tokens as auth errors', () => {
    assert.equal(new MetaApiError('expired', { status: 400, code: 190 }).isAuthError, true);
  });

  it('follows paging.next without leaking the token twice', async () => {
    const { fetchImpl, calls } = mockFetch([
      { body: { data: [{ id: 'p1' }], paging: { next: 'https://graph.facebook.com/v25.0/me/accounts?after=X&access_token=tok' } } },
      { body: { data: [{ id: 'p2' }] } },
    ]);
    const pages = await createMetaClient('tok', { fetchImpl }).listPages();
    assert.deepEqual(pages.map((p) => p.id), ['p1', 'p2']);
    assert.equal(new URL(calls[1].url).searchParams.getAll('access_token').length, 1);
    assert.equal(new URL(calls[1].url).searchParams.get('after'), 'X');
  });

  it('filters form leads by time for backfill', async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { data: [{ id: 'l1', field_data: [] }] } }]);
    const leads = await createMetaClient('tok', { fetchImpl }).listFormLeads('f1', { since: 1752300000 });
    assert.equal(leads.length, 1);
    const filtering = JSON.parse(new URL(calls[0].url).searchParams.get('filtering'));
    assert.deepEqual(filtering, [{ field: 'time_created', operator: 'GREATER_THAN', value: 1752300000 }]);
  });

  it('subscribes a page to leadgen webhooks with POST', async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { success: true } }]);
    assert.equal(await createMetaClient('ptok', { fetchImpl }).subscribePage('111'), true);
    assert.equal(calls[0].init.method, 'POST');
    assert.match(calls[0].url, /111\/subscribed_apps\?subscribed_fields=leadgen/);
  });

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
    ]);
    const insights = await createMetaClient('tok', { fetchImpl }).fetchCampaignInsights('c1');
    assert.equal(insights.spend, 1500.5);
    assert.equal(insights.leads, 30);
    assert.ok(Math.abs(insights.costPerLead - 50.0167) < 0.001);
  });

  it('returns null cost per lead when there are no leads', async () => {
    const { fetchImpl } = mockFetch([{ body: { data: [{ spend: '100', actions: [] }] } }]);
    const insights = await createMetaClient('tok', { fetchImpl }).fetchCampaignInsights('c1');
    assert.equal(insights.leads, 0);
    assert.equal(insights.costPerLead, null);
  });

  it('prefixes ad account ids with act_ when listing campaigns', async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { data: [{ id: 'c1', name: 'Launch' }] } }]);
    const campaigns = await createMetaClient('tok', { fetchImpl }).listCampaigns('1234567890');
    assert.equal(campaigns.length, 1);
    assert.match(calls[0].url, /act_1234567890\/campaigns/);
  });

  it('hashes email and phone before sending a CAPI event (no raw PII on the wire)', async () => {
    const { fetchImpl, calls } = mockFetch([{ body: { events_received: 1, fbtrace_id: 'tr2' } }]);
    const result = await createMetaClient('tok', { fetchImpl }).sendConversionEvent({
      pixelId: 'px1',
      leadgenId: 'lg1',
      email: 'Asha@Example.com ',
      phone: '+91 98765-43210',
      customData: { lead_status: 'QUALIFIED' },
    });
    assert.equal(result.eventsReceived, 1);
    const sentBody = String(calls[0].init.body);
    assert.ok(!sentBody.includes('Asha'));
    assert.ok(!sentBody.includes('asha@example.com'));
    assert.ok(!sentBody.includes('98765'));
    const parsed = JSON.parse(sentBody);
    const userData = parsed.data[0].user_data;
    assert.match(userData.em[0], /^[0-9a-f]{64}$/);
    assert.match(userData.ph[0], /^[0-9a-f]{64}$/);
    assert.equal(userData.lead_id, 'lg1');
    assert.deepEqual(parsed.data[0].custom_data, { lead_status: 'QUALIFIED' });
    assert.equal(parsed.data[0].event_id, 'lg1');
  });
});

describe('MetaApiError', () => {
  it('is an Error with structured fields', () => {
    const err = new MetaApiError('boom', { status: 500, code: 1 });
    assert.ok(err instanceof Error);
    assert.equal(err.status, 500);
  });
});
